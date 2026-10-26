// Cloudflare Pages 함수: 요청 시각에 맞는 페이지 묶음(dist/_v/<n>/)을 보여줍니다.
// 워크숍 자료는 materialsOpenAt 시각이 되면 다시 배포하지 않아도 자동으로 열립니다.
// /_v/ 경로는 직접 열 수 없으므로, 아직 열리지 않은 자료의 페이지는 공개되지 않습니다.

export function variantIndex(times, now) {
  return times.filter(t => now >= Date.parse(t)).length;
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (url.pathname === '/_v' || url.pathname.startsWith('/_v/')) return new Response('Not found', { status: 404 });
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
