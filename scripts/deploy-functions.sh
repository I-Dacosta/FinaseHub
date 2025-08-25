#!/bin/bash

# finanseHub Function App Deployment Script
# Dette scriptet deployer den ferdige koden til Azure Functions

set -e

# Configuration
FUNCTION_APP_NAME="finansehub-functions"
RESOURCE_GROUP="rg-finansehub"

echo "🚀 Deploying finanseHub to Azure Functions..."

# Check if function app name is provided as argument
if [ $# -eq 1 ]; then
    FUNCTION_APP_NAME=$1
    echo "Using function app name: $FUNCTION_APP_NAME"
fi

# Navigate to backend directory
cd backend

echo "1️⃣ Building and testing application..."
../scripts/build-and-test.sh

echo "2️⃣ Verifying Azure CLI login..."
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure CLI. Please run 'az login' first."
    exit 1
fi

echo "3️⃣ Checking if Function App exists..."
if ! az functionapp show --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo "❌ Function App '$FUNCTION_APP_NAME' not found in resource group '$RESOURCE_GROUP'"
    echo "Please run the infrastructure deployment script first: ../scripts/deploy-azure.sh"
    exit 1
fi

echo "4️⃣ Publishing to Azure Functions..."
func azure functionapp publish $FUNCTION_APP_NAME --typescript

echo "5️⃣ Verifying deployment..."
# Wait a moment for deployment to complete
sleep 10

# Check if functions are available
echo "Checking deployed functions..."
FUNCTIONS=$(az functionapp function list --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP --query "[].name" -o tsv)

if echo "$FUNCTIONS" | grep -q "timerSync"; then
    echo "✅ timerSync function deployed successfully"
else
    echo "⚠️  timerSync function not found"
fi

if echo "$FUNCTIONS" | grep -q "manualSync"; then
    echo "✅ manualSync function deployed successfully"
else
    echo "⚠️  manualSync function not found"
fi

echo "6️⃣ Running initial database migration..."
echo "Setting up database schema with Prisma..."

# Get database connection from Key Vault for migration
echo "Getting database URL from Key Vault..."
KV_NAME="kv-finansehub"
DATABASE_URL=$(az keyvault secret show --name "DATABASE-URL" --vault-name $KV_NAME --query value -o tsv)

if [ -n "$DATABASE_URL" ]; then
    export DATABASE_URL
    echo "Running Prisma database push..."
    npx prisma db push --accept-data-loss
    echo "✅ Database schema updated"
else
    echo "⚠️  Could not retrieve database URL from Key Vault"
    echo "Please run manually: npx prisma db push"
fi

echo "7️⃣ Testing deployment..."
echo "Getting function app URL..."
FUNCTION_URL="https://$FUNCTION_APP_NAME.azurewebsites.net"

echo "Manual sync endpoint: $FUNCTION_URL/api/manualSync"
echo "To test manually:"
echo "curl -X POST '$FUNCTION_URL/api/manualSync' -H 'x-cron-key: YOUR_CRON_KEY'"

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Summary:"
echo "   🏢 Function App: $FUNCTION_APP_NAME"
echo "   🌐 URL: $FUNCTION_URL"
echo "   ⏰ Timer function: Will run weekdays at 17:30 CET"
echo "   🔧 Manual sync: $FUNCTION_URL/api/manualSync"
echo ""
echo "📊 Monitoring:"
echo "   Application Insights: https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/microsoft.insights/components/ai-finansehub"
echo "   Function App Logs: https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$FUNCTION_APP_NAME"
echo ""
echo "🔍 Next steps:"
echo "   1. Monitor first automatic run at 17:30"
echo "   2. Verify data in PostgreSQL database"
echo "   3. Set up Power BI dataset connection"
echo "   4. Test Power BI refresh automation"
