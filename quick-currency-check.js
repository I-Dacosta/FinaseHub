#!/usr/bin/env node

const { execSync } = require('child_process');

function makeRequest(url) {
    try {
        const result = execSync(`curl -s -m 15 "${url}"`, { encoding: 'utf8' });
        return JSON.parse(result);
    } catch (error) {
        console.log(`Error making request to ${url}: ${error.message}`);
        return null;
    }
}

console.log('=== Quick Currency Status Check ===\n');

// Check CAD data
console.log('Checking CAD data...');
const cadData = makeRequest('https://finansehub-functions.azurewebsites.net/api/data/currency?quote=CAD&limit=5');
if (cadData && cadData.success && cadData.data.length > 0) {
    console.log(`Found ${cadData.data.length} CAD records:`);
    cadData.data.forEach((rate, index) => {
        const date = rate.date.split('T')[0];
        console.log(`  ${index + 1}. ${date}: ${rate.value} (${rate.src})`);
    });
} else {
    console.log('No CAD data found or request failed');
}

console.log('');

// Check CLP data
console.log('Checking CLP data...');
const clpData = makeRequest('https://finansehub-functions.azurewebsites.net/api/data/currency?quote=CLP&limit=5');
if (clpData && clpData.success && clpData.data.length > 0) {
    console.log(`Found ${clpData.data.length} CLP records:`);
    clpData.data.forEach((rate, index) => {
        const date = rate.date.split('T')[0];
        console.log(`  ${index + 1}. ${date}: ${rate.value} (${rate.src})`);
    });
} else {
    console.log('No CLP data found - will force sync...');
    
    // Force CLP sync
    console.log('Forcing CLP sync...');
    try {
        execSync('curl -s -m 30 "https://finansehub-functions.azurewebsites.net/api/testAbstractApi?action=sync-clp"', { encoding: 'utf8' });
        console.log('CLP sync command sent');
    } catch (error) {
        console.log(`CLP sync error: ${error.message}`);
    }
}

console.log('\n=== Summary ===');
console.log('If CAD shows old dates (21.08), we need to clean up old data');
console.log('If CLP is missing, we need to add it to frontend configuration');
console.log('Current date should be around 25.08.2025 for latest data');
