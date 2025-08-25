"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PowerBIService = void 0;
const msal_node_1 = require("@azure/msal-node");
const axios_1 = __importDefault(require("axios"));
class PowerBIService {
    constructor(config) {
        this.config = config;
        this.clientApp = new msal_node_1.ConfidentialClientApplication({
            auth: {
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                authority: `https://login.microsoftonline.com/${config.tenantId}`
            }
        });
    }
    /**
     * Henter access token for Power BI API
     */
    async getAccessToken() {
        try {
            const clientCredentialRequest = {
                scopes: ['https://analysis.windows.net/powerbi/api/.default'],
            };
            const response = await this.clientApp.acquireTokenByClientCredential(clientCredentialRequest);
            if (!response?.accessToken) {
                throw new Error('Failed to acquire access token');
            }
            return response.accessToken;
        }
        catch (error) {
            console.error('Error getting access token:', error);
            throw error;
        }
    }
    /**
     * Trigger en dataset refresh i Power BI
     */
    async refreshDataset() {
        try {
            const accessToken = await this.getAccessToken();
            const url = `https://api.powerbi.com/v1.0/myorg/groups/${this.config.groupId}/datasets/${this.config.datasetId}/refreshes`;
            const response = await axios_1.default.post(url, {}, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('Power BI dataset refresh triggered successfully');
            return response.data;
        }
        catch (error) {
            console.error('Error triggering Power BI refresh:', error);
            throw error;
        }
    }
    /**
     * Sjekker status på siste refresh
     */
    async getRefreshHistory(top = 5) {
        try {
            const accessToken = await this.getAccessToken();
            const url = `https://api.powerbi.com/v1.0/myorg/groups/${this.config.groupId}/datasets/${this.config.datasetId}/refreshes?$top=${top}`;
            const response = await axios_1.default.get(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('Error getting refresh history:', error);
            throw error;
        }
    }
}
exports.PowerBIService = PowerBIService;
