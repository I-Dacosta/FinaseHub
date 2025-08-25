import { SyncService } from './lib/sync';

async function testSync() {
  try {
    console.log('🔄 Starting sync test...');
    
    const syncService = new SyncService();
    
    // Test interest rate sync specifically
    console.log('� Syncing interest rate data...');
    const interestRateSeries = ['POLICY_RATE']; // Start with just policy rate
    await syncService.syncInterestRates(interestRateSeries);
    
    console.log('✅ Interest rate sync completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

testSync();
