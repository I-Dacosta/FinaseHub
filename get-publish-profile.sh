#!/bin/bash

echo "🔑 Getting Azure Function App Publish Profile for CI/CD"
echo "======================================================"

# Get the publish profile with actual credentials
echo "Fetching publish profile..."
az functionapp deployment list-publishing-profiles \
  --name finansehub-functions \
  --resource-group rg-finansehub \
  --xml > publish-profile-temp.xml

if [ $? -eq 0 ]; then
    echo "✅ Publish profile saved to: publish-profile-temp.xml"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Copy the content from publish-profile-temp.xml"
    echo "2. Go to: https://github.com/I-Dacosta/FinaseHub/settings/secrets/actions"
    echo "3. Click 'New repository secret'"
    echo "4. Name: AZURE_FUNCTIONAPP_PUBLISH_PROFILE"
    echo "5. Value: Paste the XML content"
    echo "6. Delete publish-profile-temp.xml for security"
    echo ""
    echo "🚨 Important: Do NOT commit this file to Git!"
    echo ""
    echo "📄 Preview (first few lines):"
    head -n 3 publish-profile-temp.xml
    echo "..."
    echo ""
    echo "To view full content: cat publish-profile-temp.xml"
else
    echo "❌ Failed to get publish profile. Make sure you're logged into Azure CLI."
    echo "Run: az login"
fi
