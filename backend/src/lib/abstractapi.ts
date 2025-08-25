import axios from 'axios';
import { format, parseISO } from 'date-fns';

export interface AbstractExchangeRate {
  base: string;
  last_updated: number;
  exchange_rates: Record<string, number>;
}

export interface CurrencyRate {
  date: string;
  base: string;
  quote: string;
  value: number;
  src: string;
}

export class AbstractAPIClient {
  private apiKey: string;
  private baseUrl = 'https://exchange-rates.abstractapi.com/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ABSTRACT_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Abstract API key is required');
    }
  }

  /**
   * Get live exchange rates from Abstract API
   */
  async getLiveRates(base: string = 'USD', target?: string): Promise<AbstractExchangeRate> {
    try {
      const params: Record<string, string> = {
        api_key: this.apiKey,
        base: base
      };

      if (target) {
        params.target = target;
      }

      const response = await axios.get(`${this.baseUrl}/live`, {
        params,
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`Abstract API error: ${error.response?.status} - ${error.message}`);
        throw new Error(`Failed to fetch exchange rates: ${error.response?.status || 'Network error'}`);
      }
      throw error;
    }
  }

  /**
   * Get specific currency rate for CLP to NOK via USD
   */
  async getChileanPesoRate(date?: string): Promise<CurrencyRate | null> {
    try {
      // Get USD rates for both NOK and CLP
      const rates = await this.getLiveRates('USD', 'NOK,CLP');
      
      if (!rates.exchange_rates.NOK || !rates.exchange_rates.CLP) {
        throw new Error('Missing NOK or CLP rates in response');
      }

      // Calculate CLP to NOK rate via USD
      // 1 CLP = (1/CLP_to_USD) * USD_to_NOK
      const usdToNok = rates.exchange_rates.NOK;
      const usdToClp = rates.exchange_rates.CLP;
      const clpToNok = usdToNok / usdToClp;

      const currentDate = date || format(new Date(), 'yyyy-MM-dd');

      return {
        date: currentDate,
        base: 'CLP',
        quote: 'NOK',
        value: clpToNok,
        src: 'ABSTRACT'
      };
    } catch (error) {
      console.error('Error fetching Chilean Peso rate:', error);
      return null;
    }
  }

  /**
   * Test API connectivity and usage
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const rates = await this.getLiveRates('USD', 'NOK');
      return {
        success: true,
        message: `Successfully connected. USD to NOK: ${rates.exchange_rates.NOK}`
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default AbstractAPIClient;
