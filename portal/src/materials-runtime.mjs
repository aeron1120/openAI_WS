// Pages 함수에서 저장된 공개 설정을 확인한 뒤 기존 페이지 렌더러를 사용합니다.
import { resolveContent, shortTime } from './schedule.mjs';
import { routes, renderRoute } from './routes.mjs';
import { createTranslator } from './i18n.mjs';
import { english } from '../content/en.mjs';
import { deckId } from './learn-pages.mjs';
import { slidesOf, icsPath, eventTitle, eventDetails } from './pages.mjs';
import { icsFile } from './calendar.mjs';

const reply = (body, status = 200, type = 'text/html; charset=utf-8', method = 'GET') => new Response(method === 'HEAD' ? null : body, {
  status, headers: { 'Content-Type': type, 'Cache-Control': 'no-store' }
});

export async function materialResponse(request, env, url) {
  let snapshot, materials = [];
  try {
    const response = await env.ASSETS.fetch(new URL('/_v/runtime.json', url));
    if (!response.ok) throw new Error('missing runtime');
    snapshot = await response.json();
    // 운영진 화면은 설정 서버 오류가 있어도 열려야 재시도와 오류 안내를 볼 수 있습니다.
    if (url.pathname !== '/admin/' && url.pathname !== '/admin/index.html') {
      const settings = await fetch(new URL('/api/materials', env.LEARN_API_ORIGIN), {
        headers: { 'x-proxy-secret': env.PROXY_SECRET }, signal: AbortSignal.timeout(10000), redirect: 'manual'
      });
      if (!settings.ok) throw new Error('settings unavailable');
      ({ materials } = await settings.json());
      if (!Array.isArray(materials) || materials.some(w => !Number.isInteger(w.workshop)
        || !['open', 'closed', 'scheduled'].includes(w.mode) || typeof w.open !== 'boolean'
        || (w.mode === 'scheduled' && !Number.isFinite(Date.parse(w.opensAt))))) throw new Error('invalid settings');
    } else {
      materials = snapshot.content.workshops.filter(w => w.materials === 'open').map(w => ({ workshop: w.number, mode: 'open', open: true }));
    }
  } catch {
    return reply('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>자료 확인 중</title><p>자료 공개 설정을 확인하지 못했어요. 잠시 후 새로고침해 주세요.</p><a href="/admin/">운영진 화면</a></html>', 503, undefined, request.method);
  }
  const settings = new Map(materials.map(w => [w.workshop, w]));
  const content = resolveContent({ ...snapshot.content, workshops: snapshot.content.workshops.map(w => {
    const setting = settings.get(w.number);
    // 콘텐츠가 준비되지 않은 회차는 설정만으로 열지 않습니다.
    if (w.materials !== 'open') return w;
    return { ...w,
      materials: setting?.open ? 'open' : 'planning',
      materialsOpenAt: null
    };
  }) }, Date.now());
  // 서버가 판단한 공개 상태를 따르면서 예약 안내만 현지 시간으로 표시합니다.
  for (const w of content.workshops) {
    const setting = settings.get(w.number);
    if (!setting?.open && setting?.mode === 'scheduled' && snapshot.content.workshops.find(original => original.number === w.number)?.materials === 'open') {
      w.materials = 'locked';
      w.opensLabel = shortTime(setting.opensAt, content.site.timeZone);
    }
  }
  const pathname = url.pathname.replace(/\/index\.html$/, '/');
  if (pathname.startsWith('/slides/') || pathname.startsWith('/examples/')) {
    const allowed = content.workshops.some(w => w.materials === 'open' && (
      (() => {
        const id = deckId(slidesOf(w)?.url);
        return id && content.decks?.[id]?.pages.some(page => pathname === `/slides/${id}/${page.file}`);
      })()
      || (w.exampleDirs ?? []).some(dir => ['', 'index.html', 'app.js', 'styles.css'].some(file => pathname === `/examples/${dir}/${file}`))
    ));
    if (!allowed) return reply('Not found', 404, 'text/plain; charset=utf-8', request.method);
    const target = new URL(`/_v/materials${pathname}`, url);
    let response = await env.ASSETS.fetch(new Request(target, { method: request.method }));
    for (let hop = 0; hop < 3 && response.status >= 300 && response.status < 400 && response.headers.get('Location'); hop++) {
      response = await env.ASSETS.fetch(new Request(new URL(response.headers.get('Location'), target), { method: request.method }));
    }
    if (!response.ok) return reply('Not found', 404, 'text/plain; charset=utf-8', request.method);
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store');
    return new Response(request.method === 'HEAD' ? null : response.body, { status: 200, headers });
  }
  const workshop = content.workshops.find(w => w.event?.start && icsPath(w) === pathname);
  if (workshop) return reply(icsFile({ uid: `workshop-${workshop.slug}@${new URL(content.site.url).host}`, title: eventTitle(workshop), event: workshop.event,
    details: eventDetails(content.site, workshop), url: `${content.site.url}/workshops/${workshop.slug}/`, now: content.now }), 200, 'text/calendar; charset=utf-8', request.method);
  const all = routes(content);
  const en = pathname.startsWith('/en/');
  const route = all.find(r => r.path === (en ? pathname.slice(3) : pathname) && (!en || r.layout !== 'learn'));
  if (!route) return reply('Not found', 404, 'text/plain; charset=utf-8', request.method);
  return reply(renderRoute(route, content, snapshot.assets, { english: en, translator: createTranslator(english), enPaths: new Set(all.filter(r => r.layout !== 'learn').map(r => r.path)) }), 200, undefined, request.method);
}
