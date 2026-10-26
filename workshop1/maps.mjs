const libraryLoads = new WeakMap();
const authObservers = new WeakMap();
let callbackNumber = 0;

function observeAuthentication(win, listener) {
  let registry = authObservers.get(win);
  if (!registry) {
    registry = { previous: win.gm_authFailure, listeners: new Set() };
    registry.callback = () => {
      for (const notify of [...registry.listeners]) notify();
      if (typeof registry.previous === 'function') registry.previous();
    };
    authObservers.set(win, registry);
    win.gm_authFailure = registry.callback;
  }
  registry.listeners.add(listener);
  return () => {
    registry.listeners.delete(listener);
    if (registry.listeners.size === 0) {
      if (win.gm_authFailure === registry.callback) {
        if (registry.previous === undefined) delete win.gm_authFailure;
        else win.gm_authFailure = registry.previous;
      }
      authObservers.delete(win);
    }
  };
}

function loadLibraries(win, doc, apiKey) {
  if (libraryLoads.has(win)) return libraryLoads.get(win);
  const load = new Promise((resolve, reject) => {
    const importLibraries = () => Promise.all([
      win.google.maps.importLibrary('maps'), win.google.maps.importLibrary('marker'),
    ]).then(([maps, marker]) => ({ ...maps, ...marker }));
    if (win.google?.maps?.importLibrary) {
      const timer = setTimeout(() => reject(new Error('MAPS_LOAD_TIMEOUT')), 15000);
      Promise.resolve().then(importLibraries).then(resolve, reject).finally(() => clearTimeout(timer));
      return;
    }
    const callback = `__workshopMapsReady${++callbackNumber}`;
    const script = doc.createElement('script');
    let settled = false;
    const finish = (error, libraries) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      delete win[callback];
      script.onerror = null;
      if (error) { script.remove(); reject(error); }
      else resolve(libraries);
    };
    const timer = setTimeout(() => finish(new Error('MAPS_LOAD_TIMEOUT')), 15000);
    win[callback] = () => {
      if (!win.google?.maps?.importLibrary) return finish(new Error('MAPS_LOAD_FAILED'));
      Promise.resolve().then(importLibraries).then(libraries => finish(null, libraries), error => finish(error));
    };
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({
      key: apiKey, loading: 'async', v: 'weekly', callback, language: 'ko', region: 'KR',
    })}`;
    script.async = true;
    script.onerror = () => finish(new Error('MAPS_LOAD_FAILED'));
    doc.head.append(script);
  });
  libraryLoads.set(win, load);
  load.catch(() => libraryLoads.delete(win));
  return load;
}

function validMeetings(meetings) {
  const seen = new Set();
  return (Array.isArray(meetings) ? meetings : []).filter(meeting => {
    if (!meeting || meeting.id == null || seen.has(String(meeting.id))) return false;
    if (!Number.isFinite(meeting.lat) || !Number.isFinite(meeting.lng)) return false;
    if (Math.abs(meeting.lat) > 90 || Math.abs(meeting.lng) > 180) return false;
    seen.add(String(meeting.id));
    return true;
  });
}

/** Selecting a card calls select(id); clicking a marker calls onSelect(id). */
export async function initMap({ container, meetings, onSelect = () => {} }) {
  if (!container?.ownerDocument) throw new TypeError('A map container element is required.');
  const doc = container.ownerDocument;
  const win = doc.defaultView;
  let state = 'loading';
  let map;
  let infoWindow;
  let stopAuth = () => {};
  const markers = new Map();

  function message(nextState, title, description) {
    state = nextState;
    container.dataset.mapState = state;
    const box = doc.createElement('div');
    box.className = 'map-state';
    box.setAttribute('role', nextState === 'error' ? 'alert' : 'status');
    const heading = doc.createElement('strong');
    heading.className = 'map-state-title';
    heading.textContent = title;
    const detail = doc.createElement('p');
    detail.className = 'map-state-description';
    detail.textContent = description;
    box.append(heading, detail);
    container.replaceChildren(box);
  }

  function removeMarkers() {
    for (const { marker, click } of markers.values()) {
      marker.removeEventListener('gmp-click', click);
      marker.map = null;
    }
    markers.clear();
    infoWindow?.close();
  }

  const controller = {
    get status() { return state; },
    select(id) {
      const entry = markers.get(String(id));
      if (state !== 'ready' || !entry) return false;
      map.panTo({ lat: entry.meeting.lat, lng: entry.meeting.lng });
      map.setZoom(16);
      const content = doc.createElement('div');
      content.className = 'map-info';
      const title = doc.createElement('strong');
      title.className = 'map-info-title';
      title.textContent = String(entry.meeting.title ?? '모임');
      const place = doc.createElement('p');
      place.className = 'map-info-place';
      place.textContent = String(entry.meeting.place ?? '');
      content.append(title, place);
      infoWindow.setContent(content);
      infoWindow.open({ map, anchor: entry.marker, shouldFocus: false });
      return true;
    },
    destroy() {
      if (state === 'destroyed') return;
      removeMarkers();
      stopAuth();
      state = 'destroyed';
      container.dataset.mapState = state;
      container.replaceChildren();
    },
  };

  const locations = validMeetings(meetings);
  if (!locations.length) {
    message('empty', '표시할 모임 장소가 없어요', '위치가 등록된 모임을 선택해 주세요.');
    return controller;
  }
  message('loading', '모임 장소를 불러오는 중이에요', 'Google 지도에서 만날 장소를 확인할 수 있어요.');
  try {
    const abort = new AbortController();
    const configTimer = setTimeout(() => abort.abort(), 10000);
    let response;
    let config;
    try {
      response = await win.fetch('/api/maps/config', {
        cache: 'no-store', credentials: 'same-origin', signal: abort.signal,
      });
      config = await response.json();
    } finally { clearTimeout(configTimer); }
    if (config?.error === 'MAPS_NOT_CONFIGURED' || config?.configured === false) {
      message('missing-key', '지도를 준비하고 있어요', '지도 연결 설정이 완료되면 모임 장소가 표시돼요.');
      return controller;
    }
    if (!response.ok || typeof config?.apiKey !== 'string' || !config.apiKey.trim()) {
      throw new Error('MAPS_CONFIG_FAILED');
    }
    let rejectAuth;
    const authenticationFailure = new Promise((_, reject) => { rejectAuth = reject; });
    stopAuth = observeAuthentication(win, () => {
      if (state === 'destroyed') return;
      removeMarkers();
      message('error', '지도를 연결하지 못했어요', '지도 연결 설정을 확인한 뒤 페이지를 새로고침해 주세요.');
      rejectAuth(new Error('MAPS_AUTH_FAILED'));
    });
    const { Map: GoogleMap, InfoWindow, AdvancedMarkerElement } = await Promise.race([
      loadLibraries(win, doc, config.apiKey.trim()), authenticationFailure,
    ]);
    if (state === 'error') return controller;
    const canvas = doc.createElement('div');
    canvas.className = 'map-canvas';
    canvas.setAttribute('aria-label', '모임 장소 지도');
    container.replaceChildren(canvas);
    map = new GoogleMap(canvas, {
      center: { lat: locations[0].lat, lng: locations[0].lng },
      zoom: 14,
      mapId: config.mapId || 'DEMO_MAP_ID',
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
    });
    infoWindow = new InfoWindow();
    for (const meeting of locations) {
      const marker = new AdvancedMarkerElement({
        map, position: { lat: meeting.lat, lng: meeting.lng },
        title: String(meeting.title ?? '모임'), gmpClickable: true,
      });
      const click = () => { if (controller.select(meeting.id)) onSelect(meeting.id); };
      marker.addEventListener('gmp-click', click);
      markers.set(String(meeting.id), { marker, meeting, click });
    }
    if (locations.length > 1 && win.google.maps.LatLngBounds) {
      const bounds = new win.google.maps.LatLngBounds();
      locations.forEach(meeting => bounds.extend({ lat: meeting.lat, lng: meeting.lng }));
      map.fitBounds(bounds, 48);
    }
    state = 'ready';
    container.dataset.mapState = state;
  } catch {
    removeMarkers();
    stopAuth();
    if (state !== 'error') {
      message('error', '지도를 불러오지 못했어요', '인터넷 연결을 확인한 뒤 페이지를 새로고침해 주세요.');
    }
  }
  return controller;
}
