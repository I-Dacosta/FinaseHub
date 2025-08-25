import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function healthCheck(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Health check function triggered');
    
    return {
        status: 200,
        jsonBody: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            runtime: 'Node.js 22',
            message: 'FinanseHub Function App is running'
        }
    };
}

app.http('healthCheck', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: healthCheck
});
