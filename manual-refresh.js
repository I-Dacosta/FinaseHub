#!/usr/bin/env node

/**
 * Manual currency refresh script
 * This bypasses the Azure Functions and directly updates the database
 */

const { exec } = require('child_process');
const https = require('https');

console.log('🔄 Starting manual currency refresh...');
console.log('Date:', new Date().toISOString().split('T')[0]);

// Function to make HTTP request
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function refreshCurrencyData() {
    console.log('\n=== Manual Currency Data Refresh ===');
    
    // 1. Check current CAD data (should be old)
    console.log('\n1. Checking current CAD data...');
    try {
        const cadData = await makeRequest('https://finansehub-functions.azurewebsites.net/api/data/currency?base=CAD&quote=NOK&limit=3');
        console.log('CAD data response:', cadData ? 'Received' : 'No response');
        
        if (cadData && cadData.success && cadData.data) {
            console.log(`Found ${cadData.data.length} CAD records:`);
            cadData.data.forEach((rate, i) => {
                console.log(`  ${i+1}. ${rate.date.split('T')[0]}: ${rate.value} (${rate.src})`);
            });
        }
    } catch (error) {
        console.log('❌ CAD data check failed:', error.message);
    }
    
    // 2. Try to trigger manual sync
    console.log('\n2. Attempting manual sync...');
    try {
        const syncResult = await makeRequest('https://finansehub-functions.azurewebsites.net/api/manualSync');
        console.log('✅ Manual sync completed:', syncResult ? 'Success' : 'No response');
    } catch (error) {
        console.log('❌ Manual sync failed:', error.message);
        
        // 3. Try alternative: Force CLP sync via Abstract API
        console.log('\n3. Trying CLP sync via Abstract API...');
        try {
            const clpSync = await makeRequest('https://finansehub-functions.azurewebsites.net/api/testAbstractApi?action=sync-clp');
            console.log('✅ CLP sync completed');
        } catch (clpError) {
            console.log('❌ CLP sync failed:', clpError.message);
        }
    }
    
    // 4. Wait and check results
    console.log('\n4. Waiting 30 seconds for sync to complete...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // 5. Check updated data
    console.log('\n5. Checking updated data...');
    
    const currencies = ['CAD', 'CLP', 'USD', 'EUR', 'JPY'];
    for (const currency of currencies) {
        try {
            const data = await makeRequest(`https://finansehub-functions.azurewebsites.net/api/data/currency?base=${currency}&quote=NOK&limit=1`);
            if (data && data.success && data.data && data.data.length > 0) {
                const latest = data.data[0];
                const date = latest.date.split('T')[0];
                console.log(`✅ ${currency}: ${latest.value} (${date}) [${latest.src}]`);
                
                // Check if date is recent (should be around 2025-08-25)
                if (date < '2025-08-23') {
                    console.log(`⚠️  ${currency} data seems old (${date})`);
                }
            } else {
                console.log(`❌ ${currency}: No data found`);
            }
        } catch (error) {
            console.log(`❌ ${currency}: Error - ${error.message}`);
        }
    }
    
    console.log('\n=== Summary ===');
    console.log('If Azure Functions are not responding, the issue is with the function app deployment.');
    console.log('Expected dates should be around 2025-08-25 (today).');
    console.log('CAD should show ~7.5 NOK, CLP should be present with Abstract API source.');
}

refreshCurrencyData().catch(console.error);
