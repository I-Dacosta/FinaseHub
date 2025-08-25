import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { monitoringService } from '../lib/monitoring';

export async function monitoringHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'history';
    
    switch (action) {
      case 'history':
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const history = await monitoringService.getSyncHistory(limit);
        
        return {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            action: 'history',
            data: history
          })
        };
        
      case 'alert':
        await monitoringService.checkAndAlert();
        
        return {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            action: 'alert',
            message: 'Alert check completed'
          })
        };
        
      default:
        return {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'Invalid action. Use ?action=history or ?action=alert'
          })
        };
    }

  } catch (error) {
    console.error('Error in monitoringHandler:', error);
    
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

app.http('monitoring', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'monitoring',
  handler: monitoringHandler
});
