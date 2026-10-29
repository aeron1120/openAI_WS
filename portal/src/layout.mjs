import { h, raw, link, isUsableUrl } from './render.mjs';

// 사이드바 메뉴: 홈 · 학기 과정(회차별) · 안내. 메뉴 아래 작은 줄에는 날짜나 '준비 중'만 적습니다.
function navGroups(content) {
  const { workshops, studio, showcase } = content;
  return [
    { items: [{ path: '/', label: '홈', color: 'home' }, { path: '/learn/', label: '수업 듣기', color: 'navy' }] },
    {
      title: '학기 과정',
      items: [
        ...workshops.map(w => ({
          path: `/workshops/${w.slug}/`,
          label: `Workshop ${w.number}`,
          sub: w.materials === 'planning' ? '준비 중' : w.event.badge,
          color: w.materials === 'planning' ? 'muted' : w.color
        })),
        { path: '/studio/', label: studio.title, sub: studio.next?.badge ?? studio.cadence, color: 'navy' },
        { path: '/showcase/', label: showcase.title, sub: showcase.event?.badge ?? '준비 중', color: showcase.color }
      ]
    },
    { title: '안내', items: [{ path: '/roadmap/', label: '학기 로드맵', color: 'line' }, { path: '/workshops/', label: '전체 워크숍', color: 'line' }, { path: '/about/', label: '운영·협력', color: 'line' }] }
  ];
}

function navList(content, path) {
  return navGroups(content).map(group => h`<div class="nav-group">
  ${group.title ? h`<p class="nav-title">${group.title}</p>` : ''}
  <ul>${group.items.map(item => h`<li><a href="${item.path}" ${item.path === path ? raw('aria-current="page"') : ''}><span class="dot dot-${item.color}" aria-hidden="true"></span><span class="nav-label">${item.label}${item.sub ? h`<small>${item.sub}</small>` : ''}</span></a></li>`)}</ul>
</div>`);
}

const brand = h`<a class="brand" href="/"><img class="brand-mark" src="/images/brand/logo-192.png" alt="" width="36" height="36"><span class="brand-text"><strong>Student Collective</strong><small>OpenAI · SNU</small></span></a>`;

// 언어 전환: 영어 페이지가 있는 주소에서만 로고 옆에 보입니다. 같은 페이지의 다른 언어로 갑니다.
// (영어 페이지는 i18n.mjs가 링크를 /en/…으로 바꾸므로, 여기 주소는 그 뒤에 바뀌지 않도록 data-lang-switch로 따로 둡니다.)
function langSwitch(lang, alt) {
  if (!alt) return '';
  return lang === 'en'
    ? h`<a class="lang-switch" href="${alt.ko}" hreflang="ko" lang="ko" data-lang-switch>한국어</a>`
    : h`<a class="lang-switch" href="${alt.en}" hreflang="en" lang="en" data-lang-switch>EN</a>`;
}

// <head>: 포털과 학습실이 같은 메타·스타일·스크립트를 씁니다.
function head({ site, path, title, description, assets, script, lang = 'ko', alt }) {
  const pageTitle = title ? `${title} · ${site.name}` : `${site.name} — ${site.promise}`;
  const url = site.url + path;
  return h`<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pageTitle}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${url}">
${alt ? h`<link rel="alternate" hreflang="ko" href="${site.url + alt.ko}">
<link rel="alternate" hreflang="en" href="${site.url + alt.en}">` : ''}
<meta property="og:type" content="website">
<meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'ko_KR'}">
<meta property="og:site_name" content="${site.name}">
<meta property="og:title" content="${title ?? site.name}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${site.url}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${site.name} — ${site.promise}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#eef2fb">
<link rel="icon" href="/images/brand/icon-64.png" type="image/png">
<link rel="apple-touch-icon" href="/images/brand/apple-touch-icon.png">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="/styles.css?v=${assets.css}">
<script>document.documentElement.classList.add('js');try{if(sessionStorage.getItem('globe-warp')){sessionStorage.removeItem('globe-warp');document.documentElement.classList.add('warp-in')}}catch{}</script>
<script src="/main.js?v=${assets.js}" defer></script>
${[script ?? []].flat().map(name => h`<script src="/${name}?v=${assets[name]}" defer></script>`)}
</head>`;
}

// lang: 'ko' | 'en'. alt: { ko, en } 이 페이지의 두 언어 주소(영어 페이지가 없으면 없음).
export function layout({ site, content, path, title, description, body, assets, script, lang = 'ko', alt }) {
  const openChat = site.links.openChat;
  return `<!doctype html>
${h`<html lang="${lang}">
${head({ site, path, title, description, assets, script, lang, alt })}
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
<div class="shell">
  <header class="topbar">
    ${brand}
    ${langSwitch(lang, alt)}
    <details class="mobile-menu">
      <summary>메뉴</summary>
      <nav aria-label="주요 메뉴">${navList(content, path)}</nav>
    </details>
  </header>
  <aside class="sidebar">
    <div class="sidebar-head">${brand}${langSwitch(lang, alt)}</div>
    <nav aria-label="주요 메뉴">${navList(content, path)}</nav>
  </aside>
  <div class="content">
    <main id="main" class="panel">
${raw(body)}
    </main>
    <footer class="site-footer">
      <p><strong>${site.name}</strong> · 운영 ${site.operators.role} ${site.operators.names.join('·')}</p>
      <p>${site.supportNotice}</p>
      <p class="footer-links">${isUsableUrl(openChat) ? link(openChat, '오픈채팅') : ''}${link(site.links.repository, 'GitHub')}<a href="/about/">운영·협력 안내</a></p>
    </footer>
  </div>
</div>
</body>
</html>`}
`;
}

// 학습실(/learn/…, /admin/): 포털 사이드바 없이 얇은 상단 바와 넓은 본문만 둡니다.
// 오른쪽 사용자 칸(data-learn-user)과 답변 수(data-answer-count)는 learn.js가 로그인 뒤 채웁니다.
function studyNav(path) {
  const items = [
    { href: '/learn/', label: '수업', current: path === '/learn/' ? 'page' : path.startsWith('/learn/') && path !== '/learn/questions/' ? 'true' : null },
    { href: '/learn/questions/', label: '내 질문', current: path === '/learn/questions/' ? 'page' : null, count: true }
  ];
  return h`<nav class="study-nav" aria-label="학습실 메뉴">${items.map(item => h`<a href="${item.href}"${item.current ? h` aria-current="${item.current}"` : ''}>${item.label}${item.count ? raw(' <span data-answer-count></span>') : ''}</a>`)}</nav>`;
}

export function learnLayout({ site, path, title, description, body, assets, script }) {
  return `<!doctype html>
${h`<html lang="ko">
${head({ site, path, title, description, assets, script })}
<body class="study">
<a class="skip" href="#main">본문으로 건너뛰기</a>
<header class="study-bar">
  <div class="study-bar-inner">
    <div class="study-brand">
      <a class="study-back" href="/">← 포털</a>
      <a class="study-name" href="/learn/"><img src="/images/brand/logo-192.png" alt="" width="28" height="28"><span>SNU 학습실</span></a>
    </div>
    ${studyNav(path)}
    <div class="study-user" data-learn-user></div>
  </div>
</header>
<main id="main" class="study-main">
${raw(body)}
</main>
</body>
</html>`}
`;
}
