#!/usr/bin/env node

const https = require('https');

async function checkCurrencyStatus() {
    console.log('=== Currency Status Check ===\n');
    
    try {
        // Check latest data for each currency
        const currencies = ['CAD', 'CLP', 'JPY', 'EUR', 'USD'];
        
        for (const currency of currencies) {
            try {
                console.log(`Checking ${currency}...`);
                const response = await fetch(`https://finansehub-functions.azurewebsites.net/api/data/currency?quote=${currency}&limit=3`);
                const data = await response.json();
                
                if (data.success && data.data.length > 0) {
                    console.log(`  Found ${data.data.length} records for ${currency}`);
                    data.data.forEach((rate, index) => {
                        console.log(`    ${index + 1}. Date: ${rate.date.split('T')[0]}, Value: ${rate.value}, Source: ${rate.src}`);
                    });
                } else {
                    console.log(`  No data found for ${currency}`);
                }
            } catch (error) {
                console.log(`  Error fetching ${currency}: ${error.message}`);
            }
            console.log('');
        }
        
        // Force CLP sync
        console.log('Forcing CLP sync...');
        try {
            const syncResponse = await fetch('https://finansehub-functions.azurewebsites.net/api/testAbstractApi?action=sync-clp');
            console.log('CLP sync completed');
        } catch (error) {
            console.log(`CLP sync error: ${error.message}`);
        }
        
        // Wait a moment and check CLP again
        console.log('\nWaiting 5 seconds then checking CLP again...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        try {
            const response = await fetch('https://finansehub-functions.azurewebsites.net/api/data/currency?quote=CLP&limit=3');
            const data = await response.json();
            
            if (data.success && data.data.length > 0) {
                console.log(`Found ${data.data.length} CLP records after sync:`);
                data.data.forEach((rate, index) => {
                    console.log(`  ${index + 1}. Date: ${rate.date.split('T')[0]}, Value: ${rate.value}, Source: ${rate.src}`);
                });
            } else {
                console.log('Still no CLP data found');
            }
        } catch (error) {
            console.log(`Error checking CLP after sync: ${error.message}`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Use node-fetch for Node.js compatibility
global.fetch = require('node-fetch');

checkCurrencyStatus();
