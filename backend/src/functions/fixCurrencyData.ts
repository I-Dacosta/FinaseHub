import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPrismaClient } from '../lib/db';

export async function fixCurrencyDataHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const prisma = getPrismaClient();
    
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'status';
    
    const results: any = { action };
    
    switch (action) {
      case 'clean-cad':
        console.log('Cleaning old CAD data...');
        
        // Find the latest date for CAD from Norges Bank
        const latestCadNB = await prisma.rate.findFirst({
          where: { 
            base: 'CAD', 
            quote: 'NOK',
            src: 'NB' 
          },
          orderBy: { date: 'desc' }
        });
        
        if (latestCadNB) {
          // Delete older CAD records, keeping only the last 10 days
          const cutoffDate = new Date(latestCadNB.date);
          cutoffDate.setDate(cutoffDate.getDate() - 10);
          
          const deletedCount = await prisma.rate.deleteMany({
            where: {
              base: 'CAD',
              quote: 'NOK',
              date: { lt: cutoffDate }
            }
          });
          
          results.message = `Cleaned ${deletedCount.count} old CAD records`;
          results.latestCadDate = latestCadNB.date;
        } else {
          results.message = 'No CAD data found';
        }
        break;
        
      case 'check-clp':
        console.log('Checking CLP data...');
        
        const clpCount = await prisma.rate.count({
          where: { 
            base: 'CLP', 
            quote: 'NOK',
            src: 'ABSTRACT' 
          }
        });
        
        const latestClp = await prisma.rate.findFirst({
          where: { 
            base: 'CLP', 
            quote: 'NOK',
            src: 'ABSTRACT' 
          },
          orderBy: { date: 'desc' }
        });
        
        results.clpRecords = clpCount;
        results.latestClpDate = latestClp?.date || 'No CLP data found';
        results.latestClpValue = latestClp?.value || null;
        break;
        
      case 'status':
      default:
        console.log('Getting currency status...');
        
        // Get latest data for each currency
        const currencies = ['CAD', 'CLP', 'EUR', 'USD', 'JPY'];
        results.currencies = {};
        
        for (const currency of currencies) {
          const latest = await prisma.rate.findFirst({
            where: { 
              base: currency, 
              quote: 'NOK' 
            },
            orderBy: { date: 'desc' }
          });
          
          const count = await prisma.rate.count({
            where: { 
              base: currency, 
              quote: 'NOK' 
            }
          });
          
          results.currencies[currency] = {
            latestDate: latest?.date || 'No data',
            latestValue: latest?.value || null,
            source: latest?.src || null,
            totalRecords: count
          };
        }
        break;
    }
    
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        ...results
      })
    };
    
  } catch (error) {
    console.error('Error in fixCurrencyDataHandler:', error);
    
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

app.http('fixCurrencyData', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'fix/currency',
  handler: fixCurrencyDataHandler
});
