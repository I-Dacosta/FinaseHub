#!/usr/bin/env node

/**
 * Test various Norges Bank API endpoints
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

async function testEndpoints() {
    const endpoints = [
        {
            name: 'Current format',
            url: 'https://data.norges-bank.no/api/data/EXR/USD.NOK.SP?format=csv&startPeriod=2024-08-20&endPeriod=2024-08-25'
        },
        {
            name: 'Without SP suffix',
            url: 'https://data.norges-bank.no/api/data/EXR/USD.NOK?format=csv&startPeriod=2024-08-20&endPeriod=2024-08-25'
        },
        {
            name: 'Different frequency',
            url: 'https://data.norges-bank.no/api/data/EXR/D.USD.NOK.SP?format=csv&startPeriod=2024-08-20&endPeriod=2024-08-25'
        },
        {
            name: 'Plain API',
            url: 'https://data.norges-bank.no/api/data/EXR/?format=csv&startPeriod=2024-08-20&endPeriod=2024-08-25'
        },
        {
            name: 'Historical rates API',
            url: 'https://norges-bank.no/api/externalrest/Exchange.json'
        }
    ];
    
    for (const endpoint of endpoints) {
        console.log(`\n=== Testing: ${endpoint.name} ===`);
        console.log(`URL: ${endpoint.url}`);
        
        try {
            const response = await makeHttpRequest(endpoint.url);
            
            if (response.includes('<?xml')) {
                console.log('❌ XML Error response');
                const match = response.match(/<com:Text>(.*?)<\/com:Text>/);
                if (match) {
                    console.log(`   Error: ${match[1]}`);
                }
            } else if (response.includes('{') || response.includes('[')) {
                console.log('✅ JSON response received');
                try {
                    const json = JSON.parse(response);
                    console.log(`   Keys: ${Object.keys(json)}`);
                } catch {
                    console.log('   JSON parsing failed');
                }
            } else if (response.includes(',')) {
                console.log('✅ CSV-like response received');
                const lines = response.trim().split('\n');
                console.log(`   Lines: ${lines.length}`);
                if (lines.length > 0) {
                    console.log(`   First line: ${lines[0].substring(0, 100)}...`);
                }
            } else {
                console.log('? Unknown response format');
                console.log(`   Length: ${response.length}`);
                console.log(`   Start: ${response.substring(0, 200)}...`);
            }
            
        } catch (error) {
            console.log(`❌ Request failed: ${error.message}`);
        }
    }
}

testEndpoints();
