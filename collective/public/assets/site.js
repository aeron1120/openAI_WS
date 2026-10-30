// 공개 화면의 작은 동작. 이 파일이 없어도 모든 내용과 링크는 보입니다.
//  - 스크롤 등장(한 번만), #program 단계 강조, 머리글 색 전환
//  - 학교 검색 즉시 거르기(서버 검색 ?q= 도 따로 동작), 마지막 방문 학교 바로가기
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} }
  };

  // 스크롤 등장: IntersectionObserver가 있을 때만 숨김 클래스를 켭니다.
  if ('IntersectionObserver' in window && !reduce) {
    const items = [...document.querySelectorAll('[data-reveal]')];
    const viewport = window.innerHeight;
    // 처음부터 화면 안에 있는 요소는 숨기지 않습니다(첫 화면이 깜빡이지 않도록).
    for (const item of items) if (item.getBoundingClientRect().top < viewport * 0.9) item.classList.add('is-in');
    // 같은 부모 안의 형제끼리 최대 4개까지 차례로(70ms 간격)
    const groups = new Map();
    for (const item of items) {
      const list = groups.get(item.parentElement) ?? [];
      list.push(item);
      groups.set(item.parentElement, list);
    }
    for (const list of groups.values()) list.forEach((item, index) => { if (index % 4) item.classList.add(`d${index % 4}`); });
    document.documentElement.classList.add('js');
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(item => { if (!item.classList.contains('is-in')) observer.observe(item); });
  }

  // #program: 화면 가운데에 온 단계를 강조
  const steps = document.querySelectorAll('[data-step]');
  if (steps.length && 'IntersectionObserver' in window) {
    const stepObserver = new IntersectionObserver(entries => {
      for (const entry of entries) entry.target.classList.toggle('is-current', entry.isIntersecting);
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(step => stepObserver.observe(step));
  }

  // Hero를 지나면 머리글을 밝은 색으로
  const header = document.querySelector('.site-header.on-hero');
  const hero = document.querySelector('.hero');
  if (header && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => header.classList.toggle('is-scrolled', !entry.isIntersecting), { rootMargin: `-${header.offsetHeight}px 0px 0px 0px` }).observe(hero);
  }

  // 모바일 메뉴: 메뉴 안 링크를 누르면 닫기, Esc로 닫기
  for (const menu of document.querySelectorAll('details.mobile-menu, details.campus-switch')) {
    menu.addEventListener('click', event => { if (event.target.closest('a')) menu.open = false; });
    menu.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
    });
  }

  // 학교 검색: 입력하는 대로 목록을 거릅니다.
  for (const form of document.querySelectorAll('[data-campus-search]')) {
    const input = form.querySelector('input[type="search"]');
    const list = form.parentElement.querySelector('[data-campus-list]');
    const empty = form.parentElement.querySelector('[data-search-empty]');
    if (!list) continue;
    const filter = () => {
      const q = input.value.trim().toLowerCase();
      let shown = 0;
      for (const row of list.children) {
        const match = !q || row.dataset.campusName.includes(q);
        row.hidden = !match;
        if (match) { shown++; row.classList.add('is-in'); }
      }
      if (empty) empty.hidden = shown > 0;
    };
    input.addEventListener('input', filter);
  }

  // 마지막 방문 학교: 학교 홈에서 기억하고, 통합 메인 Hero에 바로가기를 보여줍니다.
  const visit = document.querySelector('[data-last-visit]');
  if (visit) store.set('sc:lastCampus', JSON.stringify({ slug: visit.dataset.lastVisit, name: visit.dataset.lastVisitName }));
  const last = document.querySelector('[data-last-campus]');
  if (last) {
    try {
      const saved = JSON.parse(store.get('sc:lastCampus') ?? 'null');
      if (saved && /^[a-z0-9-]{1,40}$/.test(saved.slug)) {
        const base = location.pathname.startsWith('/manage/preview') ? '/manage/preview' : '';
        const link = document.createElement('a');
        link.href = `${base}/campuses/${saved.slug}/`;
        link.textContent = `${saved.name} 공간으로 바로 가기 →`;
        last.append('지난번에 본 학교: ', link);
        last.hidden = false;
      }
    } catch {}
  }
})();
