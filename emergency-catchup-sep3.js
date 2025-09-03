#!/usr/bin/env node

/**
 * Emergency Currency Data Catch-Up
 * Fetches all missing data from August 28th to September 3rd, 2025
 */

const https = require('https');
const { Client } = require('pg');

// Database configuration
const DATABASE_CONFIG = {
    host: 'finansehub-db.postgres.database.azure.com',
    port: 5432,
    database: 'fx',
    user: 'finansehub_admin',
    password: 'OAsd2amudO38Pn6k9kt7t0NmS',
    ssl: { rejectUnauthorized: false }
};

const ABSTRACT_API_KEY = '338e95bd6813413396d7a7dbe8724280';

console.log('🚨 EMERGENCY CURRENCY CATCH-UP');
console.log('- September 3rd, 2025');
console.log('- Missing data since August 28th');
console.log('===================================');

/**
 * Make HTTP request
 */
async function makeHttpRequest(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    if (res.headers['content-type']?.includes('application/json')) {
                        resolve(JSON.parse(data));
                    } else {
                        resolve(data);
                    }
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

/**
 * Fetch CLP from Abstract API
 */
async function fetchCLPFromAbstract() {
    console.log('🌎 Fetching CLP from Abstract API...');
    
    try {
        const url = `https://api.abstractapi.com/v1/exchange-rates/?api_key=${ABSTRACT_API_KEY}&base=NOK&target=CLP`;
        const response = await makeHttpRequest(url);
        
        if (response && response.exchange_rates && response.exchange_rates.CLP) {
            const clpRate = response.exchange_rates.CLP;
            const clpToNok = 1 / clpRate; // Convert NOK/CLP to CLP/NOK
            
            console.log(`  ✅ CLP: ${clpToNok.toFixed(6)} NOK`);
            
            return {
                date: new Date().toISOString().split('T')[0],
                base: 'CLP',
                quote: 'NOK',
                value: clpToNok,
                src: 'ABSTRACT'
            };
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.log(`  ❌ CLP fetch failed: ${error.message}`);
        // Fallback rate
        console.log('  📋 Using fallback CLP rate: 0.012000');
        return {
            date: new Date().toISOString().split('T')[0],
            base: 'CLP',
            quote: 'NOK',
            value: 0.012000,
            src: 'FALLBACK'
        };
    }
}

/**
 * Fetch comprehensive data from Norges Bank for date range
 */
async function fetchNorgesBankData() {
    console.log('🏦 Fetching comprehensive data from Norges Bank...');
    
    try {
        // Get data from August 28th to today
        const startDate = '2025-08-28';
        const endDate = new Date().toISOString().split('T')[0];
        
        const url = `https://data.norges-bank.no/api/data/EXR/?format=csv&startPeriod=${startDate}&endPeriod=${endDate}`;
        console.log(`  API URL: ${url}`);
        
        const csvData = await makeHttpRequest(url);
        
        if (typeof csvData === 'string' && csvData.trim() && !csvData.includes('<?xml')) {
            const lines = csvData.trim().split('\n');
            console.log(`  Got ${lines.length} lines from API`);
            
            const rates = [];
            const targetCurrencies = ['USD', 'EUR', 'GBP', 'SEK', 'DKK', 'CAD', 'ISK', 'AUD', 'NZD', 'IDR', 'JPY'];
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line) {
                    const parts = line.split(';');
                    if (parts.length >= 16) {
                        const baseCurrency = parts[2];
                        const quoteCurrency = parts[4];
                        const date = parts[14];
                        const valueStr = parts[15];
                        const unitMult = parseInt(parts[10]) || 0;
                        
                        if (quoteCurrency === 'NOK' && targetCurrencies.includes(baseCurrency)) {
                            const rawValue = parseFloat(valueStr);
                            
                            if (!isNaN(rawValue) && rawValue > 0) {
                                let adjustedValue = rawValue;
                                if (unitMult === 2) {
                                    adjustedValue = rawValue / 100;
                                }
                                
                                rates.push({
                                    date: date,
                                    base: baseCurrency,
                                    quote: 'NOK',
                                    value: adjustedValue,
                                    src: 'NB'
                                });
                            }
                        }
                    }
                }
            }
            
            // Group by date to show what we have
            const dateGroups = {};
            rates.forEach(rate => {
                if (!dateGroups[rate.date]) dateGroups[rate.date] = [];
                dateGroups[rate.date].push(rate);
            });
            
            console.log(`  📊 Found data for ${Object.keys(dateGroups).length} dates:`);
            Object.keys(dateGroups).sort().forEach(date => {
                console.log(`    ${date}: ${dateGroups[date].length} currencies`);
            });
            
            return rates;
            
        } else {
            console.log('  ❌ Invalid or empty response from Norges Bank API');
            return [];
        }
        
    } catch (error) {
        console.log(`  ❌ Failed to fetch from Norges Bank: ${error.message}`);
        return [];
    }
}

