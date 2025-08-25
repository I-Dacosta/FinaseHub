const { AbstractAPIClient } = require('./backend/dist/lib/abstractapi.js');

async function testAbstractAPI() {
    console.log('Testing Abstract API integration...\n');
    
    const apiKey = "338e95bd6813413396d7a7dbe8724280";
    
    try {
        const client = new AbstractAPIClient(apiKey);
        
        // Test connection
        console.log('🔗 Testing API connection...');
        const connectionTest = await client.testConnection();
        console.log(`${connectionTest.success ? '✅' : '❌'} ${connectionTest.message}\n`);
        
        if (!connectionTest.success) {
            return;
        }
        
        // Test getting Chilean Peso rate
        console.log('💰 Testing Chilean Peso rate...');
        const clpRate = await client.getChileanPesoRate();
        
        if (clpRate) {
            console.log('✅ Successfully retrieved CLP rate:');
            console.log(`   Date: ${clpRate.date}`);
            console.log(`   Rate: 1 ${clpRate.base} = ${clpRate.value.toFixed(6)} ${clpRate.quote}`);
            console.log(`   Source: ${clpRate.src}`);
        } else {
            console.log('❌ Failed to retrieve CLP rate');
        }
        
        console.log('\n📊 Test completed successfully!');
        console.log('🚨 Remember: Free tier has 500 requests per year, use carefully!');
        
    } catch (error) {
        console.error('❌ Error during testing:', error.message || error);
    }
}

testAbstractAPI().catch(console.error);
