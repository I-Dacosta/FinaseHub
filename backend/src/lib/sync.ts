import { getPrismaClient } from './db';
import { NorgesBankClient, CurrencyRate, SeriesData } from './norgesbank';
import { AbstractAPIClient } from './abstractapi';
import { PowerBIService, PowerBIConfig } from './powerbi';
import { configService } from './config';
import { monitoringService } from './monitoring';
import { addDays, format, parseISO } from 'date-fns';

export interface SyncOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export class SyncService {
  private nbClient: NorgesBankClient;
  private abstractClient: AbstractAPIClient | null = null;
  private pbiService: PowerBIService | null = null;
  private options: Required<SyncOptions>;

  constructor(options: SyncOptions = {}) {
    this.nbClient = new NorgesBankClient();
    
    // Initialize Abstract API client if key is available
    try {
      if (process.env.ABSTRACT_API_KEY) {
        this.abstractClient = new AbstractAPIClient(process.env.ABSTRACT_API_KEY);
        console.log('Abstract API client initialized');
      }
    } catch (error) {
      console.warn('Failed to initialize Abstract API client:', error);
    }
    
    this.options = {
      maxAttempts: options.maxAttempts || parseInt(process.env.SYNC_MAX_ATTEMPTS || '4'),
      baseDelayMs: options.baseDelayMs || parseInt(process.env.SYNC_BASE_DELAY_MS || '2000'),
      maxDelayMs: options.maxDelayMs || parseInt(process.env.SYNC_MAX_DELAY_MS || '30000'),
    };
  }

  /**
   * Initialiser Power BI-service
   */
  async initializePowerBI(): Promise<void> {
    try {
      const pbiConfig = await configService.getPowerBIConfig();
      
      if (pbiConfig.tenantId && pbiConfig.clientId && pbiConfig.clientSecret && 
          pbiConfig.groupId && pbiConfig.datasetId) {
        this.pbiService = new PowerBIService(pbiConfig as PowerBIConfig);
        console.log('Power BI service initialized');
      } else {
        console.warn('Power BI configuration incomplete, skipping Power BI integration');
      }
    } catch (error) {
      console.warn('Failed to initialize Power BI service:', error);
    }
  }

