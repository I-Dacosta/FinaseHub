import { SyncService } from './backend/src/lib/sync';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runSync() {
  console.log('Starting manual currency sync...');
  console.log('Current time:', new Date().toISOString());
  
  try {
    const syncService = new SyncService();
    await syncService.syncCurrencyRates();
    console.log('✅ Sync completed successfully!');
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

runSync();
