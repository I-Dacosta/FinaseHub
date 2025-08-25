import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

class ConfigService {
  private static instance: ConfigService;
  private secretClient: SecretClient | null = null;
  private secrets: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public async initializeKeyVault(keyVaultUrl: string): Promise<void> {
    try {
      const credential = new DefaultAzureCredential();
      this.secretClient = new SecretClient(keyVaultUrl, credential);
    } catch (error) {
      console.warn('Failed to initialize Key Vault, falling back to environment variables:', error);
    }
  }

  public async getSecret(secretName: string): Promise<string | undefined> {
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
      } catch (error) {
        console.warn(`Failed to get secret ${secretName} from Key Vault:`, error);
      }
    }

    return undefined;
  }

  public async getDatabaseUrl(): Promise<string> {
    const dbUrl = await this.getSecret('DATABASE_URL') || await this.getSecret('DATABASE-URL');
    if (!dbUrl) {
      throw new Error('DATABASE_URL not found in environment variables or Key Vault');
    }
    return dbUrl;
  }

  public async getPowerBIConfig() {
    return {
      tenantId: await this.getSecret('PBI_TENANT_ID') || await this.getSecret('PBI-TENANT-ID'),
      clientId: await this.getSecret('PBI_CLIENT_ID') || await this.getSecret('PBI-CLIENT-ID'),
      clientSecret: await this.getSecret('PBI_CLIENT_SECRET') || await this.getSecret('PBI-CLIENT-SECRET'),
      groupId: await this.getSecret('PBI_GROUP_ID') || await this.getSecret('PBI-GROUP-ID'),
      datasetId: await this.getSecret('PBI_DATASET_ID') || await this.getSecret('PBI-DATASET-ID'),
    };
  }
}

export const configService = ConfigService.getInstance();