  /**
   * Hovedfunksjon for å synkronisere valutakurser
   */
  async syncCurrencyRates(): Promise<void> {
    const syncId = monitoringService.generateSyncId('CURRENCY');
    const startTime = new Date();
    
    try {
      await monitoringService.logSyncStatus({
        id: syncId,
        type: 'CURRENCY',
        status: 'SUCCESS', // Will be updated if failure occurs
        startTime,
      });

      const prisma = getPrismaClient();
      const bases = (process.env.NB_BASES || 'USD,EUR,GBP,SEK,DKK,CAD,ISK,AUD,NZD,IDR').split(',');
      const quote = process.env.NB_QUOTE || 'NOK';
      const defaultStart = process.env.NB_DEFAULT_START || '2023-01-01';

      console.log(`Starting currency sync for ${bases.length} currencies`);
      let totalRecordsProcessed = 0;
      const skippedCurrencies: string[] = [];
      const successfulCurrencies: string[] = [];

      for (const base of bases) {
        try {
          await this.retryOperation(async () => {
            console.log(`Syncing ${base}/${quote}`);
            
            // Finn siste dato i databasen for denne valutaen
            const lastRate = await prisma.rate.findFirst({
              where: { base, quote, src: 'NB' }, // Specify source to avoid conflicts
              orderBy: { date: 'desc' }
            });

            let startDate = defaultStart;
            if (lastRate) {
              // Start fra dagen etter siste registrerte dato
              const nextDay = addDays(lastRate.date, 1);
              startDate = format(nextDay, 'yyyy-MM-dd');
              console.log(`Last ${base}/${quote} rate found: ${format(lastRate.date, 'yyyy-MM-dd')}, starting from: ${startDate}`);
            } else {
              console.log(`No existing ${base}/${quote} rates found, starting from: ${startDate}`);
            }

            const today = format(new Date(), 'yyyy-MM-dd');
            
            // Skip hvis vi allerede er oppdatert
            if (startDate > today) {
              console.log(`${base}/${quote} is already up to date (start: ${startDate}, today: ${today})`);
              return;
            }

            console.log(`Fetching ${base}/${quote} rates from ${startDate} to ${today}`);

            // Hent nye data fra Norges Bank
            const rates = await this.nbClient.getCurrencyRates([base], quote, startDate, today);
            
            if (rates.length === 0) {
              console.log(`No new data for ${base}/${quote} from ${startDate} to ${today}`);
              // This might be normal for weekends/holidays, so don't treat as error
              return;
            }

            // Konverter til database-format med explicit date conversion
            const rateData = rates.map(rate => ({
              date: rate.date instanceof Date ? rate.date : new Date(rate.date),
              base: rate.base,
              quote: rate.quote,
              value: rate.value,
              src: 'NB'
            }));

            // Sort by date to ensure proper ordering
            rateData.sort((a, b) => a.date.getTime() - b.date.getTime());

            // Bulk insert med skipDuplicates
            const result = await prisma.rate.createMany({
              data: rateData,
              skipDuplicates: true
            });

            totalRecordsProcessed += result.count;
            console.log(`✅ Inserted ${result.count} new rates for ${base}/${quote} (${rateData.length} total fetched)`);
            successfulCurrencies.push(`${base}/${quote}`);
          });
        } catch (error) {
          console.warn(`⚠️ Failed to sync ${base}/${quote} (skipping):`, error instanceof Error ? error.message : error);
          skippedCurrencies.push(`${base}/${quote}`);
          // Continue with other currencies instead of failing completely
        }
      }

      // Sync Chilean Peso using Abstract API - only if it's the right time or forced
      if (this.abstractClient) {
        try {
          await this.retryOperation(async () => {
            console.log('Checking CLP/NOK sync via Abstract API');
            
            const lastClpRate = await prisma.rate.findFirst({
              where: { base: 'CLP', quote, src: 'ABSTRACT' },
              orderBy: { date: 'desc' }
            });

            const today = format(new Date(), 'yyyy-MM-dd');
            const shouldForceUpdate = !lastClpRate; // Force if no data exists
            const shouldScheduledUpdate = AbstractAPIClient.shouldUpdateCLP();
            
            // Check if we need to update CLP rate
            const needsUpdate = shouldForceUpdate || 
              shouldScheduledUpdate ||
              !lastClpRate || 
              format(lastClpRate.date, 'yyyy-MM-dd') < today;

            if (needsUpdate) {
              console.log(`CLP update needed - Force: ${shouldForceUpdate}, Scheduled: ${shouldScheduledUpdate}, Last: ${lastClpRate ? format(lastClpRate.date, 'yyyy-MM-dd') : 'none'}`);
              
              const clpRate = await this.abstractClient!.getChileanPesoRate(today);
              
              if (clpRate) {
                // Convert string date to Date object
                const rateData = {
                  date: new Date(clpRate.date),
                  base: clpRate.base,
                  quote: clpRate.quote,
                  value: clpRate.value,
                  src: clpRate.src
                };

                const result = await prisma.rate.createMany({
                  data: [rateData],
                  skipDuplicates: true
                });

                if (result.count > 0) {
                  totalRecordsProcessed += result.count;
                  console.log(`✅ Inserted ${result.count} new CLP/NOK rate via Abstract API (${clpRate.value.toFixed(6)})`);
                  successfulCurrencies.push('CLP/NOK (Abstract API)');
                } else {
                  console.log('CLP/NOK rate already exists for today');
                }
              } else {
                console.warn('Failed to get CLP rate from Abstract API');
                skippedCurrencies.push('CLP/NOK (Abstract API - no data)');
              }
            } else {
              console.log(`CLP/NOK update skipped - not scheduled time and data exists for today`);
            }
          });
        } catch (error) {
          console.warn('⚠️ Failed to sync CLP/NOK via Abstract API (skipping):', error instanceof Error ? error.message : error);
          skippedCurrencies.push('CLP/NOK (Abstract API - error)');
        }
      } else {
        console.log('Abstract API not available, skipping CLP rates');
        skippedCurrencies.push('CLP/NOK (No Abstract API)');
      }

      // Log successful completion with details
      const details = {
        currencyPairs: bases.length,
        successful: successfulCurrencies,
        skipped: skippedCurrencies,
        successCount: successfulCurrencies.length,
        skipCount: skippedCurrencies.length
      };

      await monitoringService.logSyncStatus({
        id: syncId,
        type: 'CURRENCY',
        status: successfulCurrencies.length > 0 ? 'SUCCESS' : 'FAILURE',
        startTime,
        endTime: new Date(),
        recordsProcessed: totalRecordsProcessed,
        details
      });

      console.log(`📊 Currency sync summary: ${successfulCurrencies.length} successful, ${skippedCurrencies.length} skipped`);

    } catch (error) {
      // Log failure
      await monitoringService.logSyncStatus({
        id: syncId,
        type: 'CURRENCY',
        status: 'FAILURE',
        startTime,
        endTime: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        details: { error: error instanceof Error ? error.stack : error }
      });
      throw error;
    }
  }

