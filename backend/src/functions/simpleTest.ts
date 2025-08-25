import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function simpleTest(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    return {
        status: 200,
        body: JSON.stringify({
            message: 'Simple test works!',
            time: new Date().toISOString()
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    };
}

app.http('simpleTest', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'simple',
    handler: simpleTest
});
