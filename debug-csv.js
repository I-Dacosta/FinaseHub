#!/usr/bin/env node

/**
 * Debug CSV parsing for Norges Bank API
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

async function debugCSV() {
    const currency = 'USD';
    const url = `https://data.norges-bank.no/api/data/EXR/${currency}.NOK.SP?format=csv&startPeriod=2025-08-23&endPeriod=2025-08-25`;
    
    console.log('URL:', url);
    console.log('\nFetching CSV data...');
    
    try {
        const csvData = await makeHttpRequest(url);
        
        console.log('\nRAW CSV DATA:');
        console.log('='.repeat(50));
        console.log(csvData);
        console.log('='.repeat(50));
        
        console.log('\nPARSING:');
        const lines = csvData.trim().split('\n');
        console.log(`Lines count: ${lines.length}`);
        
        lines.forEach((line, i) => {
            console.log(`Line ${i}: "${line}"`);
            if (i > 0 && line.trim()) {
                const parts = line.split(',');
                console.log(`  Parts (${parts.length}):`, parts);
                if (parts.length >= 6) {
                    console.log(`  Date: ${parts[0]}, Value: ${parts[5]}`);
                }
            }
        });
        
    } catch (error) {
        console.error('Error:', error);
    }
}

debugCSV();
