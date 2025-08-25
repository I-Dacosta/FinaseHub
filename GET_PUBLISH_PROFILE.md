# 🔑 Get Azure Function App Publish Profile

The Azure CLI redacts credentials for security. You need to get the publish profile directly from Azure Portal.

## Method 1: Azure Portal (Recommended)

1. **Go to Azure Portal**: https://portal.azure.com
2. **Navigate to your Function App**:
   - Search for "finansehub-functions"
   - Click on your Function App
3. **Download Publish Profile**:
   - In the Overview section, click "Get publish profile"
   - This downloads a `.PublishSettings` file
   - Open the file in a text editor
   - Copy ALL the XML content

## Method 2: Azure CLI with --output-file

If CLI method works for you:

```bash
# Try downloading to a file
az functionapp deployment list-publishing-profiles \
  --name finansehub-functions \
  --resource-group rg-finansehub \
  --xml \
  --output-file publish-profile-real.xml

# Check if credentials are included
grep -i "userName" publish-profile-real.xml
```

## Adding to GitHub Secrets

1. **Copy the XML content** (should contain real usernames/passwords)
2. **Go to GitHub Secrets**: https://github.com/I-Dacosta/FinaseHub/settings/secrets/actions
3. **Add secret**:
   - Name: `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`
   - Value: Paste the complete XML content
4. **Save the secret**

## Test the Pipeline

After adding the secret:

```bash
# Commit the workflow fix
git add .github/workflows/deploy.yml
git commit -m "fix: update Azure Functions deployment action"
git push

# Monitor at: https://github.com/I-Dacosta/FinaseHub/actions
```

## Expected XML Format

The publish profile should look like this (with real credentials):

```xml
<publishData>
  <publishProfile 
    profileName="finansehub-functions - Web Deploy" 
    publishMethod="MSDeploy" 
    userName="$finansehub-functions" 
    userPWD="REAL_PASSWORD_HERE"
    ...
  />
</publishData>
```

If you see "REDACTED" instead of real credentials, use the Azure Portal method.
