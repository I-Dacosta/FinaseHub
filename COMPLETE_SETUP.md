# 🚀 Complete CI/CD Setup Guide

## Step 1: Get the Azure Function App Publish Profile

Since the Azure CLI redacts credentials, get the publish profile from Azure Portal:

1. **Go to Azure Portal**: https://portal.azure.com
2. **Navigate to your Function App**: `finansehub-functions`
3. **Get Publish Profile**:
   - Click "Get publish profile" in the overview section
   - This will download a `.PublishSettings` file
   - Open the file in a text editor and copy ALL the XML content

## Step 2: Add GitHub Secret

1. **Go to GitHub Repository**: https://github.com/I-Dacosta/FinaseHub
2. **Navigate to Secrets**:
   - Click "Settings" tab
   - Click "Secrets and variables" → "Actions"
3. **Add New Secret**:
   - Click "New repository secret"
   - **Name**: `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`
   - **Value**: Paste the complete XML content from the `.PublishSettings` file
   - Click "Add secret"

## Step 3: Test the CI/CD Pipeline

Make a test change to trigger the pipeline:

```bash
# Make a small change
echo "# Test CI/CD Pipeline" >> README.md

# Commit and push
git add README.md
git commit -m "test: trigger CI/CD pipeline"
git push
```

## Step 4: Monitor the Deployment

1. **GitHub Actions**: https://github.com/I-Dacosta/FinaseHub/actions
   - You should see a new workflow run starting
   - It will show: Build → Test → Deploy

2. **Azure Portal**: Check your Function App for the new deployment

## Expected Workflow

✅ **When you push to `main` branch**:
1. GitHub Actions triggers automatically
2. Installs Node.js 22.x and dependencies
3. Builds TypeScript code
4. Runs tests (if any)
5. Deploys to Azure Functions
6. Shows success/failure status

## Pipeline Features

- **Automatic deployment** on every push to `main`
- **TypeScript compilation** and validation
- **Environment variable** support
- **Build caching** for faster deployments
- **Error handling** and status reporting

## Troubleshooting

If the pipeline fails:

1. **Check GitHub Actions logs** for detailed error messages
2. **Verify the publish profile** is correctly added to secrets
3. **Ensure function app name** matches in the workflow file
4. **Check Azure Function App** status in Azure Portal

## Current Status

✅ Repository pushed to GitHub
✅ CI/CD workflow created (`.github/workflows/deploy.yml`)
✅ Azure Function App is running and configured
⏳ **Next**: Add publish profile to GitHub secrets

## Quick Links

- **Repository**: https://github.com/I-Dacosta/FinaseHub
- **GitHub Actions**: https://github.com/I-Dacosta/FinaseHub/actions
- **GitHub Secrets**: https://github.com/I-Dacosta/FinaseHub/settings/secrets/actions
- **Azure Function App**: https://portal.azure.com/#resource/subscriptions/4ac62288-ed6c-4d8e-b0ff-af4f8ff1b276/resourceGroups/rg-finansehub/providers/Microsoft.Web/sites/finansehub-functions

Once you add the publish profile secret, your CI/CD pipeline will be fully operational! 🎉
