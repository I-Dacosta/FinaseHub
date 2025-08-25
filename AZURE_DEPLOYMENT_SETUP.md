# Azure Deployment Setup Guide

## Overview
This guide helps you set up Azure authentication for the GitHub Actions CI/CD pipeline to deploy to Azure Functions.

## Required GitHub Secrets

You need to create the following secret in your GitHub repository:

### AZURE_CREDENTIALS

This secret contains the Azure service principal credentials in JSON format.

## Setting Up Azure Service Principal

### Step 1: Create a Service Principal

Run this command in Azure CLI (replace `<subscription-id>` with your Azure subscription ID):

```bash
az ad sp create-for-rbac \
  --name "github-actions-finansehub" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/<your-resource-group-name> \
  --sdk-auth
```

This will output JSON like this:
```json
{
  "clientId": "xxxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

### Step 2: Find Your Azure Details

If you need to find your subscription ID and resource group:

```bash
# List subscriptions
az account list --output table

# List resource groups
az group list --output table

# Get current subscription (if already set)
az account show
```

### Step 3: Add GitHub Secret

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `AZURE_CREDENTIALS`
5. Value: Paste the entire JSON output from Step 1
6. Click **Add secret**

## Alternative: Using Publish Profile (Simpler)

If you prefer to use the publish profile method (simpler but less secure), you can:

1. Go to your Azure Function App in the Azure portal
2. Click **Get publish profile** and download the `.PublishSettings` file
3. Open the file and copy all its contents
4. Create a GitHub secret named `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`
5. Paste the publish profile content as the secret value

Then update the workflow to use publish profile instead:

```yaml
- name: 'Run Azure Functions Action'
  uses: Azure/functions-action@v1
  with:
    app-name: 'finansehub-functions'
    slot-name: 'Production'
    package: '.'
    publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
```

## Verification

After setting up the credentials:

1. Push a commit to the main branch
2. Check the Actions tab in your GitHub repository
3. The deployment should complete successfully

## Troubleshooting

### Error: "No credentials found"
- Ensure the `AZURE_CREDENTIALS` secret is properly set
- Verify the JSON format is correct (no extra spaces or characters)

### Error: "Insufficient privileges"
- The service principal needs `Contributor` role on the resource group
- Run: `az role assignment create --assignee <clientId> --role Contributor --scope /subscriptions/<subscriptionId>/resourceGroups/<resourceGroupName>`

### Error: "Resource not found"
- Verify the Function App name (`finansehub-functions`) exists in Azure
- Check that the resource group and subscription are correct
