import { PowerBIService, PowerBIConfig } from './lib/powerbi';
import { configService } from './lib/config';

async function testPowerBI() {
  try {
    console.log('🔄 Testing Power BI integration...');
    
    // Get Power BI configuration
    const powerBIConfigRaw = await configService.getPowerBIConfig();
    
    // Check if all required config is available
    if (!powerBIConfigRaw.tenantId || !powerBIConfigRaw.clientId || !powerBIConfigRaw.clientSecret || 
        !powerBIConfigRaw.groupId || !powerBIConfigRaw.datasetId) {
      console.log('❌ Power BI not fully configured - skipping test');
      console.log('Missing config:', {
        tenantId: !!powerBIConfigRaw.tenantId,
        clientId: !!powerBIConfigRaw.clientId,
        clientSecret: !!powerBIConfigRaw.clientSecret,
        groupId: !!powerBIConfigRaw.groupId,
        datasetId: !!powerBIConfigRaw.datasetId,
      });
      process.exit(0);
    }

    const powerBIConfig: PowerBIConfig = {
      tenantId: powerBIConfigRaw.tenantId,
      clientId: powerBIConfigRaw.clientId,
      clientSecret: powerBIConfigRaw.clientSecret,
      groupId: powerBIConfigRaw.groupId,
      datasetId: powerBIConfigRaw.datasetId,
    };

    const pbiService = new PowerBIService(powerBIConfig);
    
    // Get current refresh history
    console.log('📊 Getting refresh history...');
    const history = await pbiService.getRefreshHistory(3);
    
    console.log('\n📈 Recent refresh history:');
    if (history?.value?.length > 0) {
      history.value.forEach((refresh: any, index: number) => {
        const status = refresh.status;
        const startTime = new Date(refresh.startTime).toLocaleString();
        const endTime = refresh.endTime ? new Date(refresh.endTime).toLocaleString() : 'In progress';
        
        console.log(`  ${index + 1}. Status: ${status}, Started: ${startTime}, Ended: ${endTime}`);
      });
    } else {
      console.log('  No refresh history found');
    }
    
    // Trigger a new refresh
    console.log('\n🔄 Triggering dataset refresh...');
    await pbiService.refreshDataset();
    console.log('✅ Dataset refresh triggered successfully');
    
    // Wait a moment and check status again
    console.log('\n⏳ Waiting 10 seconds then checking status...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const updatedHistory = await pbiService.getRefreshHistory(1);
    if (updatedHistory?.value?.length > 0) {
      const latestRefresh = updatedHistory.value[0];
      console.log(`📊 Latest refresh status: ${latestRefresh.status}`);
      console.log(`   Started: ${new Date(latestRefresh.startTime).toLocaleString()}`);
      if (latestRefresh.endTime) {
        console.log(`   Ended: ${new Date(latestRefresh.endTime).toLocaleString()}`);
      }
    }
    
    console.log('\n✅ Power BI validation completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Power BI test failed:', error);
    process.exit(1);
  }
}

testPowerBI();
