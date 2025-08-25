# finanseHub - Deployment Guide

## Overview

finanseHub is a comprehensive backend system that fetches currency rates and interest data from Norges Bank, stores them in Azure PostgreSQL, and integrates with Power BI for automated dashboard refresh.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Timer Trigger │    │  Manual Sync    │    │   Norges Bank   │
│  (Cron: 17:30)  │    │   HTTP API      │    │      API        │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │     Azure Functions       │
                    │   (Node.js 20 / TS)      │
                    └─────────────┬─────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  PostgreSQL     │    │   Key Vault     │    │    Power BI     │
│ Flexible Server │    │   (Secrets)     │    │   (Refresh)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

1. **Azure CLI** installed and logged in
2. **Node.js 20** or higher
3. **Azure Functions Core Tools v4**
4. **Power BI** workspace and service principal
5. **Git** for version control

## Quick Start

### 1. Clone and Setup Local Environment

```bash
git clone <repository-url>
cd FinanseHub
./scripts/setup-local.sh
```

### 2. Deploy Azure Infrastructure

```bash
./scripts/deploy-azure.sh
```

This script will create:
- Resource Group (`rg-finansehub`)
- PostgreSQL Flexible Server (`finansehub-db`)
- Key Vault with RBAC (`kv-finansehub`)
- Function App (`finansehub-functions`)
- Application Insights (`ai-finansehub`)
- Storage Account for Function App

### 3. Configure Power BI Service Principal

1. **Create Azure AD App Registration**:
   ```bash
   az ad app create --display-name "finanseHub-PowerBI" --sign-in-audience AzureADMyOrg
   ```

2. **Enable Power BI APIs** in Power BI Admin Portal
3. **Add Service Principal** to your Power BI workspace as Member/Admin
4. **Store secrets** in Key Vault:
   ```bash
   az keyvault secret set --vault-name kv-finansehub --name "PBI-TENANT-ID" --value "your-tenant-id"
   az keyvault secret set --vault-name kv-finansehub --name "PBI-CLIENT-ID" --value "your-client-id"
   az keyvault secret set --vault-name kv-finansehub --name "PBI-CLIENT-SECRET" --value "your-client-secret"
   az keyvault secret set --vault-name kv-finansehub --name "PBI-GROUP-ID" --value "your-workspace-id"
   az keyvault secret set --vault-name kv-finansehub --name "PBI-DATASET-ID" --value "your-dataset-id"
   ```

### 4. Update Local Environment

Update `backend/.env` with the actual values from Azure deployment:

```env
DATABASE_URL="postgresql://username:password@finansehub-db.postgres.database.azure.com:5432/fx?sslmode=require"
CRON_KEY="your_actual_cron_key"
KEY_VAULT_URL="https://kv-finansehub.vault.azure.net/"
```

### 5. Initialize Database Schema

```bash
cd backend
npx prisma db push
```

### 6. Deploy Function Code

```bash
cd backend
npm run build
func azure functionapp publish finansehub-functions
```

## Database Schema

The system uses two main tables:

### Rate (Currency Exchange Rates)
- `id`: Primary key
- `date`: Date of the rate
- `base`: Base currency (e.g., USD)
- `quote`: Quote currency (e.g., NOK)
- `value`: Exchange rate value
- `src`: Source (always 'NB' for Norges Bank)

### SeriesPoint (Interest Rates & Economic Data)
- `id`: Primary key  
- `date`: Date of the data point
- `series`: Series identifier (e.g., POLICY_RATE)
- `label`: Optional label/tenor
- `value`: Rate value
- `src`: Source (always 'NB' for Norges Bank)

## API Endpoints

### Timer Trigger
- **Schedule**: `"0 30 17 * * 1-5"` (17:30 on weekdays)
- **Function**: Automatic synchronization of all data

### Manual Sync
- **URL**: `POST /api/manualSync`
- **Headers**: `x-cron-key: your-cron-key`
- **Purpose**: Manual trigger for testing and ad-hoc syncs

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Key Vault reference |
| `CRON_KEY` | Security key for manual sync | Key Vault reference |
| `NB_BASES` | Comma-separated currency codes | `USD,EUR,GBP,SEK,DKK` |
| `NB_QUOTE` | Quote currency | `NOK` |
| `NB_DEFAULT_START` | Default start date for initial sync | `2023-01-01` |
| `SYNC_MAX_ATTEMPTS` | Maximum retry attempts | `4` |
| `PBI_*` | Power BI configuration | Key Vault references |

### Key Vault Secrets

| Secret | Purpose |
|--------|---------|
| `DATABASE-URL` | PostgreSQL connection string |
| `CRON-KEY` | Manual sync authentication |
| `PBI-TENANT-ID` | Power BI tenant ID |
| `PBI-CLIENT-ID` | Service principal client ID |
| `PBI-CLIENT-SECRET` | Service principal secret |
| `PBI-GROUP-ID` | Power BI workspace ID |
| `PBI-DATASET-ID` | Power BI dataset ID |

## Data Flow

1. **Timer Trigger** runs at 17:30 on weekdays (after Norges Bank publishes data ~16:00)
2. **Sync Service** fetches latest data from Norges Bank API
3. **Database Service** stores new records (skips duplicates)
4. **Power BI Service** triggers dataset refresh
5. **Application Insights** logs all operations

## Monitoring & Troubleshooting

### Application Insights Queries

```kusto
// Failed function executions
traces
| where message contains "Error"
| order by timestamp desc

// Sync statistics
traces  
| where message contains "sync completed"
| order by timestamp desc
```

### Common Issues

1. **Database Connection**: Check firewall rules and connection string
2. **Key Vault Access**: Verify managed identity has correct permissions
3. **Power BI Refresh**: Ensure service principal has workspace access
4. **Norges Bank API**: Check for API changes or rate limits

### Local Development

```bash
cd backend
npm run start  # Start Functions locally
```

Access functions at `http://localhost:7071/api/`

## Security Best Practices

1. **Key Vault**: All sensitive data stored in Key Vault with RBAC
2. **Managed Identity**: Function App uses managed identity (no stored credentials)
3. **Database**: Read-only user for Power BI connections (recommended)
4. **CRON Key**: Required for manual sync endpoint
5. **Firewall**: Restrict database access to necessary IPs only

## Backup & Recovery

1. **Database**: Automated backups via Azure PostgreSQL Flexible Server
2. **Code**: Version controlled in Git
3. **Configuration**: Infrastructure as Code in deployment scripts

## Cost Optimization

- **Function App**: Consumption plan (pay-per-execution)
- **Database**: Burstable tier (B1ms) for development
- **Storage**: Standard LRS for function storage
- **Key Vault**: Standard tier

## Support

For issues or questions:
1. Check Application Insights logs
2. Review Azure Function logs in Azure Portal
3. Verify Power BI refresh history
4. Check database connectivity and data freshness
