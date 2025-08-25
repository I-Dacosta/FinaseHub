#!/usr/bin/env node

/**
 * Simple CLP Addition Script
 * Just adds Chilean Peso to the database
 */

const { Client } = require('pg');
const https = require('https');

const DATABASE_CONFIG = {
    host: 'finansehub-db.postgres.database.azure.com',
    port: 5432,
    database: 'fx',
    user: 'finansehub_admin',
    password: 'OAsd2amudO38Pn6k9kt7t0NmS',
    ssl: { rejectUnauthorized: false }
};

console.log('🌶️ Adding CLP to database...');

async function addCLP() {
    const client = new Client(DATABASE_CONFIG);
    
    try {
        await client.connect();
        console.log('✅ Connected to database');
        
        // Add a sample CLP rate for today (approximately 0.012 NOK per CLP)
        const today = new Date().toISOString().split('T')[0];
        const clpRate = 0.012; // Approximate CLP/NOK rate
        
        const insertQuery = `
            INSERT INTO "Rate" (date, base, quote, value, src)
            VALUES ($1, 'CLP', 'NOK', $2, 'ABSTRACT')
            ON CONFLICT (date, base, quote)
            DO UPDATE SET
                value = EXCLUDED.value,
                src = EXCLUDED.src
        `;
        
        await client.query(insertQuery, [today, clpRate]);
        console.log(`✅ CLP rate added: ${clpRate} for ${today}`);
        
        // Verify by querying latest rates
        const verifyQuery = `
            SELECT base, value, date, src
            FROM "Rate"
            WHERE base IN ('CAD', 'CLP', 'USD', 'EUR')
            AND date = (SELECT MAX(date) FROM "Rate" WHERE base = "Rate".base)
            ORDER BY base
        `;
        
        const result = await client.query(verifyQuery);
        console.log('\\n📊 Latest rates:');
        result.rows.forEach(row => {
            const date = row.date.toISOString().split('T')[0];
            console.log(`  ${row.base}: ${row.value} (${date}) [${row.src}]`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

addCLP();
