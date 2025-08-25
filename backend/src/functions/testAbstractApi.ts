import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { SyncService } from '../lib/sync';
import { AbstractAPIClient } from '../lib/abstractapi';

export async function testAbstractApi(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`HTTP function processed request for url "${request.url}"`);

    try {
        const action = request.query.get('action') || 'test';

        switch (action) {
            case 'test':
                // Test Abstract API connection
                if (!process.env.ABSTRACT_API_KEY) {
                    return {
                        status: 400,
                        jsonBody: {
                            error: 'Abstract API key not configured'
                        }
                    };
                }

                const client = new AbstractAPIClient(process.env.ABSTRACT_API_KEY);
                const result = await client.testConnection();

                return {
                    status: 200,
                    jsonBody: {
                        message: 'Abstract API test completed',
                        result: result,
                        timestamp: new Date().toISOString()
                    }
                };

            case 'clp':
                // Force sync CLP rate
                const syncService = new SyncService();
                
                if (!process.env.ABSTRACT_API_KEY) {
                    return {
                        status: 400,
                        jsonBody: {
                            error: 'Abstract API key not configured'
                        }
                    };
                }

                const abstractClient = new AbstractAPIClient(process.env.ABSTRACT_API_KEY);
                const clpRate = await abstractClient.getChileanPesoRate();

                if (clpRate) {
                    return {
                        status: 200,
                        jsonBody: {
                            message: 'CLP rate fetched successfully',
                            rate: clpRate,
                            timestamp: new Date().toISOString()
                        }
                    };
                } else {
                    return {
                        status: 500,
                        jsonBody: {
                            error: 'Failed to fetch CLP rate',
                            timestamp: new Date().toISOString()
                        }
                    };
                }

            case 'sync-clp':
                // Force full CLP sync to database
                const fullSyncService = new SyncService();
                
                try {
                    // This will force update CLP regardless of time
                    await fullSyncService.syncCurrencyRates();
                    
                    return {
                        status: 200,
                        jsonBody: {
                            message: 'CLP sync completed successfully',
                            timestamp: new Date().toISOString()
                        }
                    };
                } catch (error) {
                    return {
                        status: 500,
                        jsonBody: {
                            error: 'CLP sync failed',
                            details: error instanceof Error ? error.message : 'Unknown error',
                            timestamp: new Date().toISOString()
                        }
                    };
                }

            default:
                return {
                    status: 400,
                    jsonBody: {
                        error: 'Invalid action. Use: test, clp, or sync-clp',
                        availableActions: ['test', 'clp', 'sync-clp']
                    }
                };
        }

    } catch (error) {
        context.log('Error in testAbstractApi function:', error);
        
        return {
            status: 500,
            jsonBody: {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            }
        };
    }
}

app.http('testAbstractApi', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: testAbstractApi
});
