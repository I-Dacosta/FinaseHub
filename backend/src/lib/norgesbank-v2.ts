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
   * Henter valutakurser fra Norges Bank
   */
  async getCurrencyRates(
    bases: string[],
    quote: string = 'NOK',
    startDate: string,
    endDate?: string
  ): Promise<CurrencyRate[]> {
    try {
      const basesParam = bases.join(',');
      const url = `${this.baseUrl}/data/EXR/B.${basesParam}.${quote}.SP`;
      
      const params: any = {
        format: 'csv',
        startPeriod: startDate,
        locale: 'en'
      };
      
      if (endDate) {
        params.endPeriod = endDate;
      }

      const response = await axios.get(url, {
        params,
        responseType: 'stream'
      });

      return await this.parseCurrencyCSV(response.data, quote);
    } catch (error) {
      console.error('Error fetching currency rates:', error);
      throw error;
    }
  }

  /**
   * Henter renteserier fra Norges Bank
   */
  async getInterestRates(
    series: string,
    startDate: string,
    endDate?: string
  ): Promise<SeriesData[]> {
    try {
      let apiSeries = '';
      switch (series) {
        case 'POLICY_RATE':
          apiSeries = 'KPRA';
          break;
        case 'NOWA':
          apiSeries = 'NOWA';
          break;
        case 'GOV_BONDS':
          apiSeries = 'GOVT';
          break;
        case 'GENERIC_RATES':
          apiSeries = 'GOVT_GENERIC';
          break;
        default:
          throw new Error(`Unknown series: ${series}`);
      }

      const url = `${this.baseUrl}/data/IR/B.${apiSeries}`;
      
      const params: any = {
        format: 'csv',
        startPeriod: startDate,
        locale: 'en'
      };
      
      if (endDate) {
        params.endPeriod = endDate;
      }

      const response = await axios.get(url, {
        params,
        responseType: 'stream'
      });

      return await this.parseSeriesCSV(response.data, series);
    } catch (error) {
      console.error(`Error fetching ${series} rates:`, error);
      throw error;
    }
  }

  private async parseCurrencyCSV(csvStream: Readable, quote: string): Promise<CurrencyRate[]> {
    return new Promise((resolve, reject) => {
      const results: CurrencyRate[] = [];
      
      csvStream
        .pipe(csv({ separator: ';' }))
        .on('data', (row: any) => {
          try {
            // Skip header rows
            if (!row.TIME_PERIOD || row.TIME_PERIOD === 'TIME_PERIOD') {
              return;
            }

            const date = parseISO(row.TIME_PERIOD);
            const value = parseFloat(row.OBS_VALUE);
            
            if (isNaN(value) || !row.BASE_CUR) {
              return;
            }

            results.push({
              date,
              base: row.BASE_CUR,
              quote,
              value
            });
          } catch (error) {
            console.warn('Error parsing CSV row:', error, row);
          }
        })
        .on('end', () => {
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
        .pipe(csv({ separator: ';' }))
        .on('data', (row: any) => {
          try {
            // Skip header rows
            if (!row.TIME_PERIOD || row.TIME_PERIOD === 'TIME_PERIOD') {
              return;
            }

            const date = parseISO(row.TIME_PERIOD);
            const value = parseFloat(row.OBS_VALUE);
            
            if (isNaN(value)) {
              return;
            }

            results.push({
              date,
              series,
              label: row.TENOR || row.INSTRUMENT || null,
              value
            });
          } catch (error) {
            console.warn('Error parsing CSV row:', error, row);
          }
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error: any) => {
          reject(error);
        });
    });
  }

  /**
   * Formatterer dato for API-kall
   */
  formatDate(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }
}
