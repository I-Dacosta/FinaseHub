# Power BI Integration Setup Guide for FinanseHub

## 🎯 Overview

Your FinanseHub is now successfully deployed to Azure! Next, we'll configure Power BI to connect to your Norwegian financial data.

## ✅ Azure Deployment Status

- **✅ Function App:** `func-vh-b76k2jz5hzgzi.azurewebsites.net`
- **✅ Resource Group:** `rg-Valutahub`
- **✅ Storage Account:** `stvhfuncb76k2jz5hzgzi`
- **✅ Key Vault:** `kv-vh-b76k2jz5hzgzi`
- **✅ Managed Identity:** Enabled for secure access

## 🔐 Step 1: Create Power BI App Registration

### 1.1 Register Application in Azure AD

1. **Go to Azure Portal** → Azure Active Directory → App registrations
2. **Click "New registration"**
3. **Configure the app:**
   - Name: `FinanseHub-PowerBI`
   - Account types: `Accounts in this organizational directory only`
   - Redirect URI: Leave empty for now
4. **Click "Register"**

### 1.2 Configure API Permissions

1. **Go to "API permissions"** in your new app
2. **Click "Add a permission"**
3. **Select "Power BI Service"**
4. **Choose "Delegated permissions"** and add:
   - `Dataset.ReadWrite.All`
   - `Report.ReadWrite.All`
   - `Workspace.ReadWrite.All`
5. **Click "Grant admin consent"** (requires admin privileges)

### 1.3 Create Client Secret

