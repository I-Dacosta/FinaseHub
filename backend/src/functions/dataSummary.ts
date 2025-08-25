import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPrismaClient } from '../lib/db';

export async function dataSummaryHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const prisma = getPrismaClient();
    
    // Get currency pairs and their latest rates
    const currencyPairs = await prisma.rate.groupBy({
      by: ['base', 'quote'],
      _count: {
        id: true
      },
      _max: {
        date: true
      },
      orderBy: [
        { base: 'asc' },
        { quote: 'asc' }
      ]
    });

    // Get available series and their info
    const seriesInfo = await prisma.seriesPoint.groupBy({
      by: ['series'],
      _count: {
        id: true
      },
      _max: {
        date: true
      },
      orderBy: {
        series: 'asc'
      }
    });

    // Get total counts
    const totalCurrencyRates = await prisma.rate.count();
    const totalSeriesPoints = await prisma.seriesPoint.count();

    // Get date ranges
    const currencyDateRange = await prisma.rate.aggregate({
      _min: { date: true },
      _max: { date: true }
    });

    const seriesDateRange = await prisma.seriesPoint.aggregate({
      _min: { date: true },
      _max: { date: true }
    });

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: true,
        summary: {
          currency: {
            totalRates: totalCurrencyRates,
            dateRange: {
              from: currencyDateRange._min.date,
              to: currencyDateRange._max.date
            },
            availablePairs: currencyPairs.map(pair => ({
              base: pair.base,
              quote: pair.quote,
              count: pair._count.id,
              latestDate: pair._max.date
            }))
          },
          series: {
            totalPoints: totalSeriesPoints,
            dateRange: {
              from: seriesDateRange._min.date,
              to: seriesDateRange._max.date
            },
            availableSeries: seriesInfo.map(series => ({
              series: series.series,
              count: series._count.id,
              latestDate: series._max.date
            }))
          }
        },
        endpoints: {
          currency: '/api/data/currency?base=NOK&quote=USD&from=2024-01-01&to=2024-12-31&limit=100',
          series: '/api/data/series?series=POLICY_RATE&from=2024-01-01&to=2024-12-31&limit=100'
        }
      })
    };

  } catch (error) {
    console.error('Error in dataSummaryHandler:', error);
    
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

app.http('dataSummary', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'data/summary',
  handler: dataSummaryHandler
});
