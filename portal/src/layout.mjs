import { h, raw, link, isUsableUrl } from './render.mjs';

// 사이드바 메뉴: 홈 · 학기 과정(회차별) · 안내
function navGroups(content) {
  const { workshops, studio, showcase } = content;
  return [
    { items: [{ path: '/', label: '홈', color: 'home' }] },
    {
      title: '학기 과정',
      items: [
        ...workshops.map(w => ({
          path: `/workshops/${w.slug}/`,
          label: `Workshop ${w.number}`,
          sub: w.materials === 'open' ? w.shortTitle : w.materials === 'locked' ? w.event.badge ?? w.shortTitle : '준비 중',
          color: w.materials === 'planning' ? 'muted' : w.color
        })),
        { path: '/studio/', label: studio.title, sub: '워크숍 사이마다', color: 'navy' },
        { path: '/showcase/', label: showcase.title, sub: '학기 마무리', color: showcase.color }
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

export function layout({ site, content, path, title, description, body, assets }) {
  const pageTitle = title ? `${title} · ${site.name}` : `${site.name} — ${site.promise}`;
  const url = site.url + path;
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
<meta name="theme-color" content="#eef2fb">
<link rel="icon" href="/images/brand/icon-64.png" type="image/png">
<link rel="apple-touch-icon" href="/images/brand/apple-touch-icon.png">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="/styles.css?v=${assets.css}">
<script src="/main.js?v=${assets.js}" defer></script>
</head>
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
<div class="shell">
  <header class="topbar">
    ${brand}
    <details class="mobile-menu">
      <summary>메뉴</summary>
      <nav aria-label="주요 메뉴">${navList(content, path)}</nav>
    </details>
  </header>
  <aside class="sidebar">
    ${brand}
    <nav aria-label="주요 메뉴">${navList(content, path)}</nav>
  </aside>
  <div class="content">
    <main id="main" class="panel">
${raw(body)}
    </main>
    <footer class="site-footer">
      <p><strong>${site.name}</strong> · 운영 ${site.operators.role} ${site.operators.names.join('·')}</p>
      <p>${site.supportNotice} 서울대학교나 OpenAI의 공식 홈페이지가 아닙니다.</p>
      <p class="footer-links">${isUsableUrl(openChat) ? link(openChat, '오픈채팅') : ''}${link(site.links.repository, 'GitHub')}<a href="/about/">운영·협력 안내</a></p>
    </footer>
  </div>
</div>
</body>
</html>`}
`;
}
