import { app, InvocationContext, Timer } from "@azure/functions";
import { configService } from "../lib/config";

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

/**
 * Make HTTP request with better error handling
 */
async function makeHttpRequest(url: string): Promise<any> {
    const https = require('https');
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res: any) => {
            let data = '';
            res.on('data', (chunk: any) => data += chunk);
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
async function fetchCLPFromAbstract(context: InvocationContext): Promise<any> {
    context.log('🌎 Fetching CLP from Abstract API...');
    
    try {
        const url = `https://api.abstractapi.com/v1/exchange-rates/?api_key=${ABSTRACT_API_KEY}&base=NOK&target=CLP`;
        const response = await makeHttpRequest(url);
        
        if (response && response.exchange_rates && response.exchange_rates.CLP) {
            const clpRate = response.exchange_rates.CLP;
            // Convert NOK/CLP to CLP/NOK
            const clpToNok = 1 / clpRate;
            
            context.log(`  ✅ CLP: ${clpToNok.toFixed(6)} NOK`);
            
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
    } catch (error: any) {
        context.error('❌ Failed to fetch CLP from Abstract API:', error.message);
        return null;
    }
}

/**
 * Fetch rates from Norges Bank with the working API
 */
async function fetchNorgesBankRates(context: InvocationContext): Promise<any[]> {
    context.log('🏦 Fetching rates from Norges Bank (Real-Time API)...');
    
    try {
        // Use working API endpoint with recent date range
        const today = new Date();
        const startDate = '2024-08-20'; // Start from a known working date
        const endDate = today.toISOString().split('T')[0];
        
        const url = `https://data.norges-bank.no/api/data/EXR/?format=csv&startPeriod=${startDate}&endPeriod=${endDate}`;
        context.log(`  API URL: ${url}`);
        
        const csvData = await makeHttpRequest(url);
        
        if (typeof csvData === 'string' && csvData.trim() && !csvData.includes('<?xml')) {
            const lines = csvData.trim().split('\n');
            context.log(`  Got ${lines.length} lines from API`);
            
            const rates: any[] = [];
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
            
            context.log(`  📊 Found latest rates for ${latestRates.size} currencies`);
            const result = Array.from(latestRates.values());
            
            result.forEach(rate => {
                context.log(`  ✅ ${rate.base}: ${rate.value.toFixed(6)} NOK (${rate.date})`);
            });
            
            return result;
            
        } else {
            context.log('  ❌ Invalid or empty response from Norges Bank API');
            return [];
        }
        
    } catch (error: any) {
        context.error('❌ Failed to fetch from Norges Bank:', error.message);
        return [];
    }
}

/**
 * Update database with new rates
 */
async function updateDatabase(rates: any[], context: InvocationContext): Promise<void> {
    context.log('💾 Updating database...');
    
    const { Client } = require('pg');
    const client = new Client(DATABASE_CONFIG);
    
    try {
        await client.connect();
        context.log('✅ Connected to database');
        
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
                    context.log(`  ✅ Inserted ${rate.base}: ${rate.value.toFixed(6)} for ${rate.date}`);
                } else {
                    updatedCount++;
                    context.log(`  🔄 Updated ${rate.base}: ${rate.value.toFixed(6)} for ${rate.date}`);
                }
                
            } catch (error: any) {
                context.error(`  ❌ Failed to save ${rate.base}/${rate.quote} for ${rate.date}:`, error.message);
            }
        }
        
        context.log(`\n✅ Database updated: ${insertedCount} inserted, ${updatedCount} updated`);
        
    } finally {
        await client.end();
    }
}

export async function timerSync(myTimer: Timer, context: InvocationContext): Promise<void> {
    const startTime = new Date();
    context.log('🔄 Timer function started at:', startTime.toISOString());
    context.log('⏰ Scheduled for weekdays at 16:30 (Oslo time)');
    
    try {
        // Initialize Key Vault if available
        const keyVaultUrl = process.env.KEY_VAULT_URL;
        if (keyVaultUrl) {
            context.log('🔑 Initializing Key Vault:', keyVaultUrl);
            await configService.initializeKeyVault(keyVaultUrl);
            context.log('✅ Key Vault initialized successfully');
        } else {
            context.warn('⚠️ No KEY_VAULT_URL configured');
        }

        let allRates: any[] = [];
        
        context.log('\n=== Fetching Real-Time Currency Data ===');
        
        // Fetch from Norges Bank with fixed parsing
        const nbRates = await fetchNorgesBankRates(context);
        if (nbRates.length > 0) {
            allRates.push(...nbRates);
            context.log(`✅ Added ${nbRates.length} rates from Norges Bank`);
        }
        
        // Fetch CLP from Abstract API
        const clpRate = await fetchCLPFromAbstract(context);
        if (clpRate) {
            allRates.push(clpRate);
            context.log(`✅ Added CLP from Abstract API`);
        }
        
        context.log(`\n� Total rates to process: ${allRates.length}`);
        
        if (allRates.length > 0) {
            await updateDatabase(allRates, context);
            
            const endTime = new Date();
            const duration = endTime.getTime() - startTime.getTime();
            context.log('\n🎉 Automated currency sync completed successfully!');
            context.log(`⏱️ Duration: ${duration}ms`);
            context.log('\n🎯 Summary:');
            context.log('• Real-time data from Norges Bank API');
            context.log('• CLP from Abstract API source');
            context.log('• All major currencies updated with latest available rates');
            
            const currencyCount = new Set(allRates.map(r => r.base)).size;
            context.log(`• Total currencies updated: ${currencyCount}`);
            
        } else {
            context.warn('❌ No rates were processed');
        }
        
    } catch (error: any) {
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        context.error(`❌ Error during automated sync after ${duration}ms:`, error);
        
        // Log error details for debugging
        if (error instanceof Error) {
            context.error('Error message:', error.message);
            context.error('Error stack:', error.stack);
        }
        
        throw error; // This will mark the function execution as failed in Azure
    }
}

app.timer('timerSync', {
    schedule: '0 30 16 * * 1-5', // Hverdager kl 16:30 (Oslo-tid)
    handler: timerSync
});
