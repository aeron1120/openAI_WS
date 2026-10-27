// Cloudflare Pages 함수: 요청 시각에 맞는 페이지 묶음(dist/_v/<n>/)을 보여줍니다.
// 워크숍 자료는 materialsOpenAt 시각이 되면 다시 배포하지 않아도 자동으로 열립니다.
// /_v/ 경로는 직접 열 수 없으므로, 아직 열리지 않은 자료의 페이지는 공개되지 않습니다.

// /api/*는 수업 서버(Render)로 그대로 전달합니다. 같은 주소라 로그인 쿠키가 제3자 쿠키로 막히지 않습니다.
// PROXY_SECRET 헤더는 포털을 거친 요청만 Render가 받도록 하는 공유 비밀값입니다(브라우저가 보낸 값은 덮어씀).
const apiJson = (status, error, message) => new Response(JSON.stringify({ error, message }), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});

export async function proxyApi(request, env, url) {
  if (!env.LEARN_API_ORIGIN || !env.PROXY_SECRET) return apiJson(503, 'LEARN_NOT_CONFIGURED', '수업 서버를 준비하고 있어요.');
  const headers = new Headers(request.headers);
  headers.set('x-proxy-secret', env.PROXY_SECRET);
  headers.set('x-forwarded-host', url.host);
  headers.delete('host');
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  try {
    const response = await fetch(new URL(url.pathname + url.search, env.LEARN_API_ORIGIN), {
      method: request.method, headers, body: hasBody ? await request.arrayBuffer() : undefined, redirect: 'manual'
    });
    const out = new Headers(response.headers);
    out.set('Cache-Control', 'no-store');
    return new Response(response.body, { status: response.status, headers: out });
  } catch {
    return apiJson(502, 'LEARN_UNAVAILABLE', '수업 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
}

export function variantIndex(times, now) {
  return times.filter(t => now >= Date.parse(t)).length;
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (url.pathname === '/_v' || url.pathname.startsWith('/_v/')) return new Response('Not found', { status: 404 });
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return proxyApi(request, env, url);
  if (request.method !== 'GET' && request.method !== 'HEAD') return next();

  let times;
  try {
    const schedule = await env.ASSETS.fetch(new URL('/_v/schedule.json', url));
    if (!schedule.ok) return next();
    times = (await schedule.json()).boundaries;
  } catch {
    return next(); // 문제가 생기면 빌드 시각 기준 화면(루트)을 그대로 보여줍니다.
  }

  // 폴더 주소는 / 로 끝나게 맞춥니다(내부 경로가 주소창에 드러나지 않도록 직접 처리).
  const last = url.pathname.split('/').pop();
  if (last && !last.includes('.')) {
    url.pathname += '/';
    return Response.redirect(url.toString(), 308);
  }

  // 정적 파일 서버의 내부 리다이렉트(/x.html → /x 등)는 여기서 따라갑니다.
  const asset = async target => {
    let response = await env.ASSETS.fetch(new Request(target, { method: request.method }));
    for (let hop = 0; hop < 3 && response.status >= 300 && response.status < 400 && response.headers.get('Location'); hop++) {
      response = await env.ASSETS.fetch(new Request(new URL(response.headers.get('Location'), target), { method: request.method }));
    }
    return response;
  };

  const base = `/_v/${variantIndex(times, Date.now())}`;
  const response = await asset(new URL(base + url.pathname + url.search, url));
  if (!response.ok) {
    const notFound = await asset(new URL(`${base}/404.html`, url));
    return new Response(notFound.ok ? notFound.body : 'Not found', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  return new Response(response.body, { status: response.status, headers });
}
