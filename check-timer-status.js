#!/usr/bin/env node

/**
 * Test if our timer sync function would work today
 * This simulates what should happen at 16:30 on weekdays
 */

const { Client } = require('pg');

const DATABASE_CONFIG = {
    host: 'finansehub-db.postgres.database.azure.com',
    port: 5432,
    database: 'fx',
    user: 'finansehub_admin', 
    password: 'OAsd2amudO38Pn6k9kt7t0NmS',
    ssl: { rejectUnauthorized: false }
};

async function checkLastUpdate() {
    console.log('🔍 Checking when currency data was last updated...');
    
    const client = new Client(DATABASE_CONFIG);
    
    try {
        await client.connect();
        console.log('✅ Connected to database');
        
        // Check latest rates for each currency
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
        
        const result = await client.query(latestQuery);
        
        console.log('\n📊 Latest currency data:');
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0];
        
        let updatedToday = 0;
        let updatedYesterday = 0;
        let oldData = 0;
        
        result.rows.forEach(row => {
            const date = row.date.toISOString().split('T')[0];
            let indicator = '📅';
            
            if (date === today) {
                indicator = '🆕';
                updatedToday++;
            } else if (date === yesterday) {
                indicator = '🟡';
                updatedYesterday++;
            } else if (date < '2025-08-25') {
                indicator = '🔴';
                oldData++;
            }
            
            console.log(`  ${indicator} ${row.base}: ${parseFloat(row.value).toFixed(6)} (${date}) [${row.src}]`);
        });
        
        console.log('\n📈 Summary:');
        console.log(`• Updated today (${today}): ${updatedToday} currencies`);
        console.log(`• Updated yesterday (${yesterday}): ${updatedYesterday} currencies`);
        console.log(`• Old data (before 2025-08-25): ${oldData} currencies`);
        console.log(`• Total currencies: ${result.rows.length}`);
        
        // Check if we should have updates
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday
        const hour = now.getHours();
        
        console.log('\n🕒 Current time info:');
        console.log(`• Date: ${today}`);
        console.log(`• Day of week: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]}`);
        console.log(`• Hour: ${hour}:${now.getMinutes().toString().padStart(2, '0')}`);
        
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        const isPast1630 = hour >= 16 || (hour === 16 && now.getMinutes() >= 30);
        
        console.log('\n⏰ Timer status:');
        console.log(`• Is weekday: ${isWeekday ? '✅' : '❌'} (timer runs Mon-Fri)`);
        console.log(`• Is past 16:30: ${isPast1630 ? '✅' : '❌'} (timer runs at 16:30)`);
        
        if (isWeekday && isPast1630 && updatedToday === 0) {
            console.log('\n⚠️  ISSUE DETECTED:');
            console.log('• Timer should have run today but no data was updated');
            console.log('• This suggests the Azure Function timer is not working');
        } else if (!isWeekday) {
            console.log('\n✅ No issue - today is weekend, timer should not run');
        } else if (!isPast1630) {
            console.log('\n✅ No issue - it\'s before 16:30, timer hasn\'t run yet');
        } else if (updatedToday > 0) {
            console.log('\n✅ Timer appears to be working correctly');
        }
        
    } finally {
        await client.end();
    }
}

checkLastUpdate().catch(console.error);
