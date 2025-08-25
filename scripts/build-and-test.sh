#!/bin/bash

# finanseHub Build and Test Script
# Dette scriptet bygger, tester og forbereder deploy av finanseHub backend

set -e

echo "🔨 Building and testing finanseHub backend..."

# Navigate to backend directory
cd backend

echo "1️⃣ Installing dependencies..."
npm ci

echo "2️⃣ Generating Prisma client..."
npm run prisma:generate

echo "3️⃣ Running linter..."
npm run lint

echo "4️⃣ Building TypeScript..."
npm run build

echo "5️⃣ Running tests..."
# Skip tests for now if no test files exist
if [ -d "src/__tests__" ] || [ -f "src/*.test.ts" ]; then
    npm test
else
    echo "⚠️  No test files found, skipping tests"
fi

echo "6️⃣ Verifying build output..."
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

if [ ! -f "dist/functions/timerSync.js" ]; then
    echo "❌ Build failed - timerSync function not found"
    exit 1
fi

if [ ! -f "dist/functions/manualSync.js" ]; then
    echo "❌ Build failed - manualSync function not found"
    exit 1
fi

echo "7️⃣ Checking Azure Functions configuration..."
if [ ! -f "host.json" ]; then
    echo "❌ host.json not found"
    exit 1
fi

if [ ! -f "local.settings.json" ]; then
    echo "⚠️  local.settings.json not found - creating default"
    cat > local.settings.json << 'EOF'
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "DATABASE_URL": "",
    "CRON_KEY": "development-key",
    "NB_BASES": "USD,EUR,GBP,SEK,DKK",
    "NB_QUOTE": "NOK",
    "NB_DEFAULT_START": "2023-01-01"
  }
}
EOF
fi

echo ""
echo "✅ Build and verification completed successfully!"
echo ""
echo "📦 Ready for deployment:"
echo "   - dist/ directory contains compiled JavaScript"
echo "   - Prisma client generated"
echo "   - Azure Functions configuration validated"
echo ""
echo "🚀 Deploy to Azure:"
echo "   func azure functionapp publish <function-app-name>"
echo ""
echo "🧪 Test locally:"
echo "   npm run start"
