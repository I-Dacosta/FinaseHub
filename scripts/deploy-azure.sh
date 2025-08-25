#!/bin/bash

# finanseHub Azure Infrastructure Deployment Script
# Dette scriptet setter opp komplett Azure-infrastruktur for finanseHub-prosjektet

set -e  # Exit on any error

# Konfigurasjon - endre disse verdiene etter behov
RG_NAME="rg-finansehub"
LOCATION="norwayeast"
DB_SERVER_NAME="finansehub-db"
DB_NAME="fx"
KV_NAME="kv-finansehub"
FUNCTION_APP_NAME="finansehub-functions"
STORAGE_ACCOUNT_NAME="stfinansehub$(date +%s | tail -c 6)"
APP_INSIGHTS_NAME="ai-finansehub"
DB_USERNAME="finansehub_admin"

# Generate secure password for database
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

echo "🚀 Starting finanseHub infrastructure deployment..."
echo "📍 Resource Group: $RG_NAME"
echo "📍 Location: $LOCATION"

# 1. Create Resource Group
echo "1️⃣ Creating Resource Group..."
az group create \
  --name $RG_NAME \
  --location $LOCATION

# 2. Create Storage Account for Function App
echo "2️⃣ Creating Storage Account..."
az storage account create \
  --name $STORAGE_ACCOUNT_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

# 3. Create Application Insights
echo "3️⃣ Creating Application Insights..."
az monitor app-insights component create \
  --app $APP_INSIGHTS_NAME \
  --location $LOCATION \
  --resource-group $RG_NAME \
  --kind web

# Get Application Insights instrumentation key
AI_INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app $APP_INSIGHTS_NAME \
  --resource-group $RG_NAME \
  --query instrumentationKey \
  --output tsv)

# 4. Create PostgreSQL Flexible Server
echo "4️⃣ Creating PostgreSQL Flexible Server..."
az postgres flexible-server create \
  --resource-group $RG_NAME \
  --name $DB_SERVER_NAME \
  --location $LOCATION \
  --admin-user $DB_USERNAME \
  --admin-password $DB_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15 \
  --public-access 0.0.0.0

# 5. Create database
echo "5️⃣ Creating database '$DB_NAME'..."
az postgres flexible-server db create \
  --resource-group $RG_NAME \
  --server-name $DB_SERVER_NAME \
  --database-name $DB_NAME

# 6. Configure firewall rule for local development (replace with your IP)
echo "6️⃣ Configuring firewall rules..."
LOCAL_IP=$(curl -s ifconfig.me)
az postgres flexible-server firewall-rule create \
  --resource-group $RG_NAME \
  --name $DB_SERVER_NAME \
  --rule-name "AllowLocalIP" \
  --start-ip-address $LOCAL_IP \
  --end-ip-address $LOCAL_IP

# Allow Azure services
az postgres flexible-server firewall-rule create \
  --resource-group $RG_NAME \
  --name $DB_SERVER_NAME \
  --rule-name "AllowAzureServices" \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# 7. Create Key Vault with RBAC
echo "7️⃣ Creating Key Vault..."
az keyvault create \
  --name $KV_NAME \
  --resource-group $RG_NAME \
  --location $LOCATION \
  --enable-rbac-authorization true \
  --sku standard

# 8. Create Function App (Linux, Node 22)
echo "8️⃣ Creating Function App..."
az functionapp create \
  --resource-group $RG_NAME \
  --consumption-plan-location $LOCATION \
  --runtime node \
  --runtime-version 22 \
  --functions-version 4 \
  --name $FUNCTION_APP_NAME \
  --storage-account $STORAGE_ACCOUNT_NAME \
  --os-type Linux \
  --app-insights $APP_INSIGHTS_NAME

# 9. Enable managed identity for Function App
echo "9️⃣ Enabling managed identity for Function App..."
FUNCTION_PRINCIPAL_ID=$(az functionapp identity assign \
  --resource-group $RG_NAME \
  --name $FUNCTION_APP_NAME \
  --query principalId \
  --output tsv)

echo "Function App Principal ID: $FUNCTION_PRINCIPAL_ID"

# 10. Get current user object ID for Key Vault access
CURRENT_USER_ID=$(az ad signed-in-user show --query id --output tsv)

# 11. Assign Key Vault permissions
echo "🔑 Assigning Key Vault permissions..."

# Give current user Key Vault Administrator role (for initial setup)
az role assignment create \
  --role "Key Vault Administrator" \
  --assignee $CURRENT_USER_ID \
  --scope "/subscriptions/$(az account show --query id --output tsv)/resourceGroups/$RG_NAME/providers/Microsoft.KeyVault/vaults/$KV_NAME"

