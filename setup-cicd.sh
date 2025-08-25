#!/bin/bash

# CI/CD Setup Script for FinanseHub
echo "🚀 Setting up CI/CD for FinanseHub"
echo "=================================="

# Check if publish profile exists
if [ ! -f "publish-profile.xml" ]; then
    echo "❌ publish-profile.xml not found!"
    echo "Run: az functionapp deployment list-publishing-profiles --name finansehub-functions --resource-group rg-finansehub --xml > publish-profile.xml"
    exit 1
fi

echo "✅ Found publish profile"

echo ""
echo "📋 Next Steps:"
echo "1. Go to: https://github.com/I-Dacosta/FinaseHub/settings/secrets/actions"
echo "2. Click 'New repository secret'"
echo "3. Name: AZURE_FUNCTIONAPP_PUBLISH_PROFILE"
echo "4. Value: Copy the content from publish-profile.xml (see below)"
echo ""

echo "📄 Publish Profile Content:"
echo "=========================="
cat publish-profile.xml
echo ""
echo "=========================="

echo ""
echo "🧪 Test the Pipeline:"
echo "1. Make a small change to any file"
echo "2. Run: git add . && git commit -m 'test: trigger CI/CD' && git push"
echo "3. Check: https://github.com/I-Dacosta/FinaseHub/actions"

echo ""
echo "🔍 Monitor your deployment at:"
echo "- GitHub Actions: https://github.com/I-Dacosta/FinaseHub/actions"
echo "- Azure Portal: https://portal.azure.com/#resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/rg-finansehub/providers/Microsoft.Web/sites/finansehub-functions"

echo ""
echo "✨ After setup, your functions will auto-deploy on every push to main!"
