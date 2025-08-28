#!/usr/bin/env node

/**
 * Check current date and timer status more carefully
 */

console.log('🗓️ Date and Time Check:');
const now = new Date();
console.log('Current date/time:', now.toISOString());
console.log('Current date (UTC):', now.toISOString().split('T')[0]);
console.log('Current date (local):', now.toLocaleDateString());
console.log('Current time (local):', now.toLocaleTimeString());

// Norway is UTC+1 (UTC+2 in summer)
const norwayTime = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // Assuming summer time UTC+2
console.log('Norway time:', norwayTime.toISOString());
console.log('Norway date:', norwayTime.toISOString().split('T')[0]);
console.log('Norway time of day:', norwayTime.getUTCHours() + ':' + norwayTime.getUTCMinutes().toString().padStart(2, '0'));

console.log('\n📅 Timeline Analysis:');
console.log('• August 25 (Sunday) - Manual sync done');
console.log('• August 26 (Monday) - Timer should run at 16:30');
console.log('• August 27 (Tuesday) - Timer should run at 16:30');
console.log('• August 28 (Wednesday) - Timer should run at 16:30');
console.log('• August 29 (Thursday) - Timer should run at 16:30');

console.log('\n🎯 Expected vs Actual:');
console.log('Expected: Daily updates Mon-Thu (26-29 Aug)');
console.log('Actual: Last update on Aug 27 (from manual run)');
console.log('Missing: Updates for Aug 28 and Aug 29');

console.log('\n🔧 Possible Issues:');
console.log('1. Azure Function timer not deployed correctly');
console.log('2. Timer function has errors and is failing');
console.log('3. Time zone issues with the cron schedule');
console.log('4. Azure Function App not running or disabled');
console.log('5. Build/deployment issues after our changes');
