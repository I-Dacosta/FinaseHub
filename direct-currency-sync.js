#!/usr/bin/env node

/**
 * Direct Database Currency Sync Script
 * Bypasses Azure Functions and directly updates the database
 * Combines Norges Bank and Abstract API sources
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

console.log('🔄 Starting direct database currency sync...');
console.log('📅 Date:', new Date().toISOString().split('T')[0]);

async function makeHttpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, options, (res) => {
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

async function fetchCLPFromAbstractAPI() {
    console.log('🌶️ Fetching CLP from Abstract API...');
    
    try {
        const url = `https://exchange-rates.abstractapi.com/v1/live?api_key=${ABSTRACT_API_KEY}&base=NOK&target=CLP`;
        const response = await makeHttpRequest(url);
        
        if (response.exchange_rates && response.exchange_rates.CLP) {
            const clpRate = response.exchange_rates.CLP;
            // Convert NOK/CLP to CLP/NOK
            const clpToNok = 1 / clpRate;
            
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
    console.log('🏦 Fetching rates from Norges Bank...');
    
    const currencies = ['USD', 'EUR', 'GBP', 'SEK', 'DKK', 'CAD', 'ISK', 'AUD', 'NZD', 'IDR', 'JPY'];
    const rates = [];
    
    for (const currency of currencies) {
        try {
            // Fetch last few days to ensure we get the latest
            const today = new Date();
            const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
            
            const startDate = threeDaysAgo.toISOString().split('T')[0];
            const endDate = today.toISOString().split('T')[0];
            
            const url = `https://data.norges-bank.no/api/data/EXR/${currency}.NOK.SP?format=csv&startPeriod=${startDate}&endPeriod=${endDate}&lastNObservations=5`;
            
            console.log(`  Fetching ${currency}/NOK...`);
            const csvData = await makeHttpRequest(url);
            
            // Parse CSV (simple parsing for this specific format)
            const lines = csvData.split('\n');
            for (let i = 1; i < lines.length; i++) { // Skip header
                const line = lines[i].trim();
                if (line) {
                    const parts = line.split(',');
                    if (parts.length >= 4) {
                        const date = parts[0];
                        const value = parseFloat(parts[3]);
                        
                        if (!isNaN(value) && value > 0) {
                            rates.push({
                                date: date,
                                base: currency,
                                quote: 'NOK',
                                value: value,
                                src: 'NB'
                            });
                        }
                    }
                }
            }
            
            console.log(`  ✅ ${currency}: Fetched successfully`);
            
        } catch (error) {
            console.error(`  ❌ ${currency}: ${error.message}`);
        }
    }
    
    return rates;
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
                } else {
                    updatedCount++;
                }
                
            } catch (error) {
                console.error(`  ❌ Failed to save ${rate.base}/${rate.quote} for ${rate.date}:`, error.message);
            }
        }
        
        console.log(`✅ Database updated: ${insertedCount} inserted, ${updatedCount} updated`);
        
        // Query latest rates to verify
        console.log('\\n📊 Latest rates in database:');
        const latestQuery = `
            WITH latest_rates AS (
                SELECT DISTINCT ON (base) 
                    base, quote, value, date, src,
                    ROW_NUMBER() OVER (PARTITION BY base ORDER BY date DESC) as rn
                FROM "Rate"
                WHERE quote = 'NOK'
                ORDER BY base, date DESC
            )
            SELECT base, value, date, src
            FROM latest_rates
            WHERE rn = 1
            ORDER BY base
        `;
        
        const latestResult = await client.query(latestQuery);
        latestResult.rows.forEach(row => {
            const date = row.date.toISOString().split('T')[0];
            console.log(`  ${row.base}: ${row.value} (${date}) [${row.src}]`);
        });
        
    } finally {
        await client.end();
    }
}

async function main() {
    try {
        const allRates = [];
        
        // 1. Fetch from Norges Bank
        const nbRates = await fetchNorgesBankRates();
        allRates.push(...nbRates);
        
        // 2. Fetch CLP from Abstract API
        const clpRate = await fetchCLPFromAbstractAPI();
        if (clpRate) {
            allRates.push(clpRate);
        }
        
        console.log(`\\n📈 Total rates fetched: ${allRates.length}`);
        
        if (allRates.length > 0) {
            // 3. Update database
            await updateDatabase(allRates);
            
            console.log('\\n✅ Direct database sync completed successfully!');
            console.log('\\n🎯 Summary:');
            console.log('• CAD should now show current rates (around 7.5 NOK)');
            console.log('• CLP should now be available from Abstract API');
            console.log('• All currencies should have the latest available data');
        } else {
            console.log('❌ No rates were fetched - check API connectivity');
        }
        
    } catch (error) {
        console.error('❌ Direct sync failed:', error);
        process.exit(1);
    }
}

main();
