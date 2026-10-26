/** This endpoint exposes only the intentionally public, restricted browser key. */
export function handleMapsConfig(request, env = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), {
      status: 405, headers: { ...headers, Allow: 'GET' },
    });
  }
  const apiKey = typeof env.GOOGLE_MAPS_API_KEY === 'string' ? env.GOOGLE_MAPS_API_KEY.trim() : '';
  if (!apiKey) {
    return new Response(JSON.stringify({ configured: false, error: 'MAPS_NOT_CONFIGURED' }), {
      status: 503, headers,
    });
  }
  const mapId = typeof env.GOOGLE_MAPS_MAP_ID === 'string' ? env.GOOGLE_MAPS_MAP_ID.trim() : '';
  return new Response(JSON.stringify({ configured: true, apiKey, mapId: mapId || 'DEMO_MAP_ID' }), {
    status: 200, headers,
  });
}