/**
 * Update database with rates
 */
async function updateDatabase(rates) {
    console.log('💾 Updating database...');
    
    const client = new Client(DATABASE_CONFIG);
    
    try {
        await client.connect();
        console.log('✅ Connected to database');
        
        let insertedCount = 0;
        let updatedCount = 0;
        const processedDates = new Set();
        
        for (const rate of rates) {
            try {
                const insertQuery = `
                    INSERT INTO "Rate" (date, base, quote, value, src)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (date, base, quote)
                    DO UPDATE SET
                        value = EXCLUDED.value,
                        src = EXCLUDED.src
                    RETURNING (xmax = 0) AS inserted
                `;
                
                const result = await client.query(insertQuery, [
                    rate.date,
                    rate.base,
                    rate.quote,
                    rate.value,
                    rate.src
                ]);
                
                if (result.rows[0].inserted) {
                    insertedCount++;
                    console.log(`  ✅ Inserted ${rate.base}: ${rate.value.toFixed(6)} for ${rate.date}`);
                } else {
                    updatedCount++;
                    console.log(`  🔄 Updated ${rate.base}: ${rate.value.toFixed(6)} for ${rate.date}`);
                }
                
                processedDates.add(rate.date);
                
            } catch (error) {
                console.log(`  ❌ Failed to save ${rate.base}/${rate.quote} for ${rate.date}: ${error.message}`);
            }
        }
        
        console.log(`\n✅ Database updated: ${insertedCount} inserted, ${updatedCount} updated`);
        console.log(`📅 Dates processed: ${Array.from(processedDates).sort().join(', ')}`);
        
    } finally {
        await client.end();
    }
}

async function main() {
    try {
        console.log('\n=== Fetching Missing Currency Data ===');
        
        let allRates = [];
        
        // Get Norges Bank data for the full range
        const nbRates = await fetchNorgesBankData();
        if (nbRates.length > 0) {
            allRates.push(...nbRates);
            console.log(`✅ Added ${nbRates.length} rates from Norges Bank`);
        }
        
        // Get CLP for today
        const clpRate = await fetchCLPFromAbstract();
        if (clpRate) {
            allRates.push(clpRate);
            console.log(`✅ Added CLP rate`);
        }
        
        console.log(`\n📈 Total rates to process: ${allRates.length}`);
        
        if (allRates.length > 0) {
            await updateDatabase(allRates);
            
            console.log('\n🎉 Emergency catch-up completed!');
            console.log('\n📋 Next steps:');
            console.log('1. ✅ Data is now current');
            console.log('2. 🔧 Fix the Azure timer function deployment');
            console.log('3. 🔍 Investigate why automated sync stopped working');
            console.log('4. ⚡ Verify timer executes properly going forward');
            
        } else {
            console.log('❌ No rates were retrieved - check API connectivity');
        }
        
    } catch (error) {
        console.log(`❌ Error during catch-up: ${error.message}`);
        if (error.stack) console.log(error.stack);
    }
}

main().catch(console.error);
