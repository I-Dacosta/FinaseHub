# FinanseHub CI/CD Setup

## Azure Functions Deployment Pipeline

This repository includes a GitHub Actions workflow that automatically deploys your Azure Functions when code is pushed to the `main` branch.

## Setup Instructions

### 1. Get Azure Functions Publish Profile

```bash
# Download the publish profile for your function app
az functionapp deployment list-publishing-profiles \
  --name finansehub-functions \
  --resource-group rg-finansehub \
  --xml
```

### 2. Add Secrets to GitHub Repository

1. Go to your GitHub repository: https://github.com/I-Dacosta/FinaseHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secret:
   - **Name**: `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`
   - **Value**: The XML content from step 1

### 3. Test the Pipeline

1. Make any change to your code
2. Commit and push to the `main` branch:
   ```bash
   git add .
   git commit -m "test: trigger CI/CD pipeline"
   git push origin main
   ```
3. Check the **Actions** tab in your GitHub repository to see the deployment progress

## Pipeline Features

- **Automatic Testing**: Runs tests before deployment
- **TypeScript Compilation**: Builds the project before deployment
- **Environment Support**: Only deploys from the `main` branch
- **Status Notifications**: Shows success/failure status
- **Caching**: Uses npm cache for faster builds

## Monitoring Deployments

- Check the **Actions** tab in GitHub for deployment logs
- Verify deployment in Azure Portal under your Function App
- Test the deployed functions using the manual sync endpoint

## Environment Variables

The following environment variables are configured in Azure Function App settings:

- `ABSTRACT_API_KEY`: For Chilean Peso rates
- `NB_BASES`: Currency list for Norges Bank API
- `DATABASE_URL`: PostgreSQL connection (from Key Vault)
- `CRON_KEY`: Manual sync authentication (from Key Vault)
- Power BI configuration variables

## Troubleshooting

If deployment fails:

1. Check the GitHub Actions logs for error details
2. Verify the publish profile is correctly added to secrets
3. Ensure the Function App name matches in the workflow file
4. Check Azure Function App logs in the Azure Portal

## Manual Deployment

You can still deploy manually using Azure Functions Core Tools:

```bash
cd backend
func azure functionapp publish finansehub-functions
```
