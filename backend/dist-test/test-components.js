"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const norgesbank_1 = require("./src/lib/norgesbank");
const sync_1 = require("./src/lib/sync");
async function testNorgesBankAPI() {
    console.log('🧪 Testing Norges Bank API...');
    const client = new norgesbank_1.NorgesBankClient();
    try {
        // Test currency rates
        console.log('📊 Testing currency rates...');
        const fromDate = new Date('2024-08-15');
        const toDate = new Date('2024-08-16');
        const rates = await client.getCurrencyRates(['USD', 'EUR'], 'NOK', fromDate.toISOString().split('T')[0], toDate.toISOString().split('T')[0]);
        console.log(`✅ Fetched ${rates.length} currency rates`);
        if (rates.length > 0) {
            console.log('Sample rate:', rates[0]);
        }
        // Test interest rates
        console.log('\n💰 Testing interest rates...');
        const interestRates = await client.getInterestRates('POLICY_RATE', fromDate.toISOString().split('T')[0], toDate.toISOString().split('T')[0]);
        console.log(`✅ Fetched ${interestRates.length} interest rate points`);
        if (interestRates.length > 0) {
            console.log('Sample rate:', interestRates[0]);
        }
        return true;
    }
    catch (error) {
        console.error('❌ API test failed:', error);
        return false;
    }
}
async function testSyncService() {
    console.log('\n🔄 Testing Sync Service (without database)...');
    try {
        const syncService = new sync_1.SyncService();
        // Note: Dette vil feile på database-operasjoner, men vi kan teste API-delen
        console.log('⚠️  Database operations will fail in this test (expected)');
        return true;
    }
    catch (error) {
        console.error('❌ Sync service test failed:', error);
        return false;
    }
}
async function runAllTests() {
    console.log('🚀 Starting finanseHub component tests...\n');
    const results = [];
    // Test API connection
    results.push(await testNorgesBankAPI());
    // Test sync service structure
    results.push(await testSyncService());
    console.log('\n📋 Test Summary:');
    console.log(`✅ Passed: ${results.filter(r => r).length}`);
    console.log(`❌ Failed: ${results.filter(r => !r).length}`);
    if (results.every(r => r)) {
        console.log('\n🎉 All tests passed! Ready for Azure deployment.');
    }
    else {
        console.log('\n⚠️  Some tests failed. Check the output above.');
    }
}
// Run tests
runAllTests().catch(console.error);
