#!/bin/bash

echo "🔍 Checking Publish Profile Content"
echo "=================================="

echo "📄 File: finansehub-functions.PublishSettings"
echo "Size: $(wc -c < finansehub-functions.PublishSettings) bytes"
echo ""

echo "🔑 Checking for actual credentials..."
if grep -q "REDACTED" finansehub-functions.PublishSettings; then
    echo "❌ File contains 'REDACTED' - credentials are masked"
    echo ""
    echo "🔧 Solutions:"
    echo "1. Open the actual .PublishSettings file from your Downloads folder"
    echo "2. Use Azure Portal: https://portal.azure.com"
    echo "   - Go to finansehub-functions"
    echo "   - Click 'Get publish profile'"
    echo "   - Open the downloaded file with a text editor (not VS Code)"
    echo ""
    echo "The file should contain real credentials like:"
    echo "userName=\"\$finansehub-functions\" userPWD=\"actual-password-here\""
else
    echo "✅ File appears to have real credentials"
    echo ""
    echo "📋 To add to GitHub secrets:"
    echo "1. Copy the ENTIRE content of this file:"
    cat finansehub-functions.PublishSettings
    echo ""
    echo "2. Go to: https://github.com/I-Dacosta/FinaseHub/settings/secrets/actions"
    echo "3. Click 'New repository secret'"
    echo "4. Name: AZURE_FUNCTIONAPP_PUBLISH_PROFILE"
    echo "5. Value: Paste the XML content above"
fi

echo ""
echo "🧪 After adding the secret, test with:"
echo "git commit --allow-empty -m 'test: trigger CI/CD pipeline' && git push"
