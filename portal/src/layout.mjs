import { h, raw, link, isUsableUrl } from './render.mjs';

export const nav = [
  { path: '/roadmap/', label: '로드맵' },
  { path: '/workshops/', label: '워크숍' },
  { path: '/studio/', label: 'Studio' },
  { path: '/showcase/', label: 'Showcase' },
  { path: '/about/', label: '소개' }
];

export function layout({ site, path, title, description, body, assets }) {
  const pageTitle = title ? `${title} · ${site.name}` : `${site.name} — ${site.promise}`;
  const url = site.url + path;
  const section = nav.find(item => path.startsWith(item.path));
  const openChat = site.links.openChat;
  return `<!doctype html>
${h`<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pageTitle}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ko_KR">
<meta property="og:site_name" content="${site.name}">
<meta property="og:title" content="${title ?? site.name}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${site.url}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${site.name} — ${site.promise}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#f7f6f2">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/styles.css?v=${assets.css}">
<script src="/main.js?v=${assets.js}" defer></script>
</head>
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/" ${path === '/' ? raw('aria-current="page"') : ''}>
      <span class="brand-mark" aria-hidden="true">SC</span>
      <span class="brand-text"><strong>Student Collective</strong><small>OpenAI · SNU</small></span>
    </a>
    <nav class="site-nav" aria-label="주요 메뉴">
      <ul>${nav.map(item => h`<li><a href="${item.path}" ${item === section ? raw('aria-current="page"') : ''}>${item.label}</a></li>`)}</ul>
    </nav>
  </div>
</header>
<main id="main">
${raw(body)}
</main>
<footer class="site-footer">
  <div class="wrap footer-inner">
    <div>
      <p class="footer-name">${site.name}</p>
      <p>운영 · ${site.operators.role} ${site.operators.names.join('·')}</p>
      <p class="footer-note">${site.supportNotice} 이 사이트는 Campus Leads가 운영하는 학생 프로그램 안내 페이지이며, 서울대학교나 OpenAI의 공식 홈페이지가 아닙니다.</p>
    </div>
    <ul class="footer-links">
      <li><a href="/roadmap/">학기 로드맵</a></li>
      <li><a href="/workshops/">실습 자료</a></li>
      <li><a href="/about/">협력 안내</a></li>
      ${isUsableUrl(openChat) ? h`<li>${link(openChat, '오픈채팅 참여')}</li>` : ''}
      <li>${link(site.links.repository, 'GitHub 저장소')}</li>
    </ul>
  </div>
</footer>
</body>
</html>`}
`;
}
