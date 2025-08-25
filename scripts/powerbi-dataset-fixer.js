#!/usr/bin/env node

/**
 * Power BI Dataset Configuration Tool
 * Fixes datasource configuration and forces refresh
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
    powerBiApiUrl: 'https://api.powerbi.com/v1.0/myorg',
    
    // Database connection details
    databaseServer: process.env.DB_HOST,
    databaseName: process.env.DB_NAME,
    databaseUser: 'finansehub_admin',
    databasePassword: 'OAsd2amudO38Pn6k9kt7t0NmS'
};

class PowerBIDatasetFixer {
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

    async getDatasources() {
        try {
            console.log('\n🔍 Checking dataset datasources...');
            const datasourceUrl = `${CONFIG.powerBiApiUrl}/groups/${CONFIG.groupId}/datasets/${CONFIG.datasetId}/datasources`;
            
            const response = await axios.get(datasourceUrl, { headers: this.getHeaders() });
            const datasources = response.data.value || [];
            
            console.log(`📊 Found ${datasources.length} datasource(s):`);
            datasources.forEach((ds, index) => {
                console.log(`   ${index + 1}. Type: ${ds.datasourceType}`);
                console.log(`      ID: ${ds.datasourceId}`);
                console.log(`      Connection: ${JSON.stringify(ds.connectionDetails, null, 2)}`);
            });
            
            return datasources;
        } catch (error) {
            console.error('❌ Failed to get datasources:', error.response?.data || error.message);
            return [];
        }
    }

    async getDatasetTables() {
        try {
            console.log('\n📋 Checking dataset tables...');
            const tablesUrl = `${CONFIG.powerBiApiUrl}/groups/${CONFIG.groupId}/datasets/${CONFIG.datasetId}/tables`;
            
            const response = await axios.get(tablesUrl, { headers: this.getHeaders() });
            const tables = response.data.value || [];
            
            console.log(`📊 Found ${tables.length} table(s):`);
            tables.forEach((table, index) => {
                console.log(`   ${index + 1}. ${table.name} (${table.columns?.length || 0} columns)`);
            });
            
            return tables;
        } catch (error) {
            console.error('❌ Failed to get tables:', error.response?.data || error.message);
            return [];
        }
    }

    async updateDatasourceCredentials() {
        try {
            console.log('\n🔑 Updating datasource credentials...');
            
            // First get the datasources
            const datasources = await this.getDatasources();
            
            if (datasources.length === 0) {
                console.log('⚠️  No datasources found - dataset may need to be recreated');
                return false;
            }

            for (const datasource of datasources) {
                if (datasource.datasourceType === 'PostgreSql') {
                    const credentialsUrl = `${CONFIG.powerBiApiUrl}/groups/${CONFIG.groupId}/datasets/${CONFIG.datasetId}/datasources/${datasource.datasourceId}`;
                    
                    const credentialDetails = {
                        credentialType: 'Basic',
                        credentials: {
                            username: CONFIG.databaseUser,
                            password: CONFIG.databasePassword
                        },
                        encryptedConnection: 'Encrypted',
                        encryptionAlgorithm: 'None',
                        privacyLevel: 'Organizational'
                    };

                    try {
                        const response = await axios.patch(credentialsUrl, credentialDetails, { headers: this.getHeaders() });
                        console.log(`✅ Updated credentials for datasource ${datasource.datasourceId}`);
                    } catch (error) {
                        console.log(`⚠️  Could not update credentials: ${error.response?.data?.error?.message || error.message}`);
                    }
                }
            }
            
            return true;
        } catch (error) {
            console.error('❌ Failed to update credentials:', error.response?.data || error.message);
            return false;
        }
    }

    async takeOverDataset() {
        try {
            console.log('\n🎯 Taking over dataset...');
            const takeOverUrl = `${CONFIG.powerBiApiUrl}/groups/${CONFIG.groupId}/datasets/${CONFIG.datasetId}/Default.TakeOver`;
            
            const response = await axios.post(takeOverUrl, {}, { headers: this.getHeaders() });
            console.log('✅ Successfully took over dataset');
            return true;
        } catch (error) {
            console.log(`⚠️  Take over failed (may already be owner): ${error.response?.data?.error?.message || error.message}`);
            return false;
        }
    }

    async deleteAndRecreateDataset() {
        try {
            console.log('\n🔄 Creating new dataset with Norwegian views...');
            
            const newDatasetUrl = `${CONFIG.powerBiApiUrl}/groups/${CONFIG.groupId}/datasets`;
            
            const datasetDefinition = {
                name: "Norwegian Financial Data - Fresh",
                tables: [
                    {
                        name: "valutakurser_norsk",
                        columns: [
                            { name: "dato", dataType: "DateTime" },
                            { name: "valuta_kode", dataType: "String" },
                            { name: "valuta_navn", dataType: "String" },
                            { name: "kurs", dataType: "Double" },
                            { name: "mot_valuta", dataType: "String" }
                        ]
                    },
                    {
                        name: "renter_norsk", 
                        columns: [
                            { name: "dato", dataType: "DateTime" },
                            { name: "serie_navn", dataType: "String" },
                            { name: "beskrivelse", dataType: "String" },
                            { name: "verdi", dataType: "Double" }
                        ]
                    },
                    {
                        name: "siste_kurser_norsk",
                        columns: [
                            { name: "valuta_kode", dataType: "String" },
                            { name: "valuta_navn", dataType: "String" },
                            { name: "siste_kurs", dataType: "Double" },
                            { name: "siste_dato", dataType: "DateTime" }
                        ]
                    }
                ],
                datasources: [
                    {
                        datasourceType: "PostgreSql",
                        connectionDetails: {
                            server: CONFIG.databaseServer,
                            database: CONFIG.databaseName
                        }
                    }
                ]
            };

            console.log('📋 Dataset definition:');
            console.log(JSON.stringify(datasetDefinition, null, 2));
            
            console.log('\n💡 For manual setup, use Power BI Desktop:');
            console.log('1. Open Power BI Desktop');
            console.log('2. Get Data → PostgreSQL');
            console.log(`3. Server: ${CONFIG.databaseServer}`);
            console.log(`4. Database: ${CONFIG.databaseName}`);
            console.log('5. Select Norwegian views: valutakurser_norsk, renter_norsk, etc.');
            console.log('6. Publish to ValutaHub workspace');
            
            return datasetDefinition;
        } catch (error) {
            console.error('❌ Failed to create dataset:', error.response?.data || error.message);
            return null;
        }
    }

    async forceRefreshWithRetry() {
        try {
            console.log('\n🔄 Force triggering refresh with retry...');
            
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    console.log(`   Attempt ${attempt}/3...`);
                    
                    const refreshUrl = `${CONFIG.powerBiApiUrl}/groups/${CONFIG.groupId}/datasets/${CONFIG.datasetId}/refreshes`;
                    const response = await axios.post(refreshUrl, {}, { headers: this.getHeaders() });
                    
                    console.log(`✅ Refresh triggered successfully (attempt ${attempt})`);
                    console.log(`📍 Request ID: ${response.headers['requestid'] || 'N/A'}`);
                    return true;
                } catch (error) {
                    console.log(`   ❌ Attempt ${attempt} failed: ${error.response?.data?.error?.message || error.message}`);
                    
                    if (attempt < 3) {
                        console.log('   ⏳ Waiting 10 seconds before retry...');
                        await new Promise(resolve => setTimeout(resolve, 10000));
                    }
                }
            }
            
            return false;
        } catch (error) {
            console.error('❌ Force refresh failed:', error.message);
            return false;
        }
    }

    async run() {
        try {
            console.log('🚀 Power BI Dataset Configuration Fix\n');
            console.log(`📊 Dataset: FinanseHub Currency & Interest Rates`);
            console.log(`🏢 Workspace: ValutaHub`);
            console.log(`🕐 Current time: ${new Date().toLocaleString('no-NO', { timeZone: 'Europe/Oslo' })}\n`);

            // Step 1: Authenticate
            const authSuccess = await this.authenticate();
            if (!authSuccess) return false;

            // Step 2: Check datasources
            await this.getDatasources();

            // Step 3: Check tables
            await this.getDatasetTables();

            // Step 4: Try to take over dataset
            await this.takeOverDataset();

            // Step 5: Update credentials
            await this.updateDatasourceCredentials();

            // Step 6: Force refresh with retry
            const refreshSuccess = await this.forceRefreshWithRetry();

            if (!refreshSuccess) {
                console.log('\n💡 Manual solution needed:');
                await this.deleteAndRecreateDataset();
            }

            console.log('\n🔗 Check Power BI Service:');
            console.log(`   https://app.powerbi.com/groups/${CONFIG.groupId}/datasets/${CONFIG.datasetId}/details`);

            return true;
        } catch (error) {
            console.error('\n💥 Configuration fix failed:', error.message);
            return false;
        }
    }
}

// Run the fixer
if (require.main === module) {
    const fixer = new PowerBIDatasetFixer();
    fixer.run();
}

module.exports = PowerBIDatasetFixer;
