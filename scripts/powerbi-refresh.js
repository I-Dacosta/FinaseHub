#!/usr/bin/env node

/**
 * Power BI Dataset Refresh Script
 * Refreshes the FinanseHub Currency & Interest Rates dataset with fresh Norwegian data
 */

const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration from environment variables
const CONFIG = {
    tenantId: process.env.PBI_TENANT_ID,
    clientId: process.env.PBI_CLIENT_ID,
    clientSecret: process.env.PBI_CLIENT_SECRET,
    groupId: process.env.PBI_GROUP_ID,
    datasetId: process.env.PBI_DATASET_ID,
    powerBiApiUrl: 'https://api.powerbi.com/v1.0/myorg'
};

class PowerBIRefresh {
    constructor() {
        this.accessToken = null;
    }

    async authenticate() {
        try {
            console.log('🔐 Authenticating with Power BI...');
            const tokenUrl = `https://login.microsoftonline.com/${CONFIG.tenantId}/oauth2/v2.0/token`;
            
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', CONFIG.clientId);
            params.append('client_secret', CONFIG.clientSecret);
            params.append('scope', 'https://analysis.windows.net/powerbi/api/.default');

            const response = await axios.post(tokenUrl, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            this.accessToken = response.data.access_token;
            console.log('✅ Successfully authenticated with Power BI');
            return true;
        } catch (error) {
            console.error('❌ Authentication failed:', error.response?.data || error.message);
            return false;
        }
    }

    getHeaders() {
        return {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
        };
    }

    async getDatasetInfo() {
        try {
            console.log('\n📊 Getting dataset information...');
            const datasetUrl = `${CONFIG.powerBiApiUrl}/groups/${CONFIG.groupId}/datasets/${CONFIG.datasetId}`;
            
            const response = await axios.get(datasetUrl, { headers: this.getHeaders() });
            const dataset = response.data;
            
            console.log(`📈 Dataset: ${dataset.name}`);
            console.log(`🔗 Workspace: ValutaHub (${CONFIG.groupId})`);
            console.log(`📅 Configure URL: https://app.powerbi.com/groups/${CONFIG.groupId}/datasets/${CONFIG.datasetId}/details`);
            
            return dataset;
        } catch (error) {
            console.error('❌ Failed to get dataset info:', error.response?.data || error.message);
            throw error;
        }
    }

    async checkRefreshHistory() {
        try {
            console.log('\n📜 Checking refresh history...');
            const refreshUrl = `${CONFIG.powerBiApiUrl}/groups/${CONFIG.groupId}/datasets/${CONFIG.datasetId}/refreshes`;
            
            const response = await axios.get(refreshUrl, { headers: this.getHeaders() });
            const refreshes = response.data.value || [];
            
            if (refreshes.length > 0) {
                const latestRefresh = refreshes[0];
                console.log(`📅 Last refresh: ${latestRefresh.startTime}`);
                console.log(`⚡ Status: ${latestRefresh.status}`);
                console.log(`⏱️  Duration: ${latestRefresh.endTime ? 
                    new Date(latestRefresh.endTime) - new Date(latestRefresh.startTime) + 'ms' : 'In progress...'}`);
            } else {
                console.log('📭 No previous refreshes found');
            }
            
            return refreshes;
        } catch (error) {
            console.error('❌ Failed to get refresh history:', error.response?.data || error.message);
        }
    }

    async triggerRefresh() {
        try {
            console.log('\n🔄 Triggering dataset refresh...');
            const refreshUrl = `${CONFIG.powerBiApiUrl}/groups/${CONFIG.groupId}/datasets/${CONFIG.datasetId}/refreshes`;
            
            // For service principal authentication, no notification options allowed
            const refreshBody = {};
            
            const response = await axios.post(refreshUrl, refreshBody, { headers: this.getHeaders() });
            
            console.log('✅ Refresh triggered successfully!');
            console.log(`📍 Request ID: ${response.headers['requestid'] || 'N/A'}`);
            console.log(`🔗 Monitor at: https://app.powerbi.com/groups/${CONFIG.groupId}/datasets/${CONFIG.datasetId}/details`);
            
            return response.headers.location;
        } catch (error) {
            console.error('❌ Failed to trigger refresh:', error.response?.data || error.message);
            throw error;
        }
    }

    async waitForRefresh(maxWaitMinutes = 10) {
        try {
            console.log(`\n⏳ Waiting for refresh to complete (max ${maxWaitMinutes} minutes)...`);
            const refreshUrl = `${CONFIG.powerBiApiUrl}/groups/${CONFIG.groupId}/datasets/${CONFIG.datasetId}/refreshes`;
            
            const startTime = Date.now();
            const maxWaitTime = maxWaitMinutes * 60 * 1000;
            
            while (Date.now() - startTime < maxWaitTime) {
                try {
                    const response = await axios.get(refreshUrl, { headers: this.getHeaders() });
                    const refreshes = response.data.value || [];
                    
                    if (refreshes.length > 0) {
                        const latestRefresh = refreshes[0];
                        
                        if (latestRefresh.status === 'Completed') {
                            console.log('🎉 Refresh completed successfully!');
                            console.log(`⏱️  Duration: ${latestRefresh.endTime ? 
                                Math.round((new Date(latestRefresh.endTime) - new Date(latestRefresh.startTime)) / 1000) + ' seconds' : 'Unknown'}`);
                            return true;
                        } else if (latestRefresh.status === 'Failed') {
                            console.log('❌ Refresh failed!');
                            console.log(`🔍 Error: ${latestRefresh.serviceExceptionJson || 'Unknown error'}`);
                            return false;
                        } else {
                            console.log(`⏳ Status: ${latestRefresh.status}... (waiting)`);
                        }
                    }
                } catch (error) {
                    console.log('⚠️  Error checking refresh status, retrying...');
                }
                
                // Wait 30 seconds before checking again
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
            
            console.log('⏰ Refresh timeout - check Power BI Service for status');
            return false;
        } catch (error) {
            console.error('❌ Error waiting for refresh:', error.message);
            return false;
        }
    }

    async run() {
        try {
            console.log('🚀 Power BI Dataset Refresh - Norwegian Financial Data\n');
            console.log(`📊 Dataset: FinanseHub Currency & Interest Rates`);
            console.log(`🏢 Workspace: ValutaHub`);
            console.log(`🕐 Current time: ${new Date().toLocaleString('no-NO', { timeZone: 'Europe/Oslo' })}\n`);

            // Step 1: Authenticate
            const authSuccess = await this.authenticate();
            if (!authSuccess) return false;

            // Step 2: Get dataset info
            await this.getDatasetInfo();

            // Step 3: Check refresh history
            await this.checkRefreshHistory();

            // Step 4: Trigger refresh
            await this.triggerRefresh();

            // Step 5: Wait for completion (optional)
            const shouldWait = process.argv.includes('--wait');
            if (shouldWait) {
                await this.waitForRefresh();
            } else {
                console.log('\n💡 Use --wait flag to monitor refresh completion');
                console.log('🔗 Or check status at: https://app.powerbi.com/groups/0953a26c-9b44-4504-8ebe-c96b03d22923/datasets/175f3bf5-fbaf-4d2b-bec7-b1006db5da1f/details');
            }

            console.log('\n🎯 Norwegian Data Available:');
            console.log('   • 6,600 valutakurser (currency rates)');
            console.log('   • 660 renter (interest rates)');
            console.log('   • Latest data from 2025-08-19');
            console.log('   • All tables with Norwegian column names');

            return true;
        } catch (error) {
            console.error('\n💥 Refresh failed:', error.message);
            return false;
        }
    }
}

// Run the refresh
if (require.main === module) {
    const refresh = new PowerBIRefresh();
    refresh.run();
}

module.exports = PowerBIRefresh;
