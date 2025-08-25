# Power BI Integration Guide - Norwegian Financial Data

## Overview
This guide helps you integrate your existing Power BI workspace with the Norwegian financial data from our deployed Azure Function App.

## ✅ Current Setup Status

### Azure Infrastructure (Deployed)
- **Function App**: `func-vh-b76k2jz5hzgzi.azurewebsites.net`
- **Database**: `finansehub-db.postgres.database.azure.com`
- **Key Vault**: `kv-vh-b76k2jz5hzgzi`
- **Resource Group**: `rg-Valutahub`

### Power BI Configuration (Your Existing Setup)
- **Tenant ID**: `7797083b-78a3-41a0-8094-98bc772423be`
- **App Registration**: `037935b2-c963-40f9-872b-fc0ac0b5cd94`
- **Workspace ID**: `d5b50dd0-b27f-42f2-847d-2d02b5b969b8`
- **Dataset ID**: `6e9b5b70-11a5-4b4c-a62b-5f0dd6d4bc1a`

### Norwegian Data Views Available
1. **Valutakurser** - Currency rates with Norwegian names
2. **Renter** - Interest rates with Norwegian descriptions  
3. **SisteKurser** - Latest currency rates
4. **SisteRenter** - Latest interest rates
5. **DataSammendrag** - Data summary overview

## 🔗 API Endpoints for Power BI

### 1. Data Summary
```
GET https://func-vh-b76k2jz5hzgzi.azurewebsites.net/api/dataSummary
```
Returns overview with Norwegian labels:
- `totalt_valutakurser`: Total currency records
- `totalt_renter`: Total interest rate records  
- `siste_oppdatering`: Last update time
- `tilgjengelige_valutaer`: Available currencies
- `tilgjengelige_serier`: Available interest rate series

### 2. Norwegian Currency Data
```
GET https://func-vh-b76k2jz5hzgzi.azurewebsites.net/api/currencyData?norwegian=true&limit=100
```
Returns currency data with Norwegian columns:
- `dato`: Date
- `valuta_kode`: Currency code (USD, EUR, etc.)
- `valuta_navn`: Currency name in Norwegian
- `kurs`: Exchange rate
- `enhet`: Unit amount
- `opprettet`: Created timestamp

### 3. Norwegian Interest Rate Data
```
GET https://func-vh-b76k2jz5hzgzi.azurewebsites.net/api/seriesData?norwegian=true&series=STYRINGSRENTE
```
Returns interest rate data with Norwegian columns:
- `dato`: Date
- `serie_navn`: Series name
- `beskrivelse`: Norwegian description
- `verdi`: Rate value
- `opprettet`: Created timestamp

### 4. Latest Currency Rates
```
GET https://func-vh-b76k2jz5hzgzi.azurewebsites.net/api/currencyData?latest=true&norwegian=true
```

### 5. Latest Interest Rates
```
GET https://func-vh-b76k2jz5hzgzi.azurewebsites.net/api/seriesData?latest=true&norwegian=true
```

## 🚀 Quick Start Integration

### Option 1: Using the Integration Script
```bash
cd /Volumes/Lagring/Aquatiq/FinanseHub
npm install axios  # if not already installed
node scripts/powerbi-integration.js
```

To trigger a data refresh:
```bash
node scripts/powerbi-integration.js --refresh
```

### Option 2: Manual Power BI Service Setup

1. **Open Power BI Service**
   - Go to: https://app.powerbi.com/groups/d5b50dd0-b27f-42f2-847d-2d02b5b969b8

2. **Add Data Source**
   - Click "Get Data" → "Web"
   - Enter API endpoints (see above)
   - Configure authentication if needed

3. **Create Tables**
   - Map API responses to Power BI tables
   - Use Norwegian column names for better readability

## 📊 Recommended Power BI Dashboard Structure

### 1. Overview Dashboard (Oversikt)
- Total currency records (Totalt valutakurser)
- Total interest records (Totalt renter)  
- Last update time (Siste oppdatering)
- Available currencies (Tilgjengelige valutaer)

### 2. Currency Dashboard (Valutakurser)
- Line chart: Currency trends over time
- Table: Latest rates by currency
- Card visuals: USD/NOK, EUR/NOK current rates
- Filter: Select specific currencies

