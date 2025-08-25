import { SyncService } from './lib/sync';

async function testCurrencySync() {
  try {
    console.log('🔄 Starting currency sync test...');
    
    const syncService = new SyncService();
    
    // Test currency sync specifically
    console.log('💱 Syncing currency data...');
    await syncService.syncCurrencyRates();
    
    console.log('✅ Currency sync completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Currency sync failed:', error);
    process.exit(1);
  }
}

testCurrencySync();
