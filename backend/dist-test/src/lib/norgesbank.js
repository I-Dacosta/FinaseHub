"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NorgesBankClient = void 0;
const axios_1 = __importDefault(require("axios"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const date_fns_1 = require("date-fns");
class NorgesBankClient {
    constructor() {
        this.baseUrl = 'https://data.norges-bank.no/api';
    }
    /**
     * Henter valutakurser fra Norges Bank
     */
    async getCurrencyRates(bases, quote = 'NOK', startDate, endDate) {
        try {
            const basesParam = bases.join(',');
            const url = `${this.baseUrl}/data/EXR/B.${basesParam}.${quote}.SP`;
            const params = {
                format: 'csv',
                startPeriod: startDate,
                locale: 'en'
            };
            if (endDate) {
                params.endPeriod = endDate;
            }
            const response = await axios_1.default.get(url, {
                params,
                responseType: 'stream'
            });
            return await this.parseCurrencyCSV(response.data, quote);
        }
        catch (error) {
            console.error('Error fetching currency rates:', error);
            throw error;
        }
    }
    /**
     * Henter renteserier fra Norges Bank
     */
    async getInterestRates(series, startDate, endDate) {
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
            const params = {
                format: 'csv',
                startPeriod: startDate,
                locale: 'en'
            };
            if (endDate) {
                params.endPeriod = endDate;
            }
            const response = await axios_1.default.get(url, {
                params,
                responseType: 'stream'
            });
            return await this.parseSeriesCSV(response.data, series);
        }
        catch (error) {
            console.error(`Error fetching ${series} rates:`, error);
            throw error;
        }
    }
    async parseCurrencyCSV(csvStream, quote) {
        return new Promise((resolve, reject) => {
            const results = [];
            csvStream
                .pipe((0, csv_parser_1.default)({ separator: ';' }))
                .on('data', (row) => {
                try {
                    // Skip header rows
                    if (!row.TIME_PERIOD || row.TIME_PERIOD === 'TIME_PERIOD') {
                        return;
                    }
                    const date = (0, date_fns_1.parseISO)(row.TIME_PERIOD);
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
                }
                catch (error) {
                    console.warn('Error parsing CSV row:', error, row);
                }
            })
                .on('end', () => {
                resolve(results);
            })
                .on('error', (error) => {
                reject(error);
            });
        });
    }
    async parseSeriesCSV(csvStream, series) {
        return new Promise((resolve, reject) => {
            const results = [];
            csvStream
                .pipe((0, csv_parser_1.default)({ separator: ';' }))
                .on('data', (row) => {
                try {
                    // Skip header rows
                    if (!row.TIME_PERIOD || row.TIME_PERIOD === 'TIME_PERIOD') {
                        return;
                    }
                    const date = (0, date_fns_1.parseISO)(row.TIME_PERIOD);
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
                }
                catch (error) {
                    console.warn('Error parsing CSV row:', error, row);
                }
            })
                .on('end', () => {
                resolve(results);
            })
                .on('error', (error) => {
                reject(error);
            });
        });
    }
    /**
     * Formatterer dato for API-kall
     */
    formatDate(date) {
        return (0, date_fns_1.format)(date, 'yyyy-MM-dd');
    }
}
exports.NorgesBankClient = NorgesBankClient;