# Give Function App Key Vault Secrets User role
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $FUNCTION_PRINCIPAL_ID \
  --scope "/subscriptions/$(az account show --query id --output tsv)/resourceGroups/$RG_NAME/providers/Microsoft.KeyVault/vaults/$KV_NAME"

# Wait a bit for role assignments to propagate
echo "⏳ Waiting for role assignments to propagate..."
sleep 30

# 12. Store secrets in Key Vault
echo "🔒 Storing secrets in Key Vault..."

# Database URL
DATABASE_URL="postgresql://$DB_USERNAME:$DB_PASSWORD@$DB_SERVER_NAME.postgres.database.azure.com:5432/$DB_NAME?sslmode=require"
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "DATABASE-URL" \
  --value "$DATABASE_URL"

# Generate and store CRON key
CRON_KEY=$(openssl rand -hex 32)
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "CRON-KEY" \
  --value "$CRON_KEY"

echo "🔒 Basic secrets stored. You'll need to add Power BI secrets manually:"
echo "   - PBI-TENANT-ID"
echo "   - PBI-CLIENT-ID" 
echo "   - PBI-CLIENT-SECRET"
echo "   - PBI-GROUP-ID"
echo "   - PBI-DATASET-ID"

# 13. Configure Function App settings
echo "⚙️ Configuring Function App settings..."
az functionapp config appsettings set \
  --resource-group $RG_NAME \
  --name $FUNCTION_APP_NAME \
  --settings \
    "WEBSITE_TIME_ZONE=W. Europe Standard Time" \
    "DATABASE_URL=@Microsoft.KeyVault(VaultName=$KV_NAME;SecretName=DATABASE-URL)" \
    "CRON_KEY=@Microsoft.KeyVault(VaultName=$KV_NAME;SecretName=CRON-KEY)" \
    "KEY_VAULT_URL=https://$KV_NAME.vault.azure.net/" \
    "NB_BASES=USD,EUR,GBP,SEK,DKK,JPY,ISK,AUD,NZD,IDR,CLP" \
    "NB_QUOTE=NOK" \
    "NB_DEFAULT_START=2023-01-01" \
    "SYNC_MAX_ATTEMPTS=4" \
    "SYNC_BASE_DELAY_MS=2000" \
    "SYNC_MAX_DELAY_MS=30000" \
    "PBI_TENANT_ID=@Microsoft.KeyVault(VaultName=$KV_NAME;SecretName=PBI-TENANT-ID)" \
    "PBI_CLIENT_ID=@Microsoft.KeyVault(VaultName=$KV_NAME;SecretName=PBI-CLIENT-ID)" \
    "PBI_CLIENT_SECRET=@Microsoft.KeyVault(VaultName=$KV_NAME;SecretName=PBI-CLIENT-SECRET)" \
    "PBI_GROUP_ID=@Microsoft.KeyVault(VaultName=$KV_NAME;SecretName=PBI-GROUP-ID)" \
    "PBI_DATASET_ID=@Microsoft.KeyVault(VaultName=$KV_NAME;SecretName=PBI-DATASET-ID)"

echo ""
echo "✅ finanseHub infrastructure deployment completed!"
echo ""
echo "📋 Summary:"
echo "   🏢 Resource Group: $RG_NAME"
echo "   🗄️  Database: $DB_SERVER_NAME.postgres.database.azure.com/$DB_NAME"
echo "   🔑 Key Vault: $KV_NAME"
echo "   ⚡ Function App: $FUNCTION_APP_NAME"
echo "   📊 Application Insights: $APP_INSIGHTS_NAME"
echo ""
echo "🔗 Connection details:"
echo "   Database URL: $DATABASE_URL"
echo "   CRON Key: $CRON_KEY"
echo ""
echo "📝 Next steps:"
echo "   1. Configure Power BI Service Principal and add secrets to Key Vault"
echo "   2. Deploy your Function code: 'func azure functionapp publish $FUNCTION_APP_NAME'"
echo "   3. Run database migrations with Prisma"
echo "   4. Test the manual sync endpoint"
echo ""
echo "🔧 Local development:"
echo "   Add to .env file:"
echo "   DATABASE_URL=\"$DATABASE_URL\""
echo "   CRON_KEY=\"$CRON_KEY\""
echo "   KEY_VAULT_URL=\"https://$KV_NAME.vault.azure.net/\""
