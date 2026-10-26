import { handleWeather } from './weather.mjs';
import { handleAuth } from './auth.mjs';
import { handleMapsConfig } from './maps.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/weather') return handleWeather(request, env);
    if (url.pathname.startsWith('/api/auth/')) return handleAuth(request, env);
    if (url.pathname === '/api/maps/config') return handleMapsConfig(request, env);
    if (url.pathname.startsWith('/api/')) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
    return env.ASSETS.fetch(request);
  }
};
