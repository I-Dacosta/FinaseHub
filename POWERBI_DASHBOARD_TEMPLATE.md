# Power BI Norwegian Financial Dashboard Template

## 🎯 Dashboard Overview
Now that your database is connected to Power BI, here's a complete template for creating Norwegian financial dashboards.

**Your Power BI Workspace**: [ValutaHub](https://app.powerbi.com/groups/0953a26c-9b44-4504-8ebe-c96b03d22923)
**Dataset**: [FinanseHub Currency & Interest Rates](https://app.powerbi.com/groups/0953a26c-9b44-4504-8ebe-c96b03d22923/datasets/175f3bf5-fbaf-4d2b-bec7-b1006db5da1f/details)

## 🏗️ Database Connection Completed ✅

### Connection Details
- **Server**: `psql-vh-b76k2jz5hzgzi.postgres.database.azure.com`
- **Database**: `fx`
- **Username**: `finansehub_admin`
- **Password**: `OAsd2amudO38Pn6k9kt7t0NmS`
- **SSL**: Required
- **Port**: 5432

### Norwegian Views Available
1. ✅ **valutakurser_norsk** - Currency rates with Norwegian names
2. ✅ **renter_norsk** - Interest rates with Norwegian descriptions  
3. ✅ **siste_kurser_norsk** - Latest currency rates
4. ✅ **siste_renter_norsk** - Latest interest rates
5. ✅ **data_sammendrag_norsk** - Data summary overview

## 📊 Power BI Report Templates

### 1. Valutaoversikt (Currency Overview) Page

#### Visual 1: Hovedvalutaer Linjediagram (Main Currencies Line Chart)
- **Visual Type**: Line Chart
- **X-Axis**: `dato` (Date)
- **Y-Axis**: `kurs` (Rate)
- **Legend**: `valuta_navn` (Currency Name)
- **Filter**: `valuta_kode` IN ('USD', 'EUR', 'GBP', 'SEK')
- **Title**: "Hovedvalutaer mot NOK"

#### Visual 2: Dagens Kurser (Today's Rates)
- **Visual Type**: Table
- **Columns**: 
  - `valuta_navn` (Currency Name)
  - `siste_kurs` (Latest Rate) 
  - `siste_dato` (Latest Date)
- **Data Source**: `siste_kurser_norsk`
- **Sort By**: `siste_kurs` Descending
- **Title**: "Dagens Valutakurser"

#### Visual 3: USD/NOK Kurskort (USD/NOK Rate Card)
- **Visual Type**: Card
- **Value**: `siste_kurs` WHERE `valuta_kode` = 'USD'
- **Title**: "USD/NOK"
- **Format**: 2 decimal places

#### Visual 4: EUR/NOK Kurskort (EUR/NOK Rate Card)
- **Visual Type**: Card  
- **Value**: `siste_kurs` WHERE `valuta_kode` = 'EUR'
- **Title**: "EUR/NOK"
- **Format**: 2 decimal places

### 2. Renteoversikt (Interest Rate Overview) Page

#### Visual 1: Styringsrente Utvikling (Policy Rate Development)
- **Visual Type**: Area Chart
- **X-Axis**: `dato` (Date)
- **Y-Axis**: `verdi` (Value)
- **Filter**: `serie_navn` = 'STYRINGSRENTE'
- **Data Source**: `renter_norsk`
- **Title**: "Styringsrente Utvikling"

#### Visual 2: Gjeldende Styringsrente (Current Policy Rate)
- **Visual Type**: Gauge
- **Value**: Latest `verdi` WHERE `serie_navn` = 'STYRINGSRENTE'
- **Min**: 0
- **Max**: 10
- **Target**: 4.5
- **Title**: "Gjeldende Styringsrente (%)"

#### Visual 3: Alle Renteserier (All Interest Rate Series)
- **Visual Type**: Matrix
- **Rows**: `beskrivelse` (Description)
- **Values**: Latest `verdi` (Value)
- **Data Source**: `siste_renter_norsk`
- **Title**: "Renteserier - Siste Verdier"

### 3. Datasammendrag (Data Summary) Page

#### Visual 1: Datastatistikk (Data Statistics)
- **Visual Type**: Multi-row Card
- **Cards**: 
  - Total Records: Count of `valutakurser_norsk`
  - Latest Update: MAX(`opprettet`)
  - Available Currencies: DISTINCTCOUNT(`valuta_kode`)
- **Title**: "Datasammendrag"

#### Visual 2: Dataoppdateringer (Data Updates)
- **Visual Type**: Column Chart
- **X-Axis**: `opprettet` (Date by Month)
- **Y-Axis**: Count of records
- **Title**: "Dataoppdateringer per Måned"

## 🎨 Power BI DAX Measures (Norwegian)

### Valuta Measures
```dax
// Siste USD Kurs
Siste USD Kurs = 
CALCULATE(
    FIRSTNONBLANK(siste_kurser_norsk[siste_kurs], 1),
    siste_kurser_norsk[valuta_kode] = "USD"
)

// Siste EUR Kurs  
Siste EUR Kurs = 
CALCULATE(
    FIRSTNONBLANK(siste_kurser_norsk[siste_kurs], 1),
    siste_kurser_norsk[valuta_kode] = "EUR"
)

// Kursendring USD (vs forrige dag)
USD Kursendring = 
VAR DagensKurs = [Siste USD Kurs]
VAR GårsdagensKurs = 
    CALCULATE(
        MAX(valutakurser_norsk[kurs]),
        valutakurser_norsk[valuta_kode] = "USD",
        valutakurser_norsk[dato] = MAX(valutakurser_norsk[dato]) - 1
    )
RETURN DagensKurs - GårsdagensKurs
```

### Rente Measures
```dax
// Gjeldende Styringsrente
Gjeldende Styringsrente = 
CALCULATE(
    MAX(renter_norsk[verdi]),
    renter_norsk[serie_navn] = "STYRINGSRENTE",
    renter_norsk[dato] = MAX(renter_norsk[dato])
)

// Renteendring siden forrige møte
Styringsrente Endring = 
VAR NåværendeRente = [Gjeldende Styringsrente]
VAR ForrigeRente = 
    CALCULATE(
        MAX(renter_norsk[verdi]),
        renter_norsk[serie_navn] = "STYRINGSRENTE",
        renter_norsk[dato] < MAX(renter_norsk[dato])
    )
RETURN NåværendeRente - ForrigeRente
```

### Data Quality Measures
```dax
// Data Aktualitet (dager siden siste oppdatering)
Data Aktualitet = 
DATEDIFF(
    MAX(valutakurser_norsk[opprettet]),
    TODAY(),
    DAY
) & " dager siden"

// Totalt Antall Valutakurser
Totalt Valutakurser = 
COUNTROWS(valutakurser_norsk)

// Tilgjengelige Valutaer
Tilgjengelige Valutaer = 
DISTINCTCOUNT(valutakurser_norsk[valuta_kode])
```

## 🔄 Data Refresh Setup

### Automatic Refresh in Power BI Service
1. Go to your dataset: [FinanseHub Currency & Interest Rates](https://app.powerbi.com/groups/0953a26c-9b44-4504-8ebe-c96b03d22923/datasets/175f3bf5-fbaf-4d2b-bec7-b1006db5da1f/details)
2. Click "Settings" → "Scheduled refresh"
3. Configure:
   - **Frequency**: Daily
   - **Time**: 07:00 (after Norges Bank updates)
   - **Time Zone**: W. Europe Standard Time
   - **Days**: Monday-Friday
   - **Email notifications**: On failure

### Data Gateway (if required)
If Power BI cannot directly connect to Azure PostgreSQL:
1. Install Power BI Gateway on a server
2. Configure PostgreSQL connection through gateway
3. Use gateway in refresh settings

## 🎯 Report Design Best Practices

### Norwegian Color Scheme
- **Primary**: #003366 (Navy Blue - Norges Bank colors)
- **Secondary**: #FF6B35 (Orange - accent)
- **Success**: #28a745 (Green - positive values)
- **Warning**: #ffc107 (Yellow - caution)
- **Danger**: #dc3545 (Red - negative values)

### Typography
- **Titles**: Segoe UI Bold, 16pt
- **Headers**: Segoe UI Semibold, 14pt
- **Body**: Segoe UI Regular, 11pt
- **Numbers**: Segoe UI Bold, 12pt

### Norwegian Number Formats
- **Currency**: `#,##0.00 "kr"` (e.g., "10,25 kr")
- **Percentage**: `0.00%` (e.g., "5.25%")
- **Large Numbers**: `#,##0` (e.g., "6,600")

## 🚀 Quick Start Checklist

### Immediate Actions
- [ ] Open Power BI Desktop
- [ ] Add PostgreSQL data source with connection details above
- [ ] Import Norwegian database views
- [ ] Create measures using DAX formulas above
- [ ] Build reports using templates above
- [ ] Publish to your ValutaHub workspace

### Advanced Setup
- [ ] Configure automated refresh schedule
- [ ] Set up email alerts for data issues
- [ ] Create mobile-optimized report views
- [ ] Add row-level security if needed
- [ ] Share reports with stakeholders

## 🔗 Quick Links

- **Power BI Workspace**: https://app.powerbi.com/groups/0953a26c-9b44-4504-8ebe-c96b03d22923
- **Dataset Settings**: https://app.powerbi.com/groups/0953a26c-9b44-4504-8ebe-c96b03d22923/datasets/175f3bf5-fbaf-4d2b-bec7-b1006db5da1f/details
- **Power BI Service**: https://app.powerbi.com

---

**Your Norwegian financial data is now connected to Power BI! 🇳🇴📊**

The database connection is established, Norwegian views are ready, and you have complete templates for building professional financial dashboards with Norwegian terminology.
