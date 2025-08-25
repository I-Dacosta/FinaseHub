import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPrismaClient } from '../lib/db';

interface CurrencyDataQuery {
  base?: string;
  quote?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export async function currencyDataHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const url = new URL(request.url);
    
    const query: CurrencyDataQuery = {
      base: url.searchParams.get('base') || undefined,
      quote: url.searchParams.get('quote') || undefined,
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined,
      limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 100,
    };

    const prisma = getPrismaClient();
    
    // Build where clause
    const where: any = {};
    
    if (query.base) {
      where.base = query.base.toUpperCase();
    }
    
    if (query.quote) {
      where.quote = query.quote.toUpperCase();
    }
    
    if (query.from || query.to) {
      where.date = {};
      if (query.from) {
        where.date.gte = new Date(query.from);
      }
      if (query.to) {
        where.date.lte = new Date(query.to);
      }
    }

    const rates = await prisma.rate.findMany({
      where,
      orderBy: {
        date: 'desc'
      },
      take: Math.min(query.limit || 100, 1000), // Max 1000 records
      select: {
        date: true,
        base: true,
        quote: true,
        value: true,
        src: true
      }
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
        count: rates.length,
        query,
        data: rates
      })
    };

  } catch (error) {
    console.error('Error in currencyDataHandler:', error);
    
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

app.http('currencyData', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'data/currency',
  handler: currencyDataHandler
});
