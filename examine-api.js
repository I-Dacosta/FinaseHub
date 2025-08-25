#!/usr/bin/env node

/**
 * Examine the working Norges Bank API response
 */

const https = require('https');

async function makeHttpRequest(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
    });
}

async function examineWorkingAPI() {
    const url = 'https://data.norges-bank.no/api/data/EXR/?format=csv&startPeriod=2024-08-20&endPeriod=2024-08-25';
    
    console.log('Fetching from working API...');
    
    try {
        const csvData = await makeHttpRequest(url);
        const lines = csvData.trim().split('\n');
        
        console.log(`Total lines: ${lines.length}`);
        console.log('\nHeader:');
        console.log(lines[0]);
        
        console.log('\nFirst few data lines:');
        for (let i = 1; i <= Math.min(10, lines.length - 1); i++) {
            console.log(`${i}: ${lines[i]}`);
        }
        
        // Look for specific currencies
        console.log('\nLooking for specific currencies:');
        const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'SEK', 'DKK'];
        
        for (const currency of currencies) {
            const matches = lines.filter(line => line.includes(currency) && line.includes('NOK'));
            console.log(`${currency}: ${matches.length} entries`);
            if (matches.length > 0) {
                console.log(`  Example: ${matches[0]}`);
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

examineWorkingAPI();
