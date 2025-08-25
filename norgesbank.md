# Norges Bank API Documentation

This document describes the implementation and usage of the Norges Bank API integration in ValutaHub. The application uses two complementary libraries to fetch data from Norges Bank's SDMX API.

## Overview

ValutaHub integrates with Norges Bank through two TypeScript libraries:

1. **`nb.ts`** - Currency exchange rates from the EXR dataset
2. **`nbFinancial.ts`** - Financial market data (interest rates, bonds, policy rates)

## Libraries

### 1. Currency Exchange Rates (`nb.ts`)

**Purpose**: Fetches currency exchange rates using Norges Bank's EXR (Exchange Rates) dataset.

**Key Functions**:
- `nbUrl(base, quote, start?, end?)` - Builds SDMX API URLs
- `fetchCsv(url)` - Fetches CSV data with retry logic
- `parseNbCsv(csv)` - Parses CSV data into structured format

**Usage Example**:
```typescript
import { nbUrl, fetchCsv, parseNbCsv } from './lib/nb'

// Get USD/NOK exchange rates for the last 30 days
const url = nbUrl('USD', 'NOK', '2024-01-01', '2024-01-31')
const csv = await fetchCsv(url)
const rates = parseNbCsv(csv)
```

**Error Handling**: Includes retry logic with exponential backoff and ValutaHub's error handling system.

### 2. Financial Data (`nbFinancial.ts`)

**Purpose**: Fetches comprehensive financial market data from multiple Norges Bank datasets.

**Available Functions**:

#### Policy Rate (Styringsrente)
```typescript
fetchPolicyRate({ startPeriod, endPeriod })
```
- Dataset: `IR` (Interest Rates)
- Returns: Policy rate values with dates

#### NOWA Rate
```typescript
fetchNowaRate({ startPeriod, endPeriod })
```
- Dataset: `SHORT_RATES`
- Returns: Norwegian Overnight Weighted Average rates

#### Government Bonds
```typescript
fetchGovBonds({ startPeriod, endPeriod, maturities })
```
- Dataset: `GOVT_GENERIC_RATES`
- Maturities: `['2Y', '3Y', '5Y', '10Y']`
- Returns: Government bond yields by maturity

#### Generic Rates
```typescript
fetchGenericRates({ startPeriod, endPeriod, maturities })
```
- Dataset: `GOVT_GENERIC_RATES`
- Maturities: `['3M', '12M', '7Y']`
- Returns: Generic interest rates by maturity

**Date Formatting**: Use `formatDateForSdmx(date)` to format dates for API calls.

## API Endpoints

The application exposes REST API endpoints that utilize these libraries:

### Currency Rates
- **GET** `/api/rates` - Get exchange rates (uses `nb.ts`)

### Financial Data
- **GET** `/api/policy-rate` - Policy rate data
- **GET** `/api/nowa` - NOWA rate data  
- **GET** `/api/gov-bonds` - Government bond yields
- **GET** `/api/generic-rates` - Generic interest rates

### Synchronization
- **POST** `/api/sync` - Trigger comprehensive data sync

## Data Synchronization

The `syncFinancial.ts` module orchestrates the synchronization of all financial data:

```typescript
import { syncAllFinancialData } from './lib/syncFinancial'

// Sync all financial data
const summary = await syncAllFinancialData({
  bases: ['USD', 'EUR', 'GBP'],
  quote: 'NOK',
  defaultStart: '2020-01-01'
})
```

**Sync Process**:
1. Currency exchange rates (via `syncCore`)
2. Policy rate data
3. NOWA rate data
4. Government bonds (3Y, 5Y, 10Y)
5. Generic rates (3M, 12M, 7Y)
6. Power BI refresh trigger
7. Teams notifications

## Configuration

### Environment Variables
```bash
NB_DEFAULT_START=2020-01-01  # Default start date for syncing
```

### Database Schema
The application uses Prisma with the following relevant models:
- `PolicyRate` - Policy rate records
- `NowaRate` - NOWA rate records
- `GovBondRate` - Government bond yields
- `GenericRate` - Generic interest rates

## Error Handling

Both libraries implement robust error handling:

1. **Retry Logic**: Automatic retries with exponential backoff
2. **Validation**: Data validation and parsing errors
3. **Logging**: Comprehensive error logging
4. **Notifications**: Teams notifications for sync failures

## SDMX API Details

### Base URL
```
https://data.norges-bank.no/api/data/
```

### Datasets Used
- **EXR**: Exchange rates
- **IR**: Interest rates (policy rate)
- **SHORT_RATES**: Short-term rates (NOWA)
- **GOVT_GENERIC_RATES**: Government and generic rates

### URL Structure
```
{base_url}{dataset}/{key}?startPeriod={start}&endPeriod={end}&format=csvfilewithlabels
```

### Example URLs
```bash
# USD/NOK exchange rate
https://data.norges-bank.no/api/data/EXR/B.USD.NOK.SP?startPeriod=2024-01-01&endPeriod=2024-01-31&format=csvfilewithlabels

# Policy rate
https://data.norges-bank.no/api/data/IR/B.CBPOL..?startPeriod=2024-01-01&endPeriod=2024-01-31&format=csvfilewithlabels

# Government bonds 10Y
https://data.norges-bank.no/api/data/GOVT_GENERIC_RATES/B.10Y.GOV_BOND..?startPeriod=2024-01-01&endPeriod=2024-01-31&format=csvfilewithlabels
```

## Best Practices

1. **Rate Limiting**: Implement appropriate delays between API calls
2. **Caching**: Use database storage to minimize API calls
3. **Incremental Sync**: Only fetch new data since last sync
4. **Error Recovery**: Implement retry logic for transient failures
5. **Monitoring**: Use Teams notifications for sync status
6. **Data Validation**: Validate all incoming data before storage

## Dependencies

- `csv-parse/sync` - CSV parsing for currency rates
- Custom error handling module
- Prisma ORM for database operations
- Teams integration for notifications
- Power BI integration for data refresh

## Usage in Production

The sync process is typically triggered via:
1. **Manual API call**: `POST /api/sync`
2. **Azure Function**: Timer-triggered sync (see `azure/functions/timer-sync/`)
3. **Cron job**: Scheduled execution

For production deployments, ensure:
- Proper error handling and logging
- Teams notifications configured
- Power BI refresh permissions set up
- Database backup and monitoring in place
