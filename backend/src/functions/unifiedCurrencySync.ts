import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPrismaClient } from '../lib/db';
import { NorgesBankClient } from '../lib/norgesbank';
import { AbstractAPIClient } from '../lib/abstractapi';
import { format, addDays } from 'date-fns';

interface UnifiedCurrencyRate {
    date: string;
    base: string;
    quote: string;
    value: number;
    source: 'NB' | 'ABSTRACT';
}

export async function unifiedCurrencySync(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('🔄 Starting unified currency sync...');
    
    try {
        const prisma = getPrismaClient();
        const nbClient = new NorgesBankClient();
        
        // Configuration
        const quote = 'NOK';
        const today = format(new Date(), 'yyyy-MM-dd');
        const results: UnifiedCurrencyRate[] = [];
        const errors: string[] = [];
        
        // 1. Sync Norges Bank currencies
        const nbCurrencies = ['USD', 'EUR', 'GBP', 'SEK', 'DKK', 'CAD', 'ISK', 'AUD', 'NZD', 'IDR', 'JPY'];
        context.log(`📊 Syncing ${nbCurrencies.length} currencies from Norges Bank...`);
        
        for (const base of nbCurrencies) {
            try {
                // Find last rate for this currency from NB
                const lastRate = await prisma.rate.findFirst({
                    where: { base, quote, src: 'NB' },
                    orderBy: { date: 'desc' }
                });
                
                let startDate = '2025-08-20'; // Start from recent date
                if (lastRate) {
                    const nextDay = addDays(lastRate.date, 1);
                    startDate = format(nextDay, 'yyyy-MM-dd');
                }
                
                if (startDate <= today) {
                    context.log(`  Fetching ${base}/NOK from ${startDate} to ${today}`);
                    const rates = await nbClient.getCurrencyRates([base], quote, startDate, today);
                    
                    for (const rate of rates) {
                        const unifiedRate: UnifiedCurrencyRate = {
                            date: format(rate.date, 'yyyy-MM-dd'),
                            base: rate.base,
                            quote: rate.quote,
                            value: rate.value,
                            source: 'NB'
                        };
                        results.push(unifiedRate);
                        
                        // Store in database using createMany with skipDuplicates
                        await prisma.rate.createMany({
                            data: [{
                                date: new Date(unifiedRate.date),
                                base: unifiedRate.base,
                                quote: unifiedRate.quote,
                                value: unifiedRate.value,
                                src: unifiedRate.source
                            }],
                            skipDuplicates: true
                        });
                    }
                    
                    context.log(`  ✅ ${base}: ${rates.length} rates synced`);
                } else {
                    context.log(`  ⏭️ ${base}: Already up to date`);
                }
                
            } catch (error) {
                const errorMsg = `${base}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                errors.push(errorMsg);
                context.log(`  ❌ ${errorMsg}`);
            }
        }
        
        // 2. Force sync Chilean Peso from Abstract API
        context.log('🌶️ Syncing CLP from Abstract API...');
        if (process.env.ABSTRACT_API_KEY) {
            try {
                const abstractClient = new AbstractAPIClient(process.env.ABSTRACT_API_KEY);
                
                // Check last CLP rate
                const lastClpRate = await prisma.rate.findFirst({
                    where: { base: 'CLP', quote, src: 'ABSTRACT' },
                    orderBy: { date: 'desc' }
                });
                
                const needsUpdate = !lastClpRate || 
                    format(lastClpRate.date, 'yyyy-MM-dd') < today;
                
                if (needsUpdate) {
                    const clpRate = await abstractClient.getChileanPesoRate(today);
                    
                    if (clpRate) {
                        const unifiedClpRate: UnifiedCurrencyRate = {
                            date: format(new Date(clpRate.date), 'yyyy-MM-dd'),
                            base: clpRate.base,
                            quote: clpRate.quote,
                            value: clpRate.value,
                            source: 'ABSTRACT'
                        };
                        results.push(unifiedClpRate);
                        
                        // Store in database using createMany with skipDuplicates
                        await prisma.rate.createMany({
                            data: [{
                                date: new Date(unifiedClpRate.date),
                                base: unifiedClpRate.base,
                                quote: unifiedClpRate.quote,
                                value: unifiedClpRate.value,
                                src: unifiedClpRate.source
                            }],
                            skipDuplicates: true
                        });
                        
                        context.log(`  ✅ CLP: ${clpRate.value} synced for ${today}`);
                    } else {
                        errors.push('CLP: No rate returned from Abstract API');
                        context.log('  ❌ CLP: No rate returned from Abstract API');
                    }
                } else {
                    context.log('  ⏭️ CLP: Already up to date');
                }
                
            } catch (error) {
                const errorMsg = `CLP Abstract API: ${error instanceof Error ? error.message : 'Unknown error'}`;
                errors.push(errorMsg);
                context.log(`  ❌ ${errorMsg}`);
            }
        } else {
            errors.push('CLP: Abstract API key not configured');
            context.log('  ❌ CLP: Abstract API key not configured');
        }
        
        // 3. Return standardized response
        const response = {
            success: true,
            timestamp: new Date().toISOString(),
            summary: {
                totalRatesProcessed: results.length,
                currenciesUpdated: [...new Set(results.map(r => r.base))],
                sources: {
                    norgesBank: results.filter(r => r.source === 'NB').length,
                    abstractApi: results.filter(r => r.source === 'ABSTRACT').length
                },
                errors: errors.length > 0 ? errors : undefined
            },
            latestRates: await getLatestRates(prisma)
        };
        
        context.log(`✅ Unified sync completed: ${results.length} rates processed`);
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(response, null, 2)
        };
        
    } catch (error) {
        context.error('❌ Unified currency sync failed:', error);
        
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: 'Unified sync failed',
                details: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            })
        };
    }
}

async function getLatestRates(prisma: any) {
    const currencies = ['USD', 'EUR', 'GBP', 'SEK', 'DKK', 'CAD', 'ISK', 'AUD', 'NZD', 'IDR', 'JPY', 'CLP'];
    const latestRates: any = {};
    
    for (const currency of currencies) {
        const latest = await prisma.rate.findFirst({
            where: { base: currency, quote: 'NOK' },
            orderBy: { date: 'desc' }
        });
        
        if (latest) {
            latestRates[currency] = {
                value: latest.value,
                date: format(latest.date, 'yyyy-MM-dd'),
                source: latest.src
            };
        }
    }
    
    return latestRates;
}

app.http('unifiedCurrencySync', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'sync/unified',
    handler: unifiedCurrencySync
});
