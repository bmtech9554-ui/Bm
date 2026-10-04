type Handler = (request: Request) => Promise<Response>;
const methods = new Set(['GET', 'POST']);
const headers = new Set(['authorization', 'apikey', 'content-type', 'x-client-info']);
export function withCors(handler: Handler, origins: readonly string[]): Handler {
  const allowed = new Set(origins);
  return async request => {
    const origin = request.headers.get('origin');
    if (origin && !allowed.has(origin)) {
      return Response.json({ error: 'Origin is not allowed.' }, { status: 403, headers: { 'Cache-Control': 'no-store', Vary: 'Origin' } });
    }
    let response: Response;
    if (request.method === 'OPTIONS') {
      const method = request.headers.get('access-control-request-method') || '';
      const requested = (request.headers.get('access-control-request-headers') || '').split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
      if (!origin || !methods.has(method) || requested.some(h => !headers.has(h))) {
        return Response.json({ error: 'Invalid preflight.' }, { status: 403, headers: { 'Cache-Control': 'no-store', Vary: 'Origin' } });
      }
      response = new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
        'Access-Control-Max-Age': '600',
      } });
    } else {
      response = await handler(request);
    }
    const outgoing = new Headers(response.headers);
    outgoing.set('Vary', 'Origin');
    if (origin) outgoing.set('Access-Control-Allow-Origin', origin);
    return new Response(response.body, { status: response.status, headers: outgoing });
  };
}