  /**
   * Synkroniser renteserier (valgfritt)
   */
  async syncInterestRates(series: string[]): Promise<void> {
    const syncId = monitoringService.generateSyncId('SERIES');
    const startTime = new Date();
    
    try {
      await monitoringService.logSyncStatus({
        id: syncId,
        type: 'SERIES',
        status: 'SUCCESS', // Will be updated if failure occurs
        startTime,
      });

      const prisma = getPrismaClient();
      const defaultStart = process.env.NB_DEFAULT_START || '2023-01-01';
      let totalRecordsProcessed = 0;
      const skippedSeries: string[] = [];
      const successfulSeries: string[] = [];

      for (const seriesName of series) {
        try {
          await this.retryOperation(async () => {
            console.log(`Syncing ${seriesName}`);
            
            // Finn siste dato i databasen for denne serien
            const lastPoint = await prisma.seriesPoint.findFirst({
              where: { series: seriesName },
              orderBy: { date: 'desc' }
            });

            let startDate = defaultStart;
            if (lastPoint) {
              const nextDay = addDays(lastPoint.date, 1);
              startDate = format(nextDay, 'yyyy-MM-dd');
            }

            const today = format(new Date(), 'yyyy-MM-dd');
            
            if (startDate > today) {
              console.log(`${seriesName} is already up to date`);
              return;
            }

            // Hent nye data fra Norges Bank
            const points = await this.nbClient.getInterestRates(seriesName, startDate, today);
            
            if (points.length === 0) {
              console.log(`No new data for ${seriesName} from ${startDate} to ${today}`);
              return;
            }

            // Konverter til database-format
            const pointData = points.map(point => ({
              date: point.date,
              series: point.series,
              label: point.label,
              value: point.value,
              src: 'NB'
            }));

            // Bulk insert med skipDuplicates
            const result = await prisma.seriesPoint.createMany({
              data: pointData,
              skipDuplicates: true
            });

            totalRecordsProcessed += result.count;
            console.log(`✅ Inserted ${result.count} new points for ${seriesName}`);
            successfulSeries.push(seriesName);
          });
        } catch (error) {
          console.warn(`⚠️ Failed to sync ${seriesName} (skipping):`, error instanceof Error ? error.message : error);
          skippedSeries.push(seriesName);
          // Continue with other series instead of failing completely
        }
      }

      // Log successful completion
      const details = {
        seriesCount: series.length,
        seriesNames: series,
        successful: successfulSeries,
        skipped: skippedSeries,
        successCount: successfulSeries.length,
        skipCount: skippedSeries.length
      };

      await monitoringService.logSyncStatus({
        id: syncId,
        type: 'SERIES',
        status: successfulSeries.length > 0 ? 'SUCCESS' : 'FAILURE',
        startTime,
        endTime: new Date(),
        recordsProcessed: totalRecordsProcessed,
        details
      });

      console.log(`📊 Interest rates sync summary: ${successfulSeries.length} successful, ${skippedSeries.length} skipped`);

    } catch (error) {
      // Log failure
      await monitoringService.logSyncStatus({
        id: syncId,
        type: 'SERIES',
        status: 'FAILURE',
        startTime,
        endTime: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        details: { 
          error: error instanceof Error ? error.stack : error,
          seriesNames: series 
        }
      });
      throw error;
    }
  }

