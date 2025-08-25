import axios from 'axios';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { format, parseISO } from 'date-fns';

export interface CurrencyRate {
  date: Date;
  base: string;
  quote: string;
  value: number;
}

export interface SeriesData {
  date: Date;
  series: string;
  label?: string;
  value: number;
}

export class NorgesBankClient {
  private readonly baseUrl = 'https://data.norges-bank.no/api';
  
  constructor() {}

  /**
   * Henter valutakurser fra Norges Bank using SDMX API
   */
  async getCurrencyRates(
    bases: string[],
    quote: string = 'NOK',
    startDate: string,
    endDate?: string
  ): Promise<CurrencyRate[]> {
    const results: CurrencyRate[] = [];
    
    // Process each currency separately to match SDMX format
    for (const base of bases) {
      try {
        // Build SDMX URL according to documentation: EXR/B.{BASE}.{QUOTE}.SP
        const url = `${this.baseUrl}/data/EXR/B.${base}.${quote}.SP`;
        
        const params: any = {
          format: 'csv',
          locale: 'no',
          bom: 'include',
          startPeriod: startDate
        };
        
        if (endDate) {
          params.endPeriod = endDate;
        }

        console.log(`Fetching currency rates for ${base}/${quote} from ${url}`);
        
        const response = await axios.get(url, {
          params,
          responseType: 'stream',
          timeout: 30000
        });

        const rates = await this.parseCurrencyCSV(response.data, base, quote);
        results.push(...rates);
        
        // Add delay between requests to avoid rate limiting
        if (bases.indexOf(base) < bases.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`Error fetching currency rates for ${base}/${quote}:`, error);
        if (axios.isAxiosError(error)) {
          console.error(`Status: ${error.response?.status}, Data:`, error.response?.data);
        }
        // Continue with other currencies instead of throwing
      }
    }
    
    return results;
  }

  /**
   * Henter renteserier fra Norges Bank using SDMX API
   */
  async getInterestRates(
    series: string,
    startDate: string,
    endDate?: string
  ): Promise<SeriesData[]> {
    try {
      let dataset = '';
      let seriesKey = '';
      
      // Map series according to actual Norges Bank SDMX structure
      switch (series) {
        case 'POLICY_RATE':
          dataset = 'IR';
          seriesKey = 'B.KPRA.OL.R';  // Updated based on actual API structure
          break;
        case 'NOWA':
          // NOWA might be in a different dataset or not available via SDMX
          dataset = 'IR';
          seriesKey = 'B.NOWA..'; 
          break;
        // Note: Government bonds might not be available via SDMX API
        // These remain for future compatibility if endpoints become available
        case 'GOV_BONDS_2Y':
          dataset = 'GOVT_GENERIC_RATES';
          seriesKey = 'B.2Y.GOV_BOND..';
          break;
        case 'GOV_BONDS_3Y':
          dataset = 'GOVT_GENERIC_RATES';
          seriesKey = 'B.3Y.GOV_BOND..';
          break;
        case 'GOV_BONDS_5Y':
          dataset = 'GOVT_GENERIC_RATES';
          seriesKey = 'B.5Y.GOV_BOND..';
          break;
        case 'GOV_BONDS_10Y':
          dataset = 'GOVT_GENERIC_RATES';
          seriesKey = 'B.10Y.GOV_BOND..';
          break;
        case 'GENERIC_RATES_3M':
          dataset = 'GOVT_GENERIC_RATES';
          seriesKey = 'B.3M.GENERIC..';
          break;
        case 'GENERIC_RATES_12M':
          dataset = 'GOVT_GENERIC_RATES';
          seriesKey = 'B.12M.GENERIC..';
          break;
        case 'GENERIC_RATES_7Y':
          dataset = 'GOVT_GENERIC_RATES';
          seriesKey = 'B.7Y.GENERIC..';
          break;
        default:
          throw new Error(`Unknown series: ${series}`);
      }

      // Build SDMX URL according to documentation
      const url = `${this.baseUrl}/data/${dataset}/${seriesKey}`;
      
      const params: any = {
        format: 'csv',
        locale: 'no', 
        bom: 'include',
        startPeriod: startDate
      };
      
      if (endDate) {
        params.endPeriod = endDate;
      }

      console.log(`Fetching interest rates for ${series} from ${url}`);

      const response = await axios.get(url, {
        params,
        responseType: 'stream',
        timeout: 30000
      });

      return await this.parseSeriesCSV(response.data, series);
    } catch (error) {
      console.error(`Error fetching ${series} rates:`, error);
      if (axios.isAxiosError(error)) {
        console.error(`Status: ${error.response?.status}, Data:`, error.response?.data);
      }
      throw error;
    }
  }

  private async parseCurrencyCSV(csvStream: Readable, base: string, quote: string): Promise<CurrencyRate[]> {
    return new Promise((resolve, reject) => {
      const results: CurrencyRate[] = [];
      
      csvStream
        .pipe(csv({ separator: ';' }))
        .on('data', (row: any) => {
          try {
            // Skip header rows and invalid data
            if (!row.TIME_PERIOD || row.TIME_PERIOD === 'TIME_PERIOD' || !row.OBS_VALUE) {
              return;
            }

            const date = parseISO(row.TIME_PERIOD);
            // Handle Norwegian decimal format (comma separator)
            const value = parseFloat(row.OBS_VALUE.replace(',', '.'));
            
            if (isNaN(value)) {
              return;
            }

            results.push({
              date,
              base,
              quote,
              value
            });
          } catch (error) {
            console.warn('Error parsing CSV row:', error, row);
          }
        })
        .on('end', () => {
          console.log(`Parsed ${results.length} currency rates for ${base}/${quote}`);
          resolve(results);
        })
        .on('error', (error: any) => {
          reject(error);
        });
    });
  }

  private async parseSeriesCSV(csvStream: Readable, series: string): Promise<SeriesData[]> {
    return new Promise((resolve, reject) => {
      const results: SeriesData[] = [];
      
      csvStream
        .pipe(csv({ separator: ',' }))  // Interest rates use comma separators
        .on('data', (row: any) => {
          try {
            // Skip header rows and invalid data
            if (!row.TIME_PERIOD || row.TIME_PERIOD === 'TIME_PERIOD' || !row.OBS_VALUE) {
              return;
            }

            const date = parseISO(row.TIME_PERIOD);
            // Handle Norwegian decimal format (comma separator)
            const value = parseFloat(row.OBS_VALUE.replace(',', '.'));
            
            if (isNaN(value)) {
              return;
            }

            results.push({
              date,
              series,
              label: row.TENOR || row.INSTRUMENT_TYPE || row.MATURITY || null,
              value
            });
          } catch (error) {
            console.warn('Error parsing CSV row:', error, row);
          }
        })
        .on('end', () => {
          console.log(`Parsed ${results.length} series points for ${series}`);
          resolve(results);
        })
        .on('error', (error: any) => {
          reject(error);
        });
    });
  }

  /**
   * Formatterer dato for SDMX API-kall
   */
  formatDate(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  /**
   * Builds SDMX URL for currency rates
   */
  buildCurrencyUrl(base: string, quote: string = 'NOK'): string {
    return `${this.baseUrl}/data/EXR/B.${base}.${quote}.SP`;
  }

  /**
   * Builds SDMX URL for interest rates
   */
  buildInterestRateUrl(dataset: string, seriesKey: string): string {
    return `${this.baseUrl}/data/${dataset}/${seriesKey}`;
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt}/${maxAttempts} failed:`, error);
        
        if (attempt < maxAttempts) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }
}
