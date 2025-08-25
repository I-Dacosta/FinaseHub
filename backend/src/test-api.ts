import axios from 'axios';

// Test locally first, then we can test deployed
const BASE_URL = 'http://localhost:7071/api';

async function testAPI() {
  try {
    console.log('🧪 Testing API endpoints...');
    
    // Test data summary
    console.log('\n📊 Testing data summary endpoint...');
    try {
      const summaryResponse = await axios.get(`${BASE_URL}/data/summary`);
      console.log('✅ Summary endpoint working');
      console.log('Currency pairs available:', summaryResponse.data.summary.currency.availablePairs.length);
      console.log('Series available:', summaryResponse.data.summary.series.availableSeries.length);
      console.log('Total currency rates:', summaryResponse.data.summary.currency.totalRates);
      console.log('Total series points:', summaryResponse.data.summary.series.totalPoints);
    } catch (error) {
      console.log('❌ Summary endpoint failed:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Test currency data
    console.log('\n💱 Testing currency data endpoint...');
    try {
      const currencyResponse = await axios.get(`${BASE_URL}/data/currency?base=NOK&quote=USD&limit=5`);
      console.log('✅ Currency endpoint working');
      console.log('Sample rates:', currencyResponse.data.count);
      if (currencyResponse.data.data.length > 0) {
        const sample = currencyResponse.data.data[0];
        console.log(`Latest NOK/USD: ${sample.value} on ${sample.date.split('T')[0]}`);
      }
    } catch (error) {
      console.log('❌ Currency endpoint failed:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Test series data
    console.log('\n📈 Testing series data endpoint...');
    try {
      const seriesResponse = await axios.get(`${BASE_URL}/data/series?series=POLICY_RATE&limit=5`);
      console.log('✅ Series endpoint working');
      console.log('Policy rate points:', seriesResponse.data.count);
      if (seriesResponse.data.data.length > 0) {
        const sample = seriesResponse.data.data[0];
        console.log(`Latest policy rate: ${sample.value}% on ${sample.date.split('T')[0]}`);
      }
    } catch (error) {
      console.log('❌ Series endpoint failed:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    console.log('\n✅ API testing completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ API test failed:', error);
    process.exit(1);
  }
}

// Check if we should test locally or remotely
const args = process.argv.slice(2);
if (args.includes('--remote')) {
  // Replace with your actual Function App URL
  console.log('Testing remote deployment...');
  // Update BASE_URL for remote testing
}

testAPI();
