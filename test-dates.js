#!/usr/bin/env node

/**
 * Test different date ranges for Norges Bank API
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

async function testDates() {
    const currency = 'USD';
    
    // Test different date ranges
    const dateRanges = [
        { start: '2025-08-23', end: '2025-08-25', desc: 'Recent days' },
        { start: '2025-08-20', end: '2025-08-25', desc: 'This week' },
        { start: '2025-08-01', end: '2025-08-25', desc: 'This month' },
        { start: '2025-07-01', end: '2025-08-25', desc: 'Two months' },
        { start: '2024-08-20', end: '2024-08-25', desc: 'Same period last year' }
    ];
    
    for (const range of dateRanges) {
        console.log(`\n=== Testing ${range.desc}: ${range.start} to ${range.end} ===`);
        
        const url = `https://data.norges-bank.no/api/data/EXR/${currency}.NOK.SP?format=csv&startPeriod=${range.start}&endPeriod=${range.end}`;
        
        try {
            const csvData = await makeHttpRequest(url);
            
            if (csvData.includes('<?xml')) {
                console.log('❌ Error response (XML)');
                // Extract error message
                const match = csvData.match(/<com:Text>(.*?)<\/com:Text>/);
                if (match) {
                    console.log(`   Error: ${match[1]}`);
                }
            } else {
                console.log('✅ Got CSV data');
                const lines = csvData.trim().split('\n');
                console.log(`   Lines: ${lines.length}`);
                if (lines.length > 1) {
                    console.log(`   Header: ${lines[0]}`);
                    console.log(`   Sample: ${lines[1]}`);
                    
                    // Count actual data lines
                    let dataLines = 0;
                    for (let i = 1; i < lines.length; i++) {
                        if (lines[i].trim()) dataLines++;
                    }
                    console.log(`   Data rows: ${dataLines}`);
                }
            }
            
        } catch (error) {
            console.log(`❌ Request failed: ${error.message}`);
        }
    }
}

testDates();
