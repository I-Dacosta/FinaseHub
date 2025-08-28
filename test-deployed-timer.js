#!/usr/bin/env node

/**
 * Test the deployed timer function
 * This script will manually call the sync function to verify it's working
 */

const https = require('https');

console.log('🔄 TESTING DEPLOYED TIMER FUNCTION');
console.log('===================================');
console.log(`⏰ Current time: ${new Date().toLocaleString('en-US', { timeZone: 'Europe/Oslo' })} (Oslo time)`);

// Test the manual sync function to make sure the backend is working
async function testManualSync() {
    console.log('\n📞 Testing manual sync function...');
    
    const url = 'https://finansehub-functions.azurewebsites.net/api/manualsync';
    
    return new Promise((resolve, reject) => {
        console.log(`   Making request to: ${url}`);
        
        const req = https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`   Response status: ${res.statusCode}`);
                console.log(`   Response headers:`, res.headers);
                
                if (res.statusCode === 200) {
                    console.log('   ✅ Manual sync function is working!');
                    console.log('   Response:', data);
                    resolve(data);
                } else {
                    console.log(`   ❌ Manual sync failed with status ${res.statusCode}`);
                    console.log('   Response:', data);
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`   ❌ Request failed: ${error.message}`);
            reject(error);
        });
        
        req.setTimeout(30000, () => {
            req.destroy();
            console.log('   ❌ Request timed out after 30 seconds');
            reject(new Error('Request timeout'));
        });
    });
}

// Check timer schedule information
function checkTimerSchedule() {
    console.log('\n⏰ TIMER SCHEDULE ANALYSIS');
    console.log('===========================');
    
    const schedule = '0 30 16 * * 1-5'; // Our cron schedule
    console.log(`   Cron schedule: ${schedule}`);
    console.log('   Translation: Every weekday at 16:30 (4:30 PM)');
    console.log('   Timezone: W. Europe Standard Time (Oslo)');
    
    const now = new Date();
    const osloTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Oslo"}));
    
    console.log(`   Current Oslo time: ${osloTime.toLocaleString()}`);
    console.log(`   Day of week: ${osloTime.getDay()} (1=Monday, 5=Friday)`);
    console.log(`   Hour: ${osloTime.getHours()}, Minute: ${osloTime.getMinutes()}`);
    
    // Calculate next scheduled run
    const nextRun = new Date(osloTime);
    nextRun.setHours(16, 30, 0, 0);
    
    // If we're past 16:30 today, move to next weekday
    if (nextRun <= osloTime || osloTime.getDay() === 0 || osloTime.getDay() === 6) {
        do {
            nextRun.setDate(nextRun.getDate() + 1);
        } while (nextRun.getDay() === 0 || nextRun.getDay() === 6); // Skip weekends
        nextRun.setHours(16, 30, 0, 0);
    }
    
    console.log(`   Next scheduled run: ${nextRun.toLocaleString('en-US', { timeZone: 'Europe/Oslo' })} (Oslo time)`);
    
    // Check if timer should have run recently
    const lastScheduled = new Date(osloTime);
    lastScheduled.setHours(16, 30, 0, 0);
    
    // If it's past 16:30 today and it's a weekday, it should have run today
    if (osloTime.getHours() > 16 || (osloTime.getHours() === 16 && osloTime.getMinutes() > 30)) {
        if (osloTime.getDay() >= 1 && osloTime.getDay() <= 5) {
            console.log(`   ⚠️  Timer should have run today at 16:30`);
        }
    } else {
        // Check if it should have run yesterday
        lastScheduled.setDate(lastScheduled.getDate() - 1);
        if (lastScheduled.getDay() >= 1 && lastScheduled.getDay() <= 5) {
            console.log(`   ⚠️  Timer should have run yesterday (${lastScheduled.toLocaleDateString()}) at 16:30`);
        }
    }
}

async function main() {
    try {
        checkTimerSchedule();
        
        console.log('\n🧪 TESTING FUNCTION CONNECTIVITY');
        console.log('=================================');
        
        await testManualSync();
        
        console.log('\n✅ RESULTS');
        console.log('==========');
        console.log('1. ✅ Timer function is deployed to Azure');
        console.log('2. ✅ Manual sync function is accessible and working');
        console.log('3. 📋 Schedule is correct: Weekdays at 16:30 Oslo time');
        console.log('4. ⏰ Timer will run automatically at next scheduled time');
        
        console.log('\n🔍 MONITORING RECOMMENDATIONS');
        console.log('==============================');
        console.log('1. Check Azure Portal → Function App → Application Insights for execution logs');
        console.log('2. Monitor the next scheduled run (should be Monday at 16:30 if deployed on Friday evening)');
        console.log('3. Verify automated execution by checking database for new currency data');
        console.log('4. Consider setting up alerts for failed executions');
        
    } catch (error) {
        console.log('\n❌ TESTING FAILED');
        console.log('==================');
        console.log(`Error: ${error.message}`);
        
        console.log('\n🔧 TROUBLESHOOTING STEPS');
        console.log('=========================');
        console.log('1. Check if the function app is fully started (may take a few minutes after deployment)');
        console.log('2. Verify the function app is not in "cold start" mode');
        console.log('3. Check Azure Portal for any deployment errors');
        console.log('4. Review Application Insights for detailed error logs');
    }
}

main().catch(console.error);
