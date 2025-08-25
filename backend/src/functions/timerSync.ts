import { app, InvocationContext, Timer } from "@azure/functions";
import { SyncService } from "../lib/sync";
import { configService } from "../lib/config";

export async function timerSync(myTimer: Timer, context: InvocationContext): Promise<void> {
    const startTime = new Date();
    context.log('🔄 Timer function started at:', startTime.toISOString());
    
    try {
        // Initialize Key Vault if available
        const keyVaultUrl = process.env.KEY_VAULT_URL;
        if (keyVaultUrl) {
            context.log('🔑 Initializing Key Vault:', keyVaultUrl);
            await configService.initializeKeyVault(keyVaultUrl);
            context.log('✅ Key Vault initialized successfully');
        } else {
            context.warn('⚠️ No KEY_VAULT_URL configured');
        }

        // Create and run sync service
        context.log('🚀 Creating sync service...');
        const syncService = new SyncService();
        
        context.log('🔄 Starting full sync...');
        await syncService.runFullSync();
        
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        context.log(`✅ Sync completed successfully in ${duration}ms`);
        
    } catch (error) {
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        context.error(`❌ Error during sync after ${duration}ms:`, error);
        
        // Log error details for debugging
        if (error instanceof Error) {
            context.error('Error message:', error.message);
            context.error('Error stack:', error.stack);
        }
        
        throw error; // This will mark the function execution as failed in Azure
    }
}

app.timer('timerSync', {
    schedule: '0 30 17 * * 1-5', // Hverdager kl 17:30 (Oslo-tid)
    handler: timerSync
});
