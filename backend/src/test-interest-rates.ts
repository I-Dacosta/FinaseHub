import { NorgesBankClient } from './lib/norgesbank';

async function testInterestRates() {
  console.log('🧪 Testing Interest Rate API...');
  
  const client = new NorgesBankClient();
  
  try {
    const fromDate = '2025-08-15';
    const toDate = '2025-08-19';
    
    console.log(`Testing policy rate from ${fromDate} to ${toDate}`);
    const policyRates = await client.getInterestRates('POLICY_RATE', fromDate, toDate);
    
    console.log(`✅ Successfully fetched ${policyRates.length} policy rate points`);
    if (policyRates.length > 0) {
      console.log('Sample policy rates:');
      policyRates.slice(0, 3).forEach((rate) => {
        console.log(`  ${rate.date.toISOString().split('T')[0]} ${rate.series}: ${rate.value}`);
      });
    } else {
      console.log('⚠️ No policy rate data found');
    }
    
  } catch (error) {
    console.error('❌ Error during interest rate test:', error);
  }
}

testInterestRates().catch(console.error);
