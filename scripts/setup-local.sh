#!/bin/bash

# finanseHub Local Development Setup Script
# Dette scriptet setter opp lokal utviklingsmiljø for finanseHub

set -e

echo "🚀 Setting up local development environment for finanseHub..."

# Check if we're in the right directory
if [ ! -f "backend/package.json" ]; then
    echo "❌ Please run this script from the finanseHub root directory"
    exit 1
fi

# Navigate to backend directory
cd backend

echo "1️⃣ Installing dependencies..."
npm install

echo "2️⃣ Installing Azure Functions Core Tools globally (if not installed)..."
if ! command -v func &> /dev/null; then
    echo "Installing Azure Functions Core Tools..."
    npm install -g azure-functions-core-tools@4 --unsafe-perm true
else
    echo "Azure Functions Core Tools already installed"
fi

echo "3️⃣ Setting up environment variables..."

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
# Local development environment variables for finanseHub
# Copy values from Azure Key Vault after deployment

# Database connection (replace with your values after Azure deployment)
DATABASE_URL="postgresql://username:password@localhost:5432/finansehub_dev"

# CRON key for manual sync security (replace with Key Vault value)
CRON_KEY="your_cron_key_here"

# Azure Key Vault URL (replace after deployment)
KEY_VAULT_URL="https://your-keyvault.vault.azure.net/"

# Norges Bank API configuration
NB_BASES="USD,EUR,GBP,SEK,DKK,JPY,ISK,AUD,NZD,IDR,CLP"
NB_QUOTE="NOK"
NB_DEFAULT_START="2023-01-01"

# Sync configuration
SYNC_MAX_ATTEMPTS="4"
SYNC_BASE_DELAY_MS="2000"
SYNC_MAX_DELAY_MS="30000"

# Power BI configuration (replace with your values)
PBI_TENANT_ID="your_tenant_id"
PBI_CLIENT_ID="your_client_id"
PBI_CLIENT_SECRET="your_client_secret"
PBI_GROUP_ID="your_workspace_id"
PBI_DATASET_ID="your_dataset_id"

# Local development timezone
WEBSITE_TIME_ZONE="W. Europe Standard Time"
EOF
    echo "✅ Created .env file. Please update with your actual values after Azure deployment."
else
    echo "⚠️ .env file already exists, not overwriting"
fi

echo "4️⃣ Setting up Prisma..."

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

echo "5️⃣ Building the project..."
npm run build

echo ""
echo "✅ Local development setup completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Deploy Azure infrastructure: ../scripts/deploy-azure.sh"
echo "   2. Update .env file with actual database connection and secrets"
echo "   3. Run database migrations: npx prisma db push"
echo "   4. Start local development server: npm run start"
echo ""
echo "🔧 Available commands:"
echo "   npm run start    - Start Azure Functions locally"
echo "   npm run build    - Build TypeScript"
echo "   npm run watch    - Watch mode for development"
echo ""
echo "🧪 Testing endpoints:"
echo "   Timer function will run automatically based on cron schedule"
echo "   Manual sync: POST http://localhost:7071/api/manualSync"
echo "   (Include x-cron-key header for security)"
echo ""
echo "📚 Documentation:"
echo "   - Azure Functions: https://docs.microsoft.com/azure/azure-functions/"
echo "   - Prisma: https://www.prisma.io/docs/"
echo "   - Norges Bank API: https://www.norges-bank.no/en/topics/Statistics/exchange_rates/"
