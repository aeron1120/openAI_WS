// 정적 미리보기와 운영진 설정을 반영한 실서비스가 같은 페이지 구성을 씁니다.
import * as pages from './pages.mjs';
import * as learnPages from './learn-pages.mjs';
import { layout, learnLayout } from './layout.mjs';
import { localizeHtml } from './i18n.mjs';

export function routes(content) {
  return [
    { path: '/', render: pages.homePage, description: content.site.description, script: 'home.js' },
    { path: '/roadmap/', title: '학기 로드맵', render: pages.roadmapPage, description: '워크숍 4회와 Studio Session, Showcase로 이어지는 한 학기 과정과 단계별 결과물.' },
    { path: '/workshops/', title: '워크숍과 실습 자료', render: pages.workshopsPage, description: '회차별 주제, 진행 상태, 실습 자료를 한곳에서 확인하세요.' },
    ...content.workshops.map(w => ({ path: `/workshops/${w.slug}/`, title: `Workshop ${w.slug} · ${w.title}`, render: c => pages.workshopPage(c, w), description: [w.message, w.summary].filter(Boolean).join(' — ') })),
    { path: '/studio/', title: 'Studio Session', render: pages.studioPage, description: content.studio.description },
    { path: '/showcase/', title: 'Showcase', render: pages.showcasePage, description: content.showcase.description },
    { path: '/recap/', title: 'Recap', render: pages.recapPage, description: '행사 사진과 그날 한 일을 모아 둔 활동 기록.' },
    ...pages.visibleRecaps(content).map(r => ({ path: pages.recapPath(r), title: `${r.title} · Recap`, render: c => pages.recapDetailPage(c, r), description: r.summary || 'Recap' })),
    { path: '/about/', title: '운영 소개와 협력 안내', render: pages.aboutPage, description: `${content.site.name} 운영진, 진행 기록, 협력 방식 안내.` },
    { path: '/learn/', title: '수업 듣기', render: learnPages.learnPage, description: '서울대 계정으로 로그인하고 슬라이드를 보며 단계별로 실습해요.', script: ['learn.js', 'questions.js'], layout: 'learn' },
    { path: '/learn/questions/', title: '내 질문', render: learnPages.questionsPage, description: '수업 중 남긴 질문과 운영진의 답을 확인해요.', script: ['learn.js', 'questions.js'], layout: 'learn' },
    { path: '/admin/', title: '운영진', render: learnPages.adminPage, description: '운영진용 질문 답변과 수업 진행 화면.', script: ['learn.js', 'questions.js', 'admin.js'], layout: 'learn' },
    ...learnPages.lessonWorkshops(content).map(w => ({ path: learnPages.lessonPath(w), title: `수업 · Workshop ${w.slug}`, render: c => learnPages.lessonPage(c, w), description: `${w.title} — 슬라이드를 보며 단계별로 실습해요.`, script: ['learn.js', 'questions.js'], layout: 'learn' }))
  ];
}

export function renderRoute(route, content, assets, { english = false, translator, enPaths } = {}) {
  const page = { site: content.site, content, path: route.path, title: route.title, description: route.description, body: String(route.render(content)), assets, script: route.script };
  if (route.layout === 'learn') return learnLayout(page);
  const alt = { ko: route.path, en: `/en${route.path}` };
  return english ? localizeHtml(layout({ ...page, path: alt.en, lang: 'en', alt }), translator, enPaths) : layout({ ...page, alt });
}
