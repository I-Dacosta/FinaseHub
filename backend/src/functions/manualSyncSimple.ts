import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function manualSyncSimple(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Manual sync function called');

    try {
        // Just return success without doing any actual work
        return {
            status: 200,
            jsonBody: {
                message: 'Manual sync endpoint working (simplified)',
                timestamp: new Date().toISOString(),
                status: 'success'
            }
        };
    } catch (error) {
        context.error('Error in manual sync:', error);
        return {
            status: 500,
            jsonBody: {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        };
    }
}

app.http('manualSyncSimple', {
    methods: ['POST'],
    authLevel: 'function',
    handler: manualSyncSimple
});
