import { PrismaClient } from '@prisma/client';
import { configService } from './config';

// Global Prisma client instance
let prisma: PrismaClient | null = null;

export async function getPrismaClient(): Promise<PrismaClient> {
    if (!prisma) {
        const databaseUrl = await configService.getDatabaseUrl();
        prisma = new PrismaClient({
            datasources: {
                db: {
                    url: databaseUrl
                }
            },
            log: ['error', 'warn']
        });
    }
    return prisma;
}

export interface CurrencyRate {
    date: Date;
    base: string;
    quote: string;
    value: number;
}

export interface InterestRate {
    date: Date;
    series: string;
    label?: string;
    value: number;
}

export class DatabaseService {
    private prisma: PrismaClient | null = null;

    async init(): Promise<void> {
        this.prisma = await getPrismaClient();
    }

    private ensureInitialized(): PrismaClient {
        if (!this.prisma) {
            throw new Error('DatabaseService not initialized. Call init() first.');
        }
        return this.prisma;
    }

    async insertCurrencyRates(rates: CurrencyRate[]): Promise<number> {
        const prisma = this.ensureInitialized();
        
        if (rates.length === 0) {
            return 0;
        }

        try {
            // Konverter til Prisma format
            const prismaRates = rates.map(rate => ({
                date: rate.date,
                base: rate.base,
                quote: rate.quote,
                value: rate.value.toString(), // Prisma Decimal krever string
                src: 'NB'
            }));

            // Bulk upsert med skipDuplicates for å unngå konflikter
            const result = await prisma.rate.createMany({
                data: prismaRates,
                skipDuplicates: true
            });

            console.log(`Inserted ${result.count} currency rates`);
            return result.count;
        } catch (error) {
            console.error('Error inserting currency rates:', error);
            throw error;
        }
    }

    async insertInterestRates(rates: InterestRate[]): Promise<number> {
        const prisma = this.ensureInitialized();
        
        if (rates.length === 0) {
            return 0;
        }

        try {
            // Konverter til Prisma format
            const prismaRates = rates.map(rate => ({
                date: rate.date,
                series: rate.series,
                label: rate.label || null,
                value: rate.value.toString(), // Prisma Decimal krever string
                src: 'NB'
            }));

            // Bulk upsert med skipDuplicates for å unngå konflikter
            const result = await prisma.seriesPoint.createMany({
                data: prismaRates,
                skipDuplicates: true
            });

            console.log(`Inserted ${result.count} interest rates`);
            return result.count;
        } catch (error) {
            console.error('Error inserting interest rates:', error);
            throw error;
        }
    }

    async getLatestCurrencyRateDate(): Promise<Date | null> {
        const prisma = this.ensureInitialized();
        
        try {
            const latest = await prisma.rate.findFirst({
                orderBy: { date: 'desc' },
                select: { date: true }
            });
            
            return latest?.date || null;
        } catch (error) {
            console.error('Error getting latest currency rate date:', error);
            return null;
        }
    }

    async getLatestInterestRateDate(): Promise<Date | null> {
        const prisma = this.ensureInitialized();
        
        try {
            const latest = await prisma.seriesPoint.findFirst({
                orderBy: { date: 'desc' },
                select: { date: true }
            });
            
            return latest?.date || null;
        } catch (error) {
            console.error('Error getting latest interest rate date:', error);
            return null;
        }
    }

    async getCurrencyRateCount(): Promise<number> {
        const prisma = this.ensureInitialized();
        
        try {
            return await prisma.rate.count();
        } catch (error) {
            console.error('Error counting currency rates:', error);
            return 0;
        }
    }

    async getInterestRateCount(): Promise<number> {
        const prisma = this.ensureInitialized();
        
        try {
            return await prisma.seriesPoint.count();
        } catch (error) {
            console.error('Error counting interest rates:', error);
            return 0;
        }
    }

    async getHealthStatus(): Promise<{
        connected: boolean;
        currencyRates: number;
        interestRates: number;
        latestCurrencyDate: Date | null;
        latestInterestDate: Date | null;
    }> {
        try {
            const prisma = this.ensureInitialized();
            
            // Test connection
            await prisma.$queryRaw`SELECT 1`;
            
            const [currencyRates, interestRates, latestCurrencyDate, latestInterestDate] = await Promise.all([
                this.getCurrencyRateCount(),
                this.getInterestRateCount(),
                this.getLatestCurrencyRateDate(),
                this.getLatestInterestRateDate()
            ]);

            return {
                connected: true,
                currencyRates,
                interestRates,
                latestCurrencyDate,
                latestInterestDate
            };
        } catch (error) {
            console.error('Database health check failed:', error);
            return {
                connected: false,
                currencyRates: 0,
                interestRates: 0,
                latestCurrencyDate: null,
                latestInterestDate: null
            };
        }
    }

    async disconnect(): Promise<void> {
        if (this.prisma) {
            await this.prisma.$disconnect();
            this.prisma = null;
        }
    }
}

// Singleton instance
export const databaseService = new DatabaseService();
