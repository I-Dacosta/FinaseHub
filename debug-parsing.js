const { NorgesBankClient } = require('./backend/dist/lib/norgesbank');

async function debugCurrencyParsing() {
  try {
    console.log('🔍 Debugging currency parsing...');
    const client = new NorgesBankClient();
    
    // Test just USD for today
    const startDate = '2025-08-20';
    const endDate = '2025-08-21';
    
    console.log(`📅 Fetching USD/NOK from ${startDate} to ${endDate}`);
    
    const rates = await client.getCurrencyRates(['USD'], 'NOK', startDate, endDate);
    
    console.log('✅ Rates received:', rates.length);
    rates.forEach((rate, i) => {
      console.log(`  ${i + 1}. Date: ${rate.date.toISOString().split('T')[0]}, Value: ${rate.value}, Base: ${rate.base}, Quote: ${rate.quote}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugCurrencyParsing();
