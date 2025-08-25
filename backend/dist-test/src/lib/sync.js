"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const db_1 = require("./db");
const norgesbank_1 = require("./norgesbank");
const powerbi_1 = require("./powerbi");
const config_1 = require("./config");
const date_fns_1 = require("date-fns");
class SyncService {
    constructor(options = {}) {
        this.pbiService = null;
        this.nbClient = new norgesbank_1.NorgesBankClient();
        this.options = {
            maxAttempts: options.maxAttempts || parseInt(process.env.SYNC_MAX_ATTEMPTS || '4'),
            baseDelayMs: options.baseDelayMs || parseInt(process.env.SYNC_BASE_DELAY_MS || '2000'),
            maxDelayMs: options.maxDelayMs || parseInt(process.env.SYNC_MAX_DELAY_MS || '30000'),
        };
    }
    /**
     * Initialiser Power BI-service
     */
    async initializePowerBI() {
        try {
            const pbiConfig = await config_1.configService.getPowerBIConfig();
            if (pbiConfig.tenantId && pbiConfig.clientId && pbiConfig.clientSecret &&
                pbiConfig.groupId && pbiConfig.datasetId) {
                this.pbiService = new powerbi_1.PowerBIService(pbiConfig);
                console.log('Power BI service initialized');
            }
            else {
                console.warn('Power BI configuration incomplete, skipping Power BI integration');
            }
        }
        catch (error) {
            console.warn('Failed to initialize Power BI service:', error);
        }
    }
    /**
     * Hovedfunksjon for å synkronisere valutakurser
     */
    async syncCurrencyRates() {
        const bases = (process.env.NB_BASES || 'USD,EUR,GBP,SEK,DKK,JPY,ISK,AUD,NZD,IDR,CLP').split(',');
        const quote = process.env.NB_QUOTE || 'NOK';
        const defaultStart = process.env.NB_DEFAULT_START || '2023-01-01';
        console.log(`Starting currency sync for ${bases.length} currencies`);
        for (const base of bases) {
            await this.retryOperation(async () => {
                console.log(`Syncing ${base}/${quote}`);
                // Finn siste dato i databasen for denne valutaen
                const lastRate = await db_1.prisma.rate.findFirst({
                    where: { base, quote },
                    orderBy: { date: 'desc' }
                });
                let startDate = defaultStart;
                if (lastRate) {
                    // Start fra dagen etter siste registrerte dato
                    const nextDay = (0, date_fns_1.addDays)(lastRate.date, 1);
                    startDate = (0, date_fns_1.format)(nextDay, 'yyyy-MM-dd');
                }
                const today = (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd');
                // Skip hvis vi allerede er oppdatert
                if (startDate > today) {
                    console.log(`${base}/${quote} is already up to date`);
                    return;
                }
                // Hent nye data fra Norges Bank
                const rates = await this.nbClient.getCurrencyRates([base], quote, startDate, today);
                if (rates.length === 0) {
                    console.log(`No new data for ${base}/${quote} from ${startDate} to ${today}`);
                    return;
                }
                // Konverter til database-format
                const rateData = rates.map(rate => ({
                    date: rate.date,
                    base: rate.base,
                    quote: rate.quote,
                    value: rate.value,
                    src: 'NB'
                }));
                // Bulk insert med skipDuplicates
                const result = await db_1.prisma.rate.createMany({
                    data: rateData,
                    skipDuplicates: true
                });
                console.log(`Inserted ${result.count} new rates for ${base}/${quote}`);
            });
        }
    }
    /**
     * Synkroniser renteserier (valgfritt)
     */
    async syncInterestRates(series) {
        const defaultStart = process.env.NB_DEFAULT_START || '2023-01-01';
        for (const seriesName of series) {
            await this.retryOperation(async () => {
                console.log(`Syncing ${seriesName}`);
                // Finn siste dato i databasen for denne serien
                const lastPoint = await db_1.prisma.seriesPoint.findFirst({
                    where: { series: seriesName },
                    orderBy: { date: 'desc' }
                });
                let startDate = defaultStart;
                if (lastPoint) {
                    const nextDay = (0, date_fns_1.addDays)(lastPoint.date, 1);
                    startDate = (0, date_fns_1.format)(nextDay, 'yyyy-MM-dd');
                }
                const today = (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd');
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
                const result = await db_1.prisma.seriesPoint.createMany({
                    data: pointData,
                    skipDuplicates: true
                });
                console.log(`Inserted ${result.count} new points for ${seriesName}`);
            });
        }
    }
    /**
     * Trigger Power BI refresh
     */
    async refreshPowerBI() {
        if (!this.pbiService) {
            console.log('Power BI service not initialized, skipping refresh');
            return;
        }
        await this.retryOperation(async () => {
            await this.pbiService.refreshDataset();
            console.log('Power BI refresh triggered successfully');
        });
    }
    /**
     * Hovedsynkroniseringsfunksjon
     */
    async runFullSync() {
        try {
            console.log('Starting full sync...');
            // Initialiser Power BI
            await this.initializePowerBI();
            // Synkroniser valutakurser
            await this.syncCurrencyRates();
            // Synkroniser renteserier (valgfritt)
            // await this.syncInterestRates(['POLICY_RATE']);
            // Trigger Power BI refresh
            await this.refreshPowerBI();
            console.log('Full sync completed successfully');
        }
        catch (error) {
            console.error('Error during full sync:', error);
            throw error;
        }
    }
    /**
     * Retry-logikk med eksponentiell backoff
     */
    async retryOperation(operation) {
        let lastError;
        for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                console.error(`Attempt ${attempt}/${this.options.maxAttempts} failed:`, error);
                if (attempt < this.options.maxAttempts) {
                    const delay = Math.min(this.options.baseDelayMs * Math.pow(2, attempt - 1), this.options.maxDelayMs);
                    console.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    }
}
exports.SyncService = SyncService;
