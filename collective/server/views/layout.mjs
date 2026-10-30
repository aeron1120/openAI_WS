// 공개 페이지 공통 틀. 통합 메인(collective)과 학교 공간(campus)은 머리글만 다르고 같은 틀을 씁니다.
// ctx.base: 공개 화면은 '', 관리자 미리보기는 '/manage/preview' (초안을 같은 화면으로 그림)
import { attr, esc } from '../format.mjs';
import { campusHref } from './parts.mjs';

// SC 마크: 공식 Campus Lead 배지(campusleadofficialbadge.png) 가운데의 매듭 부분을 잘라 만든 그림
export const LOGO = '<img class="logo-mark" src="/assets/logo.jpg" alt="" width="40" height="40">';

const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';

export function page({ ctx, title, description = '', body, header, canonicalPath = null, noindex = false, bodyClass = '' }) {
  const fullTitle = title ? `${title} · ${ctx.siteName}` : ctx.siteName;
  const canonical = !ctx.preview && canonicalPath && ctx.origin ? `<link rel="canonical" href="${attr(ctx.origin + canonicalPath)}">` : '';
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
${description ? `<meta name="description" content="${attr(description)}">` : ''}
${noindex || ctx.preview ? '<meta name="robots" content="noindex, nofollow">' : ''}
${canonical}
<meta property="og:title" content="${attr(fullTitle)}">
${description ? `<meta property="og:description" content="${attr(description)}">` : ''}
<meta name="theme-color" content="#3f1fae">
<link rel="icon" href="/assets/icon-64.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="stylesheet" href="${FONT}">
<link rel="stylesheet" href="/assets/site.css">
<script src="/assets/site.js" defer></script>
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">본문으로 건너뛰기</a>
${ctx.preview ? `<div class="preview-bar" role="status"><strong>미리보기</strong> 아직 게시하지 않은 초안이에요. 공개 사이트에는 보이지 않아요. <a href="/manage/publish/">게시하러 가기</a></div>` : ''}
${header}
<main id="main" tabindex="-1">
${body}
</main>
${footer(ctx)}
</body>
</html>`;
}

function footer(ctx) {
  const home = ctx.home;
  const links = [
    [`${ctx.base}/campuses/`, '학교 찾기'],
    [`${ctx.base}/events/`, '함께할 활동'],
    [`${ctx.base}/projects/`, '프로젝트'],
    [`${ctx.base}/about/`, '소개·문의']
  ];
  return `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <a class="wordmark wordmark-footer" href="${ctx.base}/">${LOGO}<span class="wordmark-text">Student <span>Collective</span></span></a>
      <p class="footer-note">각 학교의 Campus Lead가 운영하는 학생 프로그램 안내 사이트예요.</p>
    </div>
    <nav aria-label="사이트 전체">
      <ul class="footer-links">${links.map(([href, label]) => `<li><a href="${attr(href)}">${label}</a></li>`).join('')}</ul>
    </nav>
    ${home?.contactUrl ? `<p><a class="footer-contact" href="${attr(home.contactUrl)}" rel="noopener noreferrer" target="_blank">운영 문의<span class="sr-only"> (새 창)</span></a></p>` : ''}
  </div>
</footer>`;
}

// 통합 메인과 통합 목록의 머리글: 데스크톱은 얇은 고정 헤더, 모바일은 로고·학교 찾기·메뉴 버튼
export function collectiveHeader(ctx, { onHome = false } = {}) {
  const anchor = id => onHome ? `#${id}` : `${ctx.base}/#${id}`;
  const items = [[anchor('program'), '프로그램'], [anchor('campuses'), '캠퍼스'], [anchor('events'), '함께할 활동'], [anchor('projects'), '프로젝트']];
  return `<header class="site-header${onHome ? ' on-hero' : ''}" data-header>
  <div class="wrap header-row">
    <a class="wordmark" href="${ctx.base}/">${LOGO}<span class="wordmark-text">Student <span>Collective</span></span></a>
    <nav class="header-nav" aria-label="주요 메뉴">
      <ul>${items.map(([href, label]) => `<li><a href="${attr(href)}">${label}</a></li>`).join('')}</ul>
    </nav>
    <a class="btn btn-primary btn-sm header-cta" href="${ctx.base}/campuses/">학교 찾기</a>
    <details class="mobile-menu">
      <summary aria-label="메뉴 열기"><span aria-hidden="true">메뉴</span></summary>
      <nav aria-label="모바일 메뉴"><ul>${items.map(([href, label]) => `<li><a href="${attr(href)}">${label}</a></li>`).join('')}<li><a href="${ctx.base}/about/">소개·문의</a></li></ul></nav>
    </details>
  </div>
</header>`;
}

// 학교 공간 머리글: 통합 로고(/), 학교 이름(학교 홈), 학교 바꾸기, 학교 메뉴와 주요 행동
export function campusHeader(ctx, snapshot, { current = 'home' } = {}) {
  const campus = snapshot.campus;
  const base = `${ctx.base}/campuses/${campus.slug}`;
  const items = [['home', `${base}/`, '홈'], ['program', `${base}/program/`, '일정·워크숍'], ['projects', `${base}/projects/`, '프로젝트'], ['join', `${base}/join/`, '참여 안내']];
  const others = ctx.campuses.filter(item => item.campus.id !== campus.id);
  const action = primaryAction(ctx, snapshot);
  return `<header class="site-header campus-header" data-header>
  <div class="wrap header-row">
    <a class="wordmark wordmark-small" href="${ctx.base}/" aria-label="Student Collective 통합 메인">${LOGO}</a>
    <a class="campus-name" href="${base}/">${esc(campus.shortName || campus.name)}</a>
    ${others.length ? `<details class="campus-switch">
      <summary>학교 바꾸기</summary>
      <div class="switch-panel">
        <p class="switch-current">지금: <strong>${esc(campus.name)}</strong></p>
        <ul>${others.map(item => `<li><a href="${attr(campusHref(ctx, item.campus))}">${esc(item.campus.name)}</a></li>`).join('')}</ul>
        <a class="switch-all" href="${ctx.base}/campuses/">전체 학교 보기</a>
      </div>
    </details>` : ''}
    <a class="btn btn-primary btn-sm header-cta" href="${attr(action.href)}"${action.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${action.label}${action.external ? '<span class="sr-only"> (새 창)</span>' : ''}</a>
  </div>
  <nav class="wrap campus-nav" aria-label="${attr(campus.name)} 메뉴">
    <ul>${items.map(([key, href, label]) => `<li><a href="${attr(href)}"${key === current ? ' aria-current="page"' : ''}>${label}</a></li>`).join('')}</ul>
  </nav>
</header>`;
}

// 학교의 주요 행동: 기존 학습실이 연결된 학교는 '수업 듣기', 아니면 '자료 보기'
export function primaryAction(ctx, snapshot) {
  const campus = snapshot.campus;
  if (campus.learningMode === 'legacy_external' && campus.learnUrl) return { label: '수업 듣기', href: campus.learnUrl, external: !campus.learnUrl.startsWith('/') };
  return { label: '자료 보기', href: `${ctx.base}/campuses/${campus.slug}/program/#materials`, external: false };
}
