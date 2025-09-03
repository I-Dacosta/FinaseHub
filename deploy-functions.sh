#!/bin/bash

echo "🚀 AZURE FUNCTION DEPLOYMENT SCRIPT"
echo "==================================="

cd /Volumes/Lagring/Aquatiq/FinanseHub/backend

echo "📦 Building backend..."
npm run build

echo "🗜️ Creating optimized deployment package..."
rm -f functions-deploy.zip

# Create a clean deployment package with only essentials
zip -r functions-deploy.zip \
    dist/ \
    host.json \
    package.json \
    --exclude="*.DS_Store" \
    --exclude="dist-test/*" \
    --exclude="src/*"

echo "📊 Package size:"
ls -lh functions-deploy.zip

echo "🚀 Deploying to Azure Functions..."
az functionapp deployment source config-zip \
    --resource-group rg-finansehub \
    --name finansehub-functions \
    --src functions-deploy.zip \
    --timeout 600

echo "⏳ Waiting for deployment to complete..."
sleep 30

echo "🔍 Checking deployed functions..."
az functionapp function list \
    --name finansehub-functions \
    --resource-group rg-finansehub \
    --output table

echo "✅ Deployment script completed!"
