import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function test(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    return { 
        status: 200,
        jsonBody: {
            message: 'Test function working',
            timestamp: new Date().toISOString(),
            method: request.method,
            url: request.url
        }
    };
}

app.http('test', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: test
});