### 3. Interest Rate Dashboard (Renter)
- Line chart: Policy rate over time (Styringsrente)
- Gauge: Current policy rate
- Table: All interest rate series
- Historical comparison charts

### 4. Data Quality Dashboard (Datakvalitet)
- Data freshness indicators
- Record counts by source
- Missing data analysis
- Update frequency metrics

## 🔄 Data Refresh Configuration

### Automated Refresh Schedule
1. In Power BI Service, go to Dataset Settings
2. Configure refresh schedule:
   - **Frequency**: Daily
   - **Time**: 06:00 (after Norges Bank updates)
   - **Time Zone**: W. Europe Standard Time
   - **Days**: Monday-Friday

### Manual Refresh via API
```javascript
// Using the integration script
const integration = new PowerBIIntegration();
await integration.getAccessToken();
await integration.triggerRefresh();
```

## 🌍 Norwegian Terminology Guide

### Currency Terms (Valutatermer)
- `valuta_kode` = Currency Code
- `valuta_navn` = Currency Name  
- `kurs` = Exchange Rate
- `enhet` = Unit Amount
- `dato` = Date

### Interest Rate Terms (Rentetermer)
- `styringsrente` = Policy Rate
- `utlånsrente` = Lending Rate
- `innskuddsrente` = Deposit Rate
- `serie_navn` = Series Name
- `beskrivelse` = Description
- `verdi` = Value

### Time Terms (Tidstermer)
- `dato` = Date
- `opprettet` = Created
- `oppdatert` = Updated
- `siste_oppdatering` = Last Update

## 🔐 Security & Authentication

All Power BI credentials are securely stored in Azure Key Vault:
- ✅ Tenant ID stored
- ✅ Client ID stored  
- ✅ Client Secret stored
- ✅ Group ID stored
- ✅ Dataset ID stored

Function App is configured to use Key Vault references for secure access.

## 🧪 Testing & Validation

### Test API Endpoints
```bash
# Test data summary
curl "https://func-vh-b76k2jz5hzgzi.azurewebsites.net/api/dataSummary"

# Test Norwegian currency data
curl "https://func-vh-b76k2jz5hzgzi.azurewebsites.net/api/currencyData?norwegian=true&limit=5"

# Test latest rates
curl "https://func-vh-b76k2jz5hzgzi.azurewebsites.net/api/currencyData?latest=true&norwegian=true"
```

### Validate Power BI Connection
```bash
node scripts/powerbi-integration.js
```

## 📈 Sample Power BI DAX Formulas

### Latest USD Rate
```dax
Latest USD Rate = 
CALCULATE(
    MAX(Valutakurser[kurs]),
    Valutakurser[valuta_kode] = "USD",
    Valutakurser[dato] = MAX(Valutakurser[dato])
)
```

### Policy Rate Change
```dax
Policy Rate Change = 
VAR CurrentRate = 
    CALCULATE(
        MAX(Renter[verdi]),
        Renter[serie_navn] = "STYRINGSRENTE",
        Renter[dato] = MAX(Renter[dato])
    )
VAR PreviousRate = 
    CALCULATE(
        MAX(Renter[verdi]),
        Renter[serie_navn] = "STYRINGSRENTE",
        Renter[dato] = MAX(Renter[dato]) - 1
    )
RETURN CurrentRate - PreviousRate
```

### Data Freshness
```dax
Data Freshness = 
DATEDIFF(
    MAX(Valutakurser[opprettet]),
    TODAY(),
    DAY
) & " days old"
```

## 🎯 Next Steps

1. **Test Integration**: Run the integration script to verify connection
2. **Configure Data Source**: Set up API connections in Power BI Service  
3. **Create Reports**: Build dashboards using Norwegian terminology
4. **Set Refresh Schedule**: Configure automated data updates
5. **Share & Collaborate**: Distribute dashboards to your team

## 🆘 Troubleshooting

### Common Issues
- **Authentication Failed**: Check Key Vault credentials
- **API Not Responding**: Verify Function App is running
- **Data Not Updating**: Check refresh schedule configuration
- **Norwegian Characters**: Ensure UTF-8 encoding

### Support Resources
- API Monitor: https://func-vh-b76k2jz5hzgzi.azurewebsites.net/api/monitor
- Azure Portal: https://portal.azure.com
- Power BI Service: https://app.powerbi.com

---

**Ready to integrate Norwegian financial data with Power BI! 🇳🇴📊**
