#!/bin/bash

# Azure Function App Deployment Script for FinanseHub
# This script deploys the FinanseHub backend with Norwegian data views to Azure

echo "🚀 FinanseHub Azure Function App Deployment"
echo "==========================================="
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed"
    exit 1
fi

if ! command -v func &> /dev/null; then
    echo "❌ Azure Functions Core Tools is not installed"
    echo "💡 Install with: npm install -g azure-functions-core-tools@4"
    exit 1
fi

if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure. Please run: az login"
    exit 1
fi

echo "✅ Prerequisites met"
echo ""

# Get deployment configuration
SUBSCRIPTION=$(az account show --query name -o tsv)
echo "📋 Current subscription: $SUBSCRIPTION"
echo ""

read -p "🏢 Enter resource group name: " RESOURCE_GROUP
read -p "📍 Enter Azure region (e.g., northeurope): " LOCATION
read -p "🔧 Enter Function App name: " FUNCTION_APP_NAME
read -p "💾 Enter Storage Account name: " STORAGE_ACCOUNT_NAME
read -p "🔑 Enter Key Vault name (for Power BI config): " KEY_VAULT_NAME

# Validate inputs
if [ -z "$RESOURCE_GROUP" ] || [ -z "$LOCATION" ] || [ -z "$FUNCTION_APP_NAME" ] || [ -z "$STORAGE_ACCOUNT_NAME" ]; then
    echo "❌ All configuration values are required"
    exit 1
fi

echo ""
echo "🔄 Starting deployment process..."
echo ""

# Create resource group if it doesn't exist
echo "1️⃣ Creating resource group..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" > /dev/null
echo "✅ Resource group ready"

# Create storage account
echo "2️⃣ Creating storage account..."
az storage account create \
    --name "$STORAGE_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku Standard_LRS \
    --kind StorageV2 > /dev/null
echo "✅ Storage account ready"

# Create Function App with Node.js 22
echo "3️⃣ Creating Function App..."
az functionapp create \
    --resource-group "$RESOURCE_GROUP" \
    --consumption-plan-location "$LOCATION" \
    --runtime node \
    --runtime-version 22 \
    --functions-version 4 \
    --name "$FUNCTION_APP_NAME" \
    --storage-account "$STORAGE_ACCOUNT_NAME" \
    --os-type Linux > /dev/null
echo "✅ Function App created"

# Enable managed identity
echo "4️⃣ Enabling managed identity..."
IDENTITY_PRINCIPAL_ID=$(az functionapp identity assign \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query principalId -o tsv)
echo "✅ Managed identity enabled: $IDENTITY_PRINCIPAL_ID"

# Configure Key Vault access if Key Vault name provided
if [ ! -z "$KEY_VAULT_NAME" ]; then
    echo "5️⃣ Configuring Key Vault access..."
    az keyvault set-policy \
        --name "$KEY_VAULT_NAME" \
        --object-id "$IDENTITY_PRINCIPAL_ID" \
        --secret-permissions get list > /dev/null
    echo "✅ Key Vault access configured"
    
    # Set Key Vault URL in app settings
    az functionapp config appsettings set \
        --name "$FUNCTION_APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --settings "KEY_VAULT_URL=https://${KEY_VAULT_NAME}.vault.azure.net/" > /dev/null
fi

# Configure database connection (you'll need to update this with your actual connection string)
echo "6️⃣ Configuring database connection..."
read -s -p "🗄️  Enter your PostgreSQL connection string: " DATABASE_URL
echo ""

az functionapp config appsettings set \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --settings "DATABASE_URL=$DATABASE_URL" > /dev/null
echo "✅ Database connection configured"

# Set Norges Bank configuration
echo "7️⃣ Setting Norges Bank API configuration..."
az functionapp config appsettings set \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --settings \
        "NB_BASES=USD,EUR,GBP,SEK,DKK,JPY,ISK,AUD,NZD,IDR,CLP" \
        "NB_QUOTE=NOK" \
        "NB_DEFAULT_START=2023-01-01" \
        "SYNC_MAX_ATTEMPTS=4" \
        "SYNC_BASE_DELAY_MS=2000" \
        "SYNC_MAX_DELAY_MS=30000" > /dev/null
echo "✅ Norges Bank configuration set"

# Build the project
echo "8️⃣ Building project..."
npm run build
echo "✅ Project built"

# Deploy to Azure
echo "9️⃣ Deploying to Azure..."
func azure functionapp publish "$FUNCTION_APP_NAME" --build remote
echo "✅ Deployment complete"

# Display deployment summary
echo ""
echo "🎉 Deployment Summary"
echo "===================="
echo ""
echo "✅ Function App: https://${FUNCTION_APP_NAME}.azurewebsites.net"
echo "✅ Resource Group: $RESOURCE_GROUP"
echo "✅ Storage Account: $STORAGE_ACCOUNT_NAME"
if [ ! -z "$KEY_VAULT_NAME" ]; then
    echo "✅ Key Vault: $KEY_VAULT_NAME"
fi
echo ""
echo "📊 Available API Endpoints:"
echo "- Currency Data: https://${FUNCTION_APP_NAME}.azurewebsites.net/api/data/currency"
echo "- Interest Rates: https://${FUNCTION_APP_NAME}.azurewebsites.net/api/data/series"
echo "- Data Summary: https://${FUNCTION_APP_NAME}.azurewebsites.net/api/data/summary"
echo "- Monitoring: https://${FUNCTION_APP_NAME}.azurewebsites.net/api/monitoring"
echo "- Manual Sync: https://${FUNCTION_APP_NAME}.azurewebsites.net/api/manualSync"
echo ""
echo "🇳🇴 Norwegian Database Views Created:"
echo "- Valutakurser (Currency Rates with Norwegian names)"
echo "- Renter (Interest Rates with Norwegian names)"
echo "- SisteKurser (Latest Currency Rates)"
echo "- SisteRenter (Latest Interest Rates)"
echo "- DataSammendrag (Data Summary)"
echo ""
echo "📋 Next Steps:"
echo "1. Test the deployment with: curl https://${FUNCTION_APP_NAME}.azurewebsites.net/api/data/summary"
echo "2. Configure Power BI to connect to the Norwegian views"
echo "3. Set up monitoring and alerts in Azure Portal"
echo "4. Schedule timer-based sync if needed"
echo ""
echo "🚀 FinanseHub is now deployed and ready for use!"
