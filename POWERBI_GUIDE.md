# Power BI Configuration for FinanseHub (Norwegian Data)

This guide explains how to configure Power BI to connect to your FinanseHub data with Norwegian naming conventions.

## Prerequisites

- Azure Function App deployed with FinanseHub
- PostgreSQL database with Norwegian views created
- Power BI Desktop or Power BI Service access
- Azure Key Vault configured with Power BI credentials

## Norwegian Database Views Available

Your FinanseHub deployment includes these Norwegian-friendly views:

| View Name | Description | Norwegian Name |
|-----------|-------------|----------------|
| `Valutakurser` | Currency exchange rates | Valutakurser |
| `Renter` | Interest rates | Renter |
| `SisteKurser` | Latest currency rates | Siste valutakurser |
| `SisteRenter` | Latest interest rates | Siste rentesatser |
| `DataSammendrag` | Data summary | Datasammendrag |

## Norwegian Column Names

### Valutakurser (Currency Rates)
- `valuta_kode` - Currency code (e.g., USD, EUR)
- `valuta_navn` - Currency name in Norwegian
- `kurs_verdi` - Exchange rate value
- `kurs_dato` - Rate date
- `opprettet_dato` - Created date
- `oppdatert_dato` - Updated date

### Renter (Interest Rates)
- `serie_id` - Series ID
- `serie_navn` - Series name in Norwegian
- `rente_verdi` - Interest rate value
- `rente_dato` - Rate date
- `opprettet_dato` - Created date
- `oppdatert_dato` - Updated date

## Power BI Connection Setup

### Option 1: Direct Database Connection

1. **Open Power BI Desktop**
2. **Get Data** → **PostgreSQL database**
3. **Server**: Your PostgreSQL server URL
4. **Database**: Your database name
5. **Data Connectivity mode**: Import or DirectQuery

### Option 2: REST API Connection (Recommended)

1. **Get Data** → **Web**
2. **URL**: `https://your-function-app.azurewebsites.net/api/data/summary`
3. **Authentication**: Anonymous (for public endpoints)

## Creating Norwegian Dashboards

### 1. Currency Dashboard (Valutakurser)

```dax
// Latest EUR/NOK Rate
LatestEUR = 
CALCULATE(
    MAX(Valutakurser[kurs_verdi]),
    Valutakurser[valuta_kode] = "EUR",
    Valutakurser[kurs_dato] = MAX(Valutakurser[kurs_dato])
)

// Latest USD/NOK Rate
LatestUSD = 
CALCULATE(
    MAX(Valutakurser[kurs_verdi]),
    Valutakurser[valuta_kode] = "USD",
    Valutakurser[kurs_dato] = MAX(Valutakurser[kurs_dato])
)
```

### 2. Interest Rates Dashboard (Renter)

```dax
// Latest Policy Rate
LatestPolicyRate = 
CALCULATE(
    MAX(Renter[rente_verdi]),
    Renter[serie_id] = "POLICY_RATE",
    Renter[rente_dato] = MAX(Renter[rente_dato])
)
```

### 3. Visualizations

#### Currency Trend Chart
- **Chart Type**: Line Chart
- **X-Axis**: `kurs_dato` (Date)
- **Y-Axis**: `kurs_verdi` (Rate Value)
- **Legend**: `valuta_navn` (Currency Name in Norwegian)
- **Filter**: Last 30 days

#### Interest Rate Gauge
- **Chart Type**: Gauge
- **Value**: Latest Policy Rate
- **Target**: 3% (or your target rate)
- **Title**: "Styringsrente" (Policy Rate)

#### Currency Cards
- **Chart Type**: Card
- **Value**: Latest currency rates
- **Title**: Currency name in Norwegian

## Data Refresh Configuration

### Automatic Refresh via Power BI Service

1. **Publish** your report to Power BI Service
2. **Configure data source credentials**:
   - Database: Use your PostgreSQL credentials
   - API: No authentication needed for public endpoints

3. **Set refresh schedule**:
   - Go to dataset settings
   - Configure refresh schedule (e.g., daily at 9 AM)
   - Enable failure notifications

### Manual Refresh via API

```powershell
# PowerShell script to refresh Power BI dataset
$workspaceId = "your-workspace-id"
$datasetId = "your-dataset-id"

Invoke-RestMethod -Uri "https://api.powerbi.com/v1.0/myorg/groups/$workspaceId/datasets/$datasetId/refreshes" -Method Post -Headers @{Authorization = "Bearer $accessToken"}
```

## Norwegian Translation Mapping

The system automatically translates currency codes to Norwegian names:

| Code | Norwegian Name |
|------|----------------|
| USD | Amerikanske dollar |
| EUR | Euro |
| GBP | Britiske pund |
| SEK | Svenske kroner |
| DKK | Danske kroner |
| JPY | Japanske yen |
| ISK | Islandske kroner |
| AUD | Australske dollar |
| NZD | New Zealand-dollar |
| IDR | Indonesiske rupiah |
| CLP | Chilenske peso |

## Sample Power BI Measures

```dax
// Currency change percentage
CurrencyChange% = 
VAR CurrentRate = [LatestEUR]
VAR PreviousRate = 
    CALCULATE(
        MAX(Valutakurser[kurs_verdi]),
        Valutakurser[valuta_kode] = "EUR",
        Valutakurser[kurs_dato] = MAX(Valutakurser[kurs_dato]) - 1
    )
RETURN
DIVIDE(CurrentRate - PreviousRate, PreviousRate, 0)

// Format: "Endring: +2.5%"
CurrencyChangeText = 
"Endring: " & 
IF([CurrencyChange%] >= 0, "+", "") & 
FORMAT([CurrencyChange%], "0.0%")
```

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Increase timeout in Power BI settings
   - Use DirectQuery for large datasets

2. **Authentication Errors**
   - Verify database credentials
   - Check Key Vault permissions

3. **Missing Data**
   - Verify Norwegian views are created
   - Check data sync status via `/api/monitoring`

### Monitoring Data Quality

Create alerts for:
- Missing daily currency updates
- Stale interest rate data
- API endpoint availability

## Performance Optimization

1. **Use DirectQuery** for real-time data
2. **Implement Row-Level Security** if needed
3. **Create aggregation tables** for historical analysis
4. **Optimize DAX measures** for better performance

## Integration with Azure Key Vault

Your Power BI credentials are securely stored in Azure Key Vault:

- **Client ID**: Stored as `powerbi-client-id`
- **Client Secret**: Stored as `powerbi-client-secret`
- **Tenant ID**: Stored as `powerbi-tenant-id`

The Function App uses managed identity to access these credentials securely.

## Next Steps

1. **Create your first dashboard** using the Valutakurser view
2. **Set up automated refresh** schedule
3. **Configure alerts** for significant currency changes
4. **Share dashboards** with stakeholders
5. **Monitor performance** and optimize as needed

Your Norwegian-friendly FinanseHub Power BI integration is now ready for use!
