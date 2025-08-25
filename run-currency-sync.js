const { SyncService } = require('./backend/dist/lib/sync.js');

(async () => {
  try {
    console.log('🔄 Starting currency sync for August 21st...');
    const syncService = new SyncService();
    await syncService.syncCurrencyRates();
    console.log('✅ Currency sync completed successfully');
  } catch (error) {
    console.error('❌ Currency sync failed:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
})();
