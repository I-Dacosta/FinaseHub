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
  private lastRequestTime: number = 0;
  private readonly minRequestInterval = 1100; // 1.1 seconds to be safe with rate limiting

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ABSTRACT_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Abstract API key is required');
    }
  }

  /**
   * Rate limiting helper - ensures at least 1.1 seconds between requests
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Get live exchange rates from Abstract API
   */
  async getLiveRates(base: string = 'USD', target?: string): Promise<AbstractExchangeRate> {
    try {
      await this.enforceRateLimit();

      const params: Record<string, string> = {
        api_key: this.apiKey,
        base: base
      };

      if (target) {
        params.target = target;
      }

      console.log(`Fetching Abstract API rates: ${base} -> ${target || 'ALL'}`);

      const response = await axios.get(`${this.baseUrl}/live`, {
        params,
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Handle rate limiting specifically
        if (error.response?.status === 429) {
          console.error('Abstract API rate limit exceeded. Free plan allows 1 request/second.');
          throw new Error('Rate limit exceeded - please try again later');
        }
        console.error(`Abstract API error: ${error.response?.status} - ${error.message}`);
        throw new Error(`Failed to fetch exchange rates: ${error.response?.status || 'Network error'}`);
      }
      throw error;
    }
  }

  /**
   * Get historical exchange rates (beta endpoint)
   */
  async getHistoricalRates(base: string = 'USD', target?: string, date?: string): Promise<AbstractExchangeRate & { date: string }> {
    try {
      await this.enforceRateLimit();

      const params: Record<string, string> = {
        api_key: this.apiKey,
        base: base,
        date: date || format(new Date(), 'yyyy-MM-dd')
      };

      if (target) {
        params.target = target;
      }

      console.log(`Fetching Abstract API historical rates: ${base} -> ${target || 'ALL'} for ${params.date}`);

      const response = await axios.get(`${this.baseUrl}/historical`, {
        params,
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Handle rate limiting specifically
        if (error.response?.status === 429) {
          console.error('Abstract API rate limit exceeded. Free plan allows 1 request/second.');
          throw new Error('Rate limit exceeded - please try again later');
        }
        console.error(`Abstract API historical error: ${error.response?.status} - ${error.message}`);
        throw new Error(`Failed to fetch historical rates: ${error.response?.status || 'Network error'}`);
      }
      throw error;
    }
  }

  /**
   * Get specific currency rate for CLP to NOK via USD with proper rate limiting
   * This method should only be called once per day during scheduled sync
   */
  async getChileanPesoRate(date?: string): Promise<CurrencyRate | null> {
    try {
      const targetDate = date || format(new Date(), 'yyyy-MM-dd');
      
      // Use historical endpoint for more reliable data if date is provided
      const useHistorical = date && date !== format(new Date(), 'yyyy-MM-dd');
      
      let rates: AbstractExchangeRate;
      
      if (useHistorical) {
        // Use historical endpoint for past dates
        rates = await this.getHistoricalRates('USD', 'NOK,CLP', date);
      } else {
        // Use live endpoint for today's rates
        rates = await this.getLiveRates('USD', 'NOK,CLP');
      }
      
      if (!rates.exchange_rates.NOK || !rates.exchange_rates.CLP) {
        throw new Error('Missing NOK or CLP rates in response');
      }

      // Calculate CLP to NOK rate via USD
      // 1 CLP = (1/CLP_to_USD) * USD_to_NOK
      const usdToNok = rates.exchange_rates.NOK;
      const usdToClp = rates.exchange_rates.CLP;
      const clpToNok = usdToNok / usdToClp;

      console.log(`CLP/NOK calculation: USD->NOK=${usdToNok}, USD->CLP=${usdToClp}, CLP->NOK=${clpToNok}`);

      return {
        date: targetDate,
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
   * Get Chilean Peso rates for multiple dates (use sparingly due to rate limits)
   */
  async getChileanPesoRatesForDateRange(startDate: string, endDate: string): Promise<CurrencyRate[]> {
    const rates: CurrencyRate[] = [];
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    console.warn('Getting multiple CLP rates - this will use multiple API calls and may hit rate limits');
    
    let currentDate = start;
    while (currentDate <= end) {
      try {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const rate = await this.getChileanPesoRate(dateStr);
        
        if (rate) {
          rates.push(rate);
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        
        // Ensure we don't hit rate limits
        await new Promise(resolve => setTimeout(resolve, this.minRequestInterval));
        
      } catch (error) {
        console.error(`Failed to get CLP rate for ${format(currentDate, 'yyyy-MM-dd')}:`, error);
        // Continue with next date instead of failing completely
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    return rates;
  }

  /**
   * Test API connectivity and usage
   */
  async testConnection(): Promise<{ success: boolean; message: string; usage?: any }> {
    try {
      const rates = await this.getLiveRates('USD', 'NOK');
      return {
        success: true,
        message: `Successfully connected. USD to NOK: ${rates.exchange_rates.NOK}`,
        usage: { last_updated: rates.last_updated }
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if we should update CLP rate based on time
   * Only update once per day, preferably at 17:30 Norwegian time
   */
  static shouldUpdateCLP(): boolean {
    const now = new Date();
    const norwayTime = new Date(now.toLocaleString('en-US', {timeZone: 'Europe/Oslo'}));
    const hour = norwayTime.getHours();
    const minute = norwayTime.getMinutes();
    
    // Update between 17:30 and 18:00 Norwegian time
    return hour === 17 && minute >= 30;
  }
}

export default AbstractAPIClient;
