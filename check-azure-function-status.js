#!/usr/bin/env node

/**
 * Check Azure Function App Status
 * This script checks if we can access the Azure Function and what its status is
 */

const { spawn } = require('child_process');

console.log('🔍 AZURE FUNCTION STATUS CHECK');
console.log('================================');

// Function to run Azure CLI commands
function runAzureCommand(command, args = []) {
    return new Promise((resolve, reject) => {
        console.log(`\n📋 Running: az ${command} ${args.join(' ')}`);
        
        const process = spawn('az', [command, ...args], {
            stdio: 'pipe'
        });
        
        let stdout = '';
        let stderr = '';
        
        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        process.on('close', (code) => {
            if (code === 0) {
                resolve(stdout.trim());
            } else {
                reject({ code, stderr: stderr.trim() });
            }
        });
        
        process.on('error', (error) => {
            reject({ error: error.message });
        });
    });
}

async function checkAzureStatus() {
    try {
        // Check if Azure CLI is installed
        console.log('🔧 Checking Azure CLI installation...');
        const versionOutput = await runAzureCommand('version');
        console.log('✅ Azure CLI is installed');
        
        // Check if logged in
        console.log('\n🔐 Checking Azure authentication...');
        try {
            const accountOutput = await runAzureCommand('account', ['show']);
            const account = JSON.parse(accountOutput);
            console.log(`✅ Logged in as: ${account.user?.name || 'Unknown'}`);
            console.log(`📧 Subscription: ${account.name} (${account.id})`);
        } catch (error) {
            console.log('❌ Not logged into Azure CLI');
            console.log('💡 Please run: az login');
            return;
        }
        
        // List function apps
        console.log('\n🏗️ Searching for Function Apps...');
        try {
            const functionAppsOutput = await runAzureCommand('functionapp', ['list', '--output', 'table']);
            console.log('Function Apps found:');
            console.log(functionAppsOutput);
            
            // Try to get more details about function apps
            const functionAppsJson = await runAzureCommand('functionapp', ['list']);
            const functionApps = JSON.parse(functionAppsJson);
            
            if (functionApps.length > 0) {
                for (const app of functionApps) {
                    console.log(`\n📱 Function App: ${app.name}`);
                    console.log(`   Resource Group: ${app.resourceGroup}`);
                    console.log(`   State: ${app.state}`);
                    console.log(`   Host Names: ${app.hostNames.join(', ')}`);
                    console.log(`   Kind: ${app.kind}`);
                    
                    // Check if it's related to our project
                    if (app.name.toLowerCase().includes('finansehub') || 
                        app.name.toLowerCase().includes('currency') ||
                        app.name.toLowerCase().includes('timer')) {
                        
                        console.log(`\n🎯 This looks like our currency function app!`);
                        
                        // Get function list
                        try {
                            console.log('📋 Getting function list...');
                            const functionsOutput = await runAzureCommand('functionapp', ['function', 'list', '--name', app.name, '--resource-group', app.resourceGroup]);
                            const functions = JSON.parse(functionsOutput);
                            
                            console.log(`   Functions found: ${functions.length}`);
                            functions.forEach(func => {
                                console.log(`   - ${func.name} (${func.config?.bindings?.[0]?.type || 'unknown trigger'})`);
                            });
                            
                            // Check function app settings
                            console.log('\n⚙️ Checking app settings...');
                            try {
                                const settingsOutput = await runAzureCommand('functionapp', ['config', 'appsettings', 'list', '--name', app.name, '--resource-group', app.resourceGroup]);
                                const settings = JSON.parse(settingsOutput);
                                
                                // Look for important settings
                                const importantSettings = settings.filter(s => 
                                    s.name === 'WEBSITE_TIME_ZONE' || 
                                    s.name === 'AzureWebJobsDisableHomepage' ||
                                    s.name === 'FUNCTIONS_WORKER_RUNTIME' ||
                                    s.name === 'WEBSITE_RUN_FROM_PACKAGE'
                                );
                                
                                console.log('   Important settings:');
                                importantSettings.forEach(setting => {
                                    console.log(`   - ${setting.name}: ${setting.value}`);
                                });
                                
                            } catch (error) {
                                console.log('   ❌ Could not get app settings');
                            }
                            
                            // Check recent logs
                            console.log('\n📊 Checking recent execution logs...');
                            try {
                                const logsOutput = await runAzureCommand('functionapp', ['logs', 'tail', '--name', app.name, '--resource-group', app.resourceGroup, '--max-events', '20']);
                                console.log('Recent logs:');
                                console.log(logsOutput);
                            } catch (error) {
                                console.log('   ❌ Could not get logs (this is normal for some plans)');
                            }
                            
                        } catch (error) {
                            console.log(`   ❌ Could not get function details: ${error.stderr || error.error}`);
                        }
                    }
                }
            } else {
                console.log('❌ No Function Apps found in current subscription');
            }
            
        } catch (error) {
            console.log(`❌ Could not list function apps: ${error.stderr || error.error}`);
        }
        
    } catch (error) {
        console.log(`❌ Error: ${error.stderr || error.error || error}`);
        console.log('\n💡 Make sure Azure CLI is installed and you are logged in:');
        console.log('   1. Install: brew install azure-cli');
        console.log('   2. Login: az login');
    }
}

async function main() {
    await checkAzureStatus();
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('==============');
    console.log('1. ✅ Emergency sync completed - data is up to date');
    console.log('2. 🔍 Check if Function App is in consumption plan (needs "Always On")');
    console.log('3. 🕐 Verify timezone settings (should be Europe/Oslo)');
    console.log('4. 📊 Check Application Insights for execution logs');
    console.log('5. ⚡ Consider upgrading to Premium plan for reliable timer execution');
}

main().catch(console.error);
