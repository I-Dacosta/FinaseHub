import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function healthCheck(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Health check processed request for url "${request.url}"`);

    return { 
        status: 200,
        jsonBody: {
            message: 'Health check working',
            timestamp: new Date().toISOString(),
            method: request.method,
            url: request.url
        }
    };
}

app.http('healthCheck', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'health',
    handler: healthCheck
});