1. **Go to "Certificates & secrets"**
2. **Click "New client secret"**
3. **Description:** `FinanseHub Power BI Integration`
4. **Expires:** `24 months` (recommended)
5. **Copy the secret value** immediately (it won't be shown again)

### 1.4 Note Down Values

Copy these values for the next step:
- **Application (client) ID:** Found on app overview page
- **Directory (tenant) ID:** Found on app overview page  
- **Client secret:** The value you just created

## 🔑 Step 2: Store Credentials in Azure Key Vault

Run these commands with your actual values:

```bash
# Set your Key Vault name
KEY_VAULT_NAME="kv-vh-b76k2jz5hzgzi"

# Store Power BI credentials (replace with your actual values)
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "powerbi-client-id" --value "YOUR_CLIENT_ID"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "powerbi-client-secret" --value "YOUR_CLIENT_SECRET"  
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "powerbi-tenant-id" --value "YOUR_TENANT_ID"
```

## 📊 Step 3: Configure Power BI Service Principal Access

### 3.1 Enable Service Principal in Power BI Admin

1. **Go to** [Power BI Admin Portal](https://app.powerbi.com/admin-portal/tenantSettings)
2. **Find "Developer settings"** section
3. **Enable "Service principals can use Power BI APIs"**
4. **Add your app:** `FinanseHub-PowerBI` (or use the Client ID)
5. **Save settings**

### 3.2 Create Power BI Workspace

1. **Go to** [Power BI Service](https://app.powerbi.com/)
2. **Create new workspace:** `FinanseHub Norwegian Data`
3. **Add your service principal** as Admin:
   - Go to workspace settings
   - Add members
   - Enter your app's Client ID
   - Set role to "Admin"

## 🗄️ Step 4: Configure Database Connection in Power BI

### 4.1 Get Database Connection Details

Your PostgreSQL database details from deployment:
- **Server:** The DATABASE_URL you configured during deployment
- **Database:** Your database name
- **Port:** 5432 (default)

### 4.2 Create Data Source in Power BI Desktop

1. **Open Power BI Desktop**
2. **Get Data** → **PostgreSQL database**
3. **Enter connection details:**
   - Server: Your PostgreSQL server
   - Database: Your database name
4. **Authentication:** Database credentials

### 4.3 Connect to Norwegian Views

Once connected, you'll see these Norwegian views:

| View Name | Description | Purpose |
|-----------|-------------|---------|
| `Valutakurser` | Currency rates with Norwegian names | Main currency dashboard |
| `Renter` | Interest rates with Norwegian labels | Interest rate tracking |
| `SisteKurser` | Latest currency rates | Current rate displays |
| `SisteRenter` | Latest interest rates | Current rate dashboard |
| `DataSammendrag` | Data summary | Overview metrics |

## 📈 Step 5: Create Norwegian Dashboards

### 5.1 Currency Dashboard (Valutakurser)

**Key visualizations:**
- **Line chart:** `Dato` (x-axis) vs `Kurs` (y-axis), split by `GrunnvalutaNavn`
- **Cards:** Latest rates for USD, EUR, GBP
- **Table:** All currencies with Norwegian names

**Sample DAX measures:**
```dax
// Latest EUR rate
SisteEURKurs = 
CALCULATE(
    MAX(Valutakurser[Kurs]),
    Valutakurser[Grunnvaluta] = "EUR",
    Valutakurser[Dato] = MAX(Valutakurser[Dato])
)

// Currency change percentage
ValutaEndring% = 
VAR CurrentRate = [SisteEURKurs]
VAR PreviousRate = 
    CALCULATE(
        MAX(Valutakurser[Kurs]),
        Valutakurser[Grunnvaluta] = "EUR",
        Valutakurser[Dato] = MAX(Valutakurser[Dato]) - 1
    )
RETURN
DIVIDE(CurrentRate - PreviousRate, PreviousRate, 0)
```

### 5.2 Interest Rate Dashboard (Renter)

**Key visualizations:**
- **Gauge:** Current policy rate (`SisteRenter`)
- **Line chart:** Policy rate trend over time
- **Card:** "Styringsrente" with current value

**Sample DAX measure:**
```dax
SisteStyringstrente = 
CALCULATE(
    MAX(Renter[Rentesats]),
    Renter[RenteSerie] = "POLICY_RATE",
    Renter[Dato] = MAX(Renter[Dato])
)
```

## 🔄 Step 6: Set Up Automated Refresh

### 6.1 Publish to Power BI Service

1. **Publish your report** to the workspace you created
2. **Go to dataset settings** in Power BI Service
3. **Configure data source credentials:**
   - Enter your PostgreSQL credentials
   - Test the connection

### 6.2 Schedule Refresh

1. **Go to dataset settings**
2. **Scheduled refresh** section
3. **Configure:**
   - Frequency: Daily
   - Time: 9:00 AM (after Norges Bank updates)
   - Time zone: Europe/Oslo
   - Notify on failure: Your email

## 🎨 Step 7: Customize Norwegian Interface

### 7.1 Norwegian Labels

Use these Norwegian terms in your reports:
- **Valutakurser** - Currency rates
- **Styringsrente** - Policy rate  
- **Siste oppdatering** - Last update
- **Endring** - Change
- **Trend** - Trend

### 7.2 Formatting

- **Currency format:** Norwegian kroner (kr)
- **Date format:** DD.MM.YYYY (Norwegian standard)
- **Decimal separator:** Comma (Norwegian standard)

## 🚀 Step 8: Test Your Setup

### 8.1 Verify Data Connection

1. **Check latest data** in your dashboards
2. **Verify Norwegian currency names** are displayed
3. **Test refresh functionality**

### 8.2 Sample Queries to Validate

Test these in Power BI:
```sql
-- Latest currency rates
SELECT * FROM "SisteKurser" ORDER BY "Grunnvaluta"

-- Current policy rate  
SELECT * FROM "SisteRenter" WHERE "RenteSerie" = 'POLICY_RATE'

-- Data summary
SELECT * FROM "DataSammendrag"
```

## ✅ Success Checklist

- [ ] Azure Function App deployed successfully
- [ ] Power BI app registration created
- [ ] Credentials stored in Key Vault
- [ ] Service principal access enabled
- [ ] Power BI workspace created
- [ ] Database connection configured
- [ ] Norwegian views accessible
- [ ] Dashboards created with Norwegian labels
- [ ] Automated refresh scheduled
- [ ] Data validation completed

## 🆘 Troubleshooting

### Common Issues

1. **Connection timeout:** Use longer timeout in Power BI settings
2. **Authentication errors:** Verify Key Vault permissions
3. **Missing data:** Check Norwegian views are created
4. **Refresh failures:** Verify database credentials

### Support Resources

- **Function App logs:** Azure Portal → Function App → Log Stream
- **Database connection:** Test with pgAdmin or similar tool
- **Power BI issues:** Power BI Admin Portal → Health

## 🎉 Congratulations!

Your FinanseHub is now fully integrated with Power BI using Norwegian naming conventions! You have:

- **6,600** currency records with Norwegian names
- **660** interest rate records  
- **Real-time** Norwegian financial dashboards
- **Automated** daily data refresh
- **Secure** credential management via Azure Key Vault

Your Norwegian financial data hub is ready for production use! 🇳🇴✨
