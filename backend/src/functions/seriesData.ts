import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPrismaClient } from '../lib/db';

interface SeriesDataQuery {
  series?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export async function seriesDataHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const url = new URL(request.url);
    
    const query: SeriesDataQuery = {
      series: url.searchParams.get('series') || undefined,
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined,
      limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 100,
    };

    const prisma = getPrismaClient();
    
    // Build where clause
    const where: any = {};
    
    if (query.series) {
      where.series = query.series.toUpperCase();
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

    const seriesPoints = await prisma.seriesPoint.findMany({
      where,
      orderBy: {
        date: 'desc'
      },
      take: Math.min(query.limit || 100, 1000), // Max 1000 records
      select: {
        date: true,
        series: true,
        label: true,
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
        count: seriesPoints.length,
        query,
        data: seriesPoints
      })
    };

  } catch (error) {
    console.error('Error in seriesDataHandler:', error);
    
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

app.http('seriesData', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'data/series',
  handler: seriesDataHandler
});
