"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configService = void 0;
const identity_1 = require("@azure/identity");
const keyvault_secrets_1 = require("@azure/keyvault-secrets");
class ConfigService {
    constructor() {
        this.secretClient = null;
        this.secrets = new Map();
    }
    static getInstance() {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }
    async initializeKeyVault(keyVaultUrl) {
        try {
            const credential = new identity_1.DefaultAzureCredential();
            this.secretClient = new keyvault_secrets_1.SecretClient(keyVaultUrl, credential);
        }
        catch (error) {
            console.warn('Failed to initialize Key Vault, falling back to environment variables:', error);
        }
    }
    async getSecret(secretName) {
        // Try to get from environment variables first
        const envValue = process.env[secretName];
        if (envValue) {
            return envValue;
        }
        // Try to get from Key Vault if available
        if (this.secretClient) {
            try {
                if (this.secrets.has(secretName)) {
                    return this.secrets.get(secretName);
                }
                const secret = await this.secretClient.getSecret(secretName);
                if (secret.value) {
                    this.secrets.set(secretName, secret.value);
                    return secret.value;
                }
            }
            catch (error) {
                console.warn(`Failed to get secret ${secretName} from Key Vault:`, error);
            }
        }
        return undefined;
    }
    async getDatabaseUrl() {
        const dbUrl = await this.getSecret('DATABASE_URL') || await this.getSecret('DATABASE-URL');
        if (!dbUrl) {
            throw new Error('DATABASE_URL not found in environment variables or Key Vault');
        }
        return dbUrl;
    }
    async getPowerBIConfig() {
        return {
            tenantId: await this.getSecret('PBI_TENANT_ID') || await this.getSecret('PBI-TENANT-ID'),
            clientId: await this.getSecret('PBI_CLIENT_ID') || await this.getSecret('PBI-CLIENT-ID'),
            clientSecret: await this.getSecret('PBI_CLIENT_SECRET') || await this.getSecret('PBI-CLIENT-SECRET'),
            groupId: await this.getSecret('PBI_GROUP_ID') || await this.getSecret('PBI-GROUP-ID'),
            datasetId: await this.getSecret('PBI_DATASET_ID') || await this.getSecret('PBI-DATASET-ID'),
        };
    }
}
exports.configService = ConfigService.getInstance();
