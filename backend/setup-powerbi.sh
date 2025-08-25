#!/bin/bash

# Power BI Configuration Setup for Azure Key Vault
# This script helps set up Power BI credentials in Azure Key Vault

echo "🔐 Power BI Azure Key Vault Configuration Setup"
echo "==============================================="
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if user is logged in
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure. Please run: az login"
    exit 1
fi

echo "✅ Azure CLI is ready"
echo ""

# Get current subscription
SUBSCRIPTION=$(az account show --query name -o tsv)
echo "📋 Current subscription: $SUBSCRIPTION"
echo ""

# Prompt for Key Vault name
read -p "🔑 Enter your Azure Key Vault name: " KEY_VAULT_NAME

if [ -z "$KEY_VAULT_NAME" ]; then
    echo "❌ Key Vault name is required"
    exit 1
fi

# Check if Key Vault exists
if ! az keyvault show --name "$KEY_VAULT_NAME" &> /dev/null; then
    echo "❌ Key Vault '$KEY_VAULT_NAME' not found"
    echo "💡 Create it first with: az keyvault create --name $KEY_VAULT_NAME --resource-group <your-rg> --location <location>"
    exit 1
fi

echo "✅ Key Vault '$KEY_VAULT_NAME' found"
echo ""

# Collect Power BI configuration
echo "📊 Power BI Configuration"
echo "========================"
echo ""
echo "To get these values:"
echo "1. Go to https://app.powerbi.com/"
echo "2. Go to Settings > Admin portal > Tenant settings"
echo "3. Create a new app registration in Azure AD"
echo "4. Configure Power BI service principal access"
echo ""

read -p "🏢 Enter your Azure AD Tenant ID: " TENANT_ID
read -p "📱 Enter your Power BI App (Client) ID: " CLIENT_ID
read -s -p "🔐 Enter your Power BI App Client Secret: " CLIENT_SECRET
echo ""
read -p "👥 Enter your Power BI Group (Workspace) ID: " GROUP_ID
read -p "📊 Enter your Power BI Dataset ID: " DATASET_ID

# Validate inputs
if [ -z "$TENANT_ID" ] || [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ] || [ -z "$GROUP_ID" ] || [ -z "$DATASET_ID" ]; then
    echo "❌ All Power BI configuration values are required"
    exit 1
fi

echo ""
echo "🔄 Setting Power BI secrets in Key Vault..."

# Set secrets in Key Vault
az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name "PBI-TENANT-ID" --value "$TENANT_ID" > /dev/null
az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name "PBI-CLIENT-ID" --value "$CLIENT_ID" > /dev/null
az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name "PBI-CLIENT-SECRET" --value "$CLIENT_SECRET" > /dev/null
az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name "PBI-GROUP-ID" --value "$GROUP_ID" > /dev/null
az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name "PBI-DATASET-ID" --value "$DATASET_ID" > /dev/null

echo "✅ Power BI secrets stored in Key Vault"
echo ""

# Create environment configuration
cat > .env.powerbi << EOF
# Power BI Configuration for Azure Function App
# Add these to your Function App Application Settings

KEY_VAULT_URL=https://${KEY_VAULT_NAME}.vault.azure.net/
PBI_TENANT_ID=${TENANT_ID}
PBI_CLIENT_ID=${CLIENT_ID}
PBI_CLIENT_SECRET=${CLIENT_SECRET}
PBI_GROUP_ID=${GROUP_ID}
PBI_DATASET_ID=${DATASET_ID}
EOF

echo "📝 Environment configuration saved to .env.powerbi"
echo ""

# Display next steps
echo "🚀 Next Steps for Production Deployment:"
echo "========================================"
echo ""
echo "1. Configure your Function App with these environment variables:"
echo "   - KEY_VAULT_URL=https://${KEY_VAULT_NAME}.vault.azure.net/"
echo "   - PBI_TENANT_ID, PBI_CLIENT_ID, etc. (or use Key Vault references)"
echo ""
echo "2. Enable Managed Identity for your Function App:"
echo "   az functionapp identity assign --name <function-app-name> --resource-group <resource-group>"
echo ""
echo "3. Grant Function App access to Key Vault:"
echo "   az keyvault set-policy --name $KEY_VAULT_NAME --object-id <function-app-identity> --secret-permissions get list"
echo ""
echo "4. In Power BI Admin Portal, enable:"
echo "   - Service principals can use Power BI APIs"
echo "   - Service principals can access read-only admin APIs"
echo ""
echo "5. Add your service principal to the Power BI workspace as Admin or Member"
echo ""
echo "6. Test the configuration with the test-powerbi function"
echo ""
echo "✅ Power BI configuration complete!"
echo "📊 Your Norwegian views (Valutakurser, Renter, etc.) are ready for Power BI!"
