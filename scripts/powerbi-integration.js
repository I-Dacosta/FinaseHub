#!/usr/bin/env node

/**
 * Power BI Integration Script for Norwegian Financial Data
 * 
 * This script connects to your existing Power BI workspace and dataset
 * to integrate with the Norwegian financial data from our Azure Function App.
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
    
    // Azure Function App endpoints
    functionAppUrl: 'https://func-vh-b76k2jz5hzgzi.azurewebsites.net',
    
    // Power BI API endpoints
    powerBiApiUrl: 'https://api.powerbi.com/v1.0/myorg'
};

class PowerBIIntegration {
    constructor() {
        this.accessToken = null;
    }

    /**
     * Get OAuth2 access token for Power BI API
     */
    async getAccessToken() {
        try {
            const tokenUrl = `https://login.microsoftonline.com/${CONFIG.tenantId}/oauth2/v2.0/token`;
            
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', CONFIG.clientId);
            params.append('client_secret', CONFIG.clientSecret);
            params.append('scope', 'https://analysis.windows.net/powerbi/api/.default');

            const response = await axios.post(tokenUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            this.accessToken = response.data.access_token;
            console.log('✅ Successfully authenticated with Power BI');
            return this.accessToken;
        } catch (error) {
            console.error('❌ Failed to get Power BI access token:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get headers for Power BI API requests
     */
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Get information about the workspace and dataset
     */
    async getWorkspaceInfo() {
        try {
            const workspaceUrl = `${CONFIG.powerBiApiUrl}/groups/${CONFIG.groupId}`;
            const datasetUrl = `${CONFIG.powerBiApiUrl}/groups/${CONFIG.groupId}/datasets/${CONFIG.datasetId}`;

            const [workspaceResponse, datasetResponse] = await Promise.all([
                axios.get(workspaceUrl, { headers: this.getHeaders() }),
                axios.get(datasetUrl, { headers: this.getHeaders() })
            ]);

            console.log('📊 Workspace Info:');
            console.log(`   Name: ${workspaceResponse.data.name}`);
            console.log(`   Type: ${workspaceResponse.data.type}`);
            console.log(`   State: ${workspaceResponse.data.state}`);

            console.log('\n📈 Dataset Info:');
            console.log(`   Name: ${datasetResponse.data.name}`);
            console.log(`   Data Source Type: ${datasetResponse.data.datasources?.[0]?.datasourceType || 'N/A'}`);
            console.log(`   Configuration: ${datasetResponse.data.configuredBy || 'N/A'}`);

            return {
                workspace: workspaceResponse.data,
                dataset: datasetResponse.data
            };
        } catch (error) {
            console.error('❌ Failed to get workspace info:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Test connection to our Norwegian financial data API
     */
    async testDataConnection() {
        try {
            console.log('\n🔗 Testing connection to Norwegian financial data...');
            
            const endpoints = [
                { name: 'Data Summary', path: '/api/dataSummary' },
                { name: 'Latest Currency Rates', path: '/api/currencyData?latest=true&limit=5' },
                { name: 'Latest Interest Rates', path: '/api/seriesData?series=STYRINGSRENTE&latest=true' }
            ];

            for (const endpoint of endpoints) {
                try {
                    const response = await axios.get(`${CONFIG.functionAppUrl}${endpoint.path}`);
                    console.log(`   ✅ ${endpoint.name}: ${response.status} - ${JSON.stringify(response.data).substring(0, 100)}...`);
                } catch (error) {
                    console.log(`   ❌ ${endpoint.name}: ${error.response?.status || 'ERROR'} - ${error.message}`);
                }
            }
        } catch (error) {
            console.error('❌ Data connection test failed:', error.message);
        }
    }

    /**
     * Create or update dataset tables with Norwegian schema
     */
    async setupNorwegianDataSchema() {
        try {
            console.log('\n🏗️  Setting up Norwegian data schema...');

            // Define Norwegian table schema based on our database views
            const tables = [
                {
                    name: 'Valutakurser',
                    columns: [
                        { name: 'dato', dataType: 'DateTime' },
                        { name: 'valuta_kode', dataType: 'String' },
                        { name: 'valuta_navn', dataType: 'String' },
                        { name: 'kurs', dataType: 'Double' },
                        { name: 'enhet', dataType: 'Int64' },
                        { name: 'opprettet', dataType: 'DateTime' }
                    ]
                },
                {
                    name: 'Renter',
                    columns: [
                        { name: 'dato', dataType: 'DateTime' },
                        { name: 'serie_navn', dataType: 'String' },
                        { name: 'beskrivelse', dataType: 'String' },
                        { name: 'verdi', dataType: 'Double' },
                        { name: 'opprettet', dataType: 'DateTime' }
                    ]
                },
                {
                    name: 'SisteKurser',
                    columns: [
                        { name: 'valuta_kode', dataType: 'String' },
                        { name: 'valuta_navn', dataType: 'String' },
                        { name: 'siste_kurs', dataType: 'Double' },
                        { name: 'siste_dato', dataType: 'DateTime' },
                        { name: 'enhet', dataType: 'Int64' }
                    ]
                }
            ];

            // Note: In a real implementation, you would use the Power BI REST API
            // to create/update dataset schema. This requires specific permissions
            // and careful handling of existing data.
            
            console.log('📋 Norwegian Data Schema:');
            tables.forEach(table => {
                console.log(`\n   📊 ${table.name}:`);
                table.columns.forEach(col => {
                    console.log(`      • ${col.name} (${col.dataType})`);
                });
            });

            console.log('\n💡 To implement schema updates, use Power BI REST API:');
            console.log(`   PUT ${CONFIG.powerBiApiUrl}/groups/${CONFIG.groupId}/datasets/${CONFIG.datasetId}/tables/{tableName}`);
            
            return tables;
        } catch (error) {
            console.error('❌ Failed to setup schema:', error.message);
            throw error;
        }
    }

    /**
     * Create Power BI data refresh schedule
     */
    async setupDataRefresh() {
        try {
            console.log('\n⏰ Setting up data refresh schedule...');

            const refreshUrl = `${CONFIG.powerBiApiUrl}/groups/${CONFIG.groupId}/datasets/${CONFIG.datasetId}/refreshSchedule`;
            
            // Get current refresh schedule
            const currentSchedule = await axios.get(refreshUrl, { headers: this.getHeaders() });
            console.log('📅 Current refresh schedule:', JSON.stringify(currentSchedule.data, null, 2));

            // Example schedule configuration (daily at 6 AM)
            const scheduleConfig = {
                days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                times: ['06:00'],
                enabled: true,
                localTimeZoneId: 'W. Europe Standard Time'
            };

            console.log('\n💡 Recommended refresh schedule:');
            console.log(`   Days: ${scheduleConfig.days.join(', ')}`);
            console.log(`   Time: ${scheduleConfig.times[0]} (${scheduleConfig.localTimeZoneId})`);
            console.log('\n   To update: Use Power BI Service or REST API PATCH request');

            return scheduleConfig;
        } catch (error) {
            console.error('❌ Failed to setup refresh schedule:', error.response?.data || error.message);
        }
    }

    /**
     * Trigger manual data refresh
     */
    async triggerRefresh() {
        try {
            console.log('\n🔄 Triggering manual data refresh...');

            const refreshUrl = `${CONFIG.powerBiApiUrl}/groups/${CONFIG.groupId}/datasets/${CONFIG.datasetId}/refreshes`;
            
            const response = await axios.post(refreshUrl, {}, { headers: this.getHeaders() });
            
            console.log('✅ Refresh triggered successfully');
            console.log('   Status:', response.status);
            console.log('   Location:', response.headers.location);

            // Check refresh status
            setTimeout(async () => {
                try {
                    const statusResponse = await axios.get(refreshUrl, { headers: this.getHeaders() });
                    const latestRefresh = statusResponse.data.value[0];
                    console.log(`\n📊 Latest refresh status: ${latestRefresh.status}`);
                    console.log(`   Started: ${latestRefresh.startTime}`);
                    console.log(`   Ended: ${latestRefresh.endTime || 'In progress...'}`);
                } catch (error) {
                    console.log('⚠️  Could not check refresh status');
                }
            }, 5000);

            return response.data;
        } catch (error) {
            console.error('❌ Failed to trigger refresh:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Main integration workflow
     */
    async run() {
        try {
            console.log('🚀 Starting Power BI Integration for Norwegian Financial Data\n');
            console.log('🔧 Configuration:');
            console.log(`   Function App: ${CONFIG.functionAppUrl}`);
            console.log(`   Workspace ID: ${CONFIG.groupId}`);
            console.log(`   Dataset ID: ${CONFIG.datasetId}\n`);

            // Step 1: Authenticate
            await this.getAccessToken();

            // Step 2: Get workspace and dataset info
            await this.getWorkspaceInfo();

            // Step 3: Test data connection
            await this.testDataConnection();

            // Step 4: Setup Norwegian data schema
            await this.setupNorwegianDataSchema();

            // Step 5: Setup data refresh
            await this.setupDataRefresh();

            // Step 6: Trigger refresh (optional)
            const shouldRefresh = process.argv.includes('--refresh');
            if (shouldRefresh) {
                await this.triggerRefresh();
            }

            console.log('\n🎉 Power BI integration setup completed!');
            console.log('\n📋 Next steps:');
            console.log('   1. Configure data source connection in Power BI Service');
            console.log('   2. Map Norwegian database views to dataset tables');
            console.log('   3. Create dashboards with Norwegian terminology');
            console.log('   4. Set up automated refresh schedule');
            console.log('\n🔗 Useful links:');
            console.log(`   • Power BI Service: https://app.powerbi.com/groups/${CONFIG.groupId}`);
            console.log(`   • API Documentation: https://func-vh-b76k2jz5hzgzi.azurewebsites.net/api/monitor`);

        } catch (error) {
            console.error('\n💥 Integration failed:', error.message);
            process.exit(1);
        }
    }
}

// Run the integration
if (require.main === module) {
    const integration = new PowerBIIntegration();
    integration.run();
}

module.exports = PowerBIIntegration;