  /**
   * Trigger Power BI refresh
   */
  async refreshPowerBI(): Promise<void> {
    if (!this.pbiService) {
      console.log('Power BI service not initialized, skipping refresh');
      return;
    }

    await this.retryOperation(async () => {
      await this.pbiService!.refreshDataset();
      console.log('Power BI refresh triggered successfully');
    });
  }

  /**
   * Hovedsynkroniseringsfunksjon - improved with better error handling
   */
  async runFullSync(): Promise<void> {
    const errors: string[] = [];
    const startTime = new Date();
    
    try {
      console.log('🔄 Starting full sync...');
      
      // Initialiser Power BI (optional)
      try {
        await this.initializePowerBI();
      } catch (error) {
        console.warn('⚠️ Power BI initialization failed (non-critical):', error);
        errors.push(`Power BI init: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Synkroniser valutakurser (critical)
      try {
        await this.syncCurrencyRates();
        console.log('✅ Currency rates sync completed');
      } catch (error) {
        console.error('❌ Currency rates sync failed:', error);
        errors.push(`Currency sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Don't throw here - we still want to try other operations
      }
      
      // Synkroniser renteserier (optional - only if configured)
      try {
        const interestSeries = process.env.NB_INTEREST_SERIES?.split(',') || [];
        if (interestSeries.length > 0) {
          await this.syncInterestRates(interestSeries);
          console.log('✅ Interest rates sync completed');
        } else {
          console.log('ℹ️ No interest rate series configured, skipping');
        }
      } catch (error) {
        console.warn('⚠️ Interest rates sync failed (non-critical):', error);
        errors.push(`Interest rates: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Don't throw - this is optional
      }
      
      // Trigger Power BI refresh (optional)
      try {
        await this.refreshPowerBI();
        console.log('✅ Power BI refresh completed');
      } catch (error) {
        console.warn('⚠️ Power BI refresh failed (non-critical):', error);
        errors.push(`Power BI refresh: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Don't throw - this is optional
      }
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      if (errors.length > 0) {
        console.log(`⚠️ Full sync completed with ${errors.length} non-critical errors (${duration}ms):`, errors);
      } else {
        console.log(`✅ Full sync completed successfully with no errors (${duration}ms)`);
      }
    } catch (error) {
      console.error('❌ Critical error during full sync:', error);
      throw error;
    }
  }

  /**
   * Force sync Chilean Peso regardless of timing (for testing/manual updates)
   */
  async forceSyncChileanPeso(): Promise<{ success: boolean; message: string; rate?: any }> {
    if (!this.abstractClient) {
      return {
        success: false,
        message: 'Abstract API client not available'
      };
    }

    try {
      const prisma = getPrismaClient();
      const today = format(new Date(), 'yyyy-MM-dd');
      
      console.log('Force syncing CLP/NOK via Abstract API');
      
      const clpRate = await this.abstractClient.getChileanPesoRate(today);
      
      if (clpRate) {
        // Convert string date to Date object
        const rateData = {
          date: new Date(clpRate.date),
          base: clpRate.base,
          quote: clpRate.quote,
          value: clpRate.value,
          src: clpRate.src
        };

        const result = await prisma.rate.createMany({
          data: [rateData],
          skipDuplicates: true
        });

        return {
          success: true,
          message: `Successfully ${result.count > 0 ? 'inserted' : 'verified existing'} CLP/NOK rate`,
          rate: clpRate
        };
      } else {
        return {
          success: false,
          message: 'Failed to fetch CLP rate from Abstract API'
        };
      }
    } catch (error) {
      console.error('Error in force sync CLP:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Retry-logikk med eksponentiell backoff
   */
  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt}/${this.options.maxAttempts} failed:`, error);
        
        if (attempt < this.options.maxAttempts) {
          const delay = Math.min(
            this.options.baseDelayMs * Math.pow(2, attempt - 1),
            this.options.maxDelayMs
          );
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }
}
