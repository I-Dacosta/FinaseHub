import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { SyncService } from "../lib/sync";
import { configService } from "../lib/config";

export async function manualSync(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Manual sync triggered by ${request.method} request.`);

    try {
        // Sjekk CRON_KEY for sikkerhet
        const cronKey = await configService.getSecret('CRON_KEY') || await configService.getSecret('CRON-KEY');
        const providedKey = request.headers.get('x-cron-key');
        
        if (cronKey && providedKey !== cronKey) {
            return {
                status: 401,
                jsonBody: { error: 'Unauthorized' }
            };
        }

        // Initialize Key Vault if available
        const keyVaultUrl = process.env.KEY_VAULT_URL;
        if (keyVaultUrl) {
            await configService.initializeKeyVault(keyVaultUrl);
        }

        // Opprett og kjør sync-service
        const syncService = new SyncService();
        await syncService.runFullSync();
        
        return {
            status: 200,
            jsonBody: { 
                message: 'Sync completed successfully',
                timestamp: new Date().toISOString()
            }
        };
    } catch (error) {
        context.error('Error during manual sync:', error);
        
        return {
            status: 500,
            jsonBody: { 
                error: 'Sync failed',
                details: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            }
        };
    }
}

app.http('manualSync', {
    methods: ['GET', 'POST'],
    authLevel: 'function',
    handler: manualSync
});
