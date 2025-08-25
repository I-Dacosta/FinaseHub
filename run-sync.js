const { SyncService } = require('./backend/dist/lib/sync.js');

(async () => {
  const startTime = new Date();
  
  try {
    console.log('🔄 Starting manual sync for August 21st...');
    console.log('⏰ Start time:', startTime.toISOString());
    
    const syncService = new SyncService();
    await syncService.runFullSync();
    
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    console.log(`✅ Manual sync completed successfully in ${duration}ms`);
    console.log('⏰ End time:', endTime.toISOString());
    
  } catch (error) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    console.error(`❌ Manual sync failed after ${duration}ms:`, error.message);
    console.error('📋 Stack trace:', error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
})();
