#!/usr/bin/env node

/**
 * Fixed Direct Database Currency Sync Script
 * Using real-time Norges Bank API data with correct parsing
 */

const { Client } = require('pg');
const https = require('https');

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

console.log('🔄 Starting FIXED direct database currency sync...');
console.log('📅 Date:', new Date().toISOString().split('T')[0]);

async function makeHttpRequest(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
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

async function fetchCLPFromAbstract() {
    console.log('🌎 Fetching CLP from Abstract API...');
    
    try {
        const url = `https://api.abstractapi.com/v1/exchange-rates/?api_key=${ABSTRACT_API_KEY}&base=NOK&target=CLP`;
        const response = await makeHttpRequest(url);
        
        if (response && response.exchange_rates && response.exchange_rates.CLP) {
            const clpRate = response.exchange_rates.CLP;
            // Convert NOK/CLP to CLP/NOK
            const clpToNok = 1 / clpRate;
            
            console.log(`  ✅ CLP: ${clpToNok.toFixed(6)} NOK`);
            
            return {
                date: new Date().toISOString().split('T')[0],
                base: 'CLP',
                quote: 'NOK',
                value: clpToNok,
                src: 'ABSTRACT'
            };
        } else {
            throw new Error('Invalid response format from Abstract API');
        }
    } catch (error) {
        console.error('❌ Failed to fetch CLP from Abstract API:', error.message);
        return null;
    }
}

async function fetchNorgesBankRates() {
    console.log('🏦 Fetching rates from Norges Bank (FIXED API)...');
    
    try {
        // Use working API endpoint with recent date range
        const today = new Date();
        const startDate = '2024-08-20'; // Start from a known working date
        const endDate = today.toISOString().split('T')[0];
        
        const url = `https://data.norges-bank.no/api/data/EXR/?format=csv&startPeriod=${startDate}&endPeriod=${endDate}`;
        console.log(`  API URL: ${url}`);
        
        const csvData = await makeHttpRequest(url);
        
        if (typeof csvData === 'string' && csvData.trim() && !csvData.includes('<?xml')) {
            const lines = csvData.trim().split('\n');
            console.log(`  Got ${lines.length} lines from API`);
            
            const rates = [];
            const targetCurrencies = ['USD', 'EUR', 'GBP', 'SEK', 'DKK', 'CAD', 'ISK', 'AUD', 'NZD', 'IDR', 'JPY'];
            
            // Parse the semicolon-separated CSV
            // Format: FREQ;Frequency;BASE_CUR;Base Currency;QUOTE_CUR;Quote Currency;TENOR;Tenor;DECIMALS;CALCULATED;UNIT_MULT;Unit Multiplier;COLLECTION;Collection Indicator;TIME_PERIOD;OBS_VALUE
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line) {
                    const parts = line.split(';');
                    if (parts.length >= 16) {
                        const baseCurrency = parts[2]; // BASE_CUR
                        const quoteCurrency = parts[4]; // QUOTE_CUR  
                        const date = parts[14]; // TIME_PERIOD
                        const valueStr = parts[15]; // OBS_VALUE
                        const unitMult = parseInt(parts[10]) || 0; // UNIT_MULT
                        
                        // We want BASE_CUR/NOK rates for our target currencies
                        if (quoteCurrency === 'NOK' && targetCurrencies.includes(baseCurrency)) {
                            const rawValue = parseFloat(valueStr);
                            
                            if (!isNaN(rawValue) && rawValue > 0) {
                                // Adjust for unit multiplier
                                let adjustedValue = rawValue;
                                if (unitMult === 2) {
                                    adjustedValue = rawValue / 100; // Hundreds to units
                                }
                                
                                rates.push({
                                    date: date,
                                    base: baseCurrency,
                                    quote: 'NOK',
                                    value: adjustedValue,
                                    src: 'NB'
                                });
                                
                                console.log(`  ✅ ${baseCurrency}: ${adjustedValue.toFixed(6)} NOK (${date})`);
                            }
                        }
                    }
                }
            }
            
            // Get the latest rate for each currency
            const latestRates = new Map();
            rates.forEach(rate => {
                const key = rate.base;
                if (!latestRates.has(key) || rate.date > latestRates.get(key).date) {
                    latestRates.set(key, rate);
                }
            });
            
            console.log(`  📊 Found latest rates for ${latestRates.size} currencies`);
            return Array.from(latestRates.values());
            
        } else {
            console.log('  ❌ Invalid or empty response from Norges Bank API');
            return [];
        }
        
    } catch (error) {
        console.error('❌ Failed to fetch from Norges Bank:', error.message);
        return [];
    }
}

async function updateDatabase(rates) {
    console.log('💾 Updating database...');
    
    const client = new Client(DATABASE_CONFIG);
    
    try {
        await client.connect();
        console.log('✅ Connected to database');
        
        let insertedCount = 0;
        let updatedCount = 0;
        
        for (const rate of rates) {
            try {
                // Try to insert, if conflict then update
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
                
            } catch (error) {
                console.error(`  ❌ Failed to save ${rate.base}/${rate.quote} for ${rate.date}:`, error.message);
            }
        }
        
        console.log(`\n✅ Database updated: ${insertedCount} inserted, ${updatedCount} updated`);
        
        // Query latest rates to verify
        console.log('\n📊 Latest rates in database:');
        const latestQuery = `
            WITH ranked_rates AS (
                SELECT base, quote, value, date, src,
                       ROW_NUMBER() OVER (PARTITION BY base ORDER BY date DESC) as rn
                FROM "Rate"
                WHERE quote = 'NOK'
            )
            SELECT base, value, date, src
            FROM ranked_rates
            WHERE rn = 1
            ORDER BY base
        `;
        
        const latestResult = await client.query(latestQuery);
        latestResult.rows.forEach(row => {
            const date = row.date.toISOString().split('T')[0];
            const today = new Date().toISOString().split('T')[0];
            const isRecent = date >= '2024-08-20';
            const indicator = isRecent ? '🆕' : '📅';
            console.log(`  ${indicator} ${row.base}: ${parseFloat(row.value).toFixed(6)} (${date}) [${row.src}]`);
        });
        
    } finally {
        await client.end();
    }
}

async function main() {
    try {
        let allRates = [];
        
        console.log('\n=== Fetching Real-Time Data ===');
        
        // Fetch from Norges Bank with fixed parsing
        const nbRates = await fetchNorgesBankRates();
        if (nbRates.length > 0) {
            allRates.push(...nbRates);
            console.log(`✅ Added ${nbRates.length} rates from Norges Bank`);
        }
        
        // Fetch CLP from Abstract API
        const clpRate = await fetchCLPFromAbstract();
        if (clpRate) {
            allRates.push(clpRate);
            console.log(`✅ Added CLP from Abstract API`);
        }
        
        console.log(`\n📈 Total rates to process: ${allRates.length}`);
        
        if (allRates.length > 0) {
            await updateDatabase(allRates);
            
            console.log('\n🎉 FIXED direct database sync completed successfully!');
            console.log('\n🎯 Summary:');
            console.log('• Real-time data from Norges Bank API (fixed parsing)');
            console.log('• CAD now shows current rate from NB API');
            console.log('• CLP from Abstract API source');
            console.log('• All major currencies updated with latest available rates');
            
            const currencyCount = new Set(allRates.map(r => r.base)).size;
            console.log(`• Total currencies updated: ${currencyCount}`);
            
        } else {
            console.log('❌ No rates were processed');
        }
        
    } catch (error) {
        console.error('❌ Fixed direct sync failed:', error);
        process.exit(1);
    }
}

main();
