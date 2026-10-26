import test from 'node:test';
import assert from 'node:assert/strict';
import { handleMapsConfig } from '../server/maps.mjs';
import { initMap } from '../workshop1/maps.mjs';

test('maps config reports missing configuration and disables caching', async () => {
  const response = handleMapsConfig(new Request('https://example.test/api/maps/config'), {});
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { configured: false, error: 'MAPS_NOT_CONFIGURED' });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('maps config returns only the browser key and map ID, never unrelated bindings', async () => {
  const request = new Request('https://example.test/api/maps/config');
  const response = handleMapsConfig(request, {
    GOOGLE_MAPS_API_KEY: ' browser-test-key ', GOOGLE_MAPS_MAP_ID: ' map-test-id ',
    KMA_SERVICE_KEY: 'must-not-be-returned', GOOGLE_CLIENT_SECRET: 'must-not-be-returned',
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    configured: true, apiKey: 'browser-test-key', mapId: 'map-test-id',
  });
  assert.equal((await handleMapsConfig(request, { GOOGLE_MAPS_API_KEY: 'test' }).json()).mapId, 'DEMO_MAP_ID');
});

test('maps config rejects mutations', async () => {
  const response = handleMapsConfig(new Request('https://example.test/api/maps/config', { method: 'POST' }), {});
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'GET');
});

const meetings = [
  { id: 'run', title: '함께 달리기', place: '공원 입구', lat: 37.469, lng: 126.945 },
  { id: 'study', title: '<img src=x onerror=alert(1)>', place: '주민센터 앞', lat: 37.471, lng: 126.937 },
];

function setup({ config = { configured: true, apiKey: 'test-key' }, responseStatus = 200, scriptError = false } = {}) {
  const createdMaps = [], createdMarkers = [], infoWindows = [], fetched = [];
  class Element {
    constructor(tagName, document) { this.tagName = tagName; this.ownerDocument = document; this.dataset = {}; this.children = []; this.attributes = {}; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    setAttribute(name, value) { this.attributes[name] = value; }
    remove() { this.removed = true; }
  }
  class GoogleMap {
    constructor(canvas, options) { this.canvas = canvas; this.options = options; createdMaps.push(this); }
    panTo(position) { this.center = position; }
    setZoom(zoom) { this.zoom = zoom; }
    fitBounds(bounds, padding) { this.bounds = bounds; this.padding = padding; }
  }
  class InfoWindow {
    constructor() { infoWindows.push(this); }
    setContent(content) { this.content = content; }
    open(options) { this.openOptions = options; }
    close() { this.closed = true; }
  }
  class AdvancedMarkerElement {
    constructor(options) { Object.assign(this, options); this.events = new Map(); createdMarkers.push(this); }
    addEventListener(name, handler) { this.events.set(name, handler); }
    removeEventListener(name, handler) { if (this.events.get(name) === handler) this.events.delete(name); }
    click() { this.events.get('gmp-click')?.(); }
  }
  const win = {
    fetch: async (url, options) => {
      fetched.push({ url, options });
      return new Response(JSON.stringify(config), { status: responseStatus });
    },
    google: {
      maps: {
        importLibrary: async name => name === 'maps' ? { Map: GoogleMap, InfoWindow } : { AdvancedMarkerElement },
        LatLngBounds: class { constructor() { this.points = []; } extend(point) { this.points.push(point); } },
      },
    },
  };
  const doc = { defaultView: win, createElement: tag => new Element(tag, doc) };
  doc.head = new Element('head', doc);
  if (scriptError) {
    delete win.google;
    doc.head.append = script => { doc.head.children.push(script); queueMicrotask(() => script.onerror()); };
  }
  return { win, doc, container: new Element('div', doc), createdMaps, createdMarkers, infoWindows, fetched };
}

test('each meeting has a marker; card selection centers, marker selection also calls back', async () => {
  const fake = setup();
  const callbacks = [];
  const controller = await initMap({ container: fake.container, meetings, onSelect: id => callbacks.push(id) });
  assert.equal(controller.status, 'ready');
  assert.equal(fake.container.dataset.mapState, 'ready');
  assert.equal(fake.createdMarkers.length, 2);
  assert.equal(fake.createdMaps[0].options.mapId, 'DEMO_MAP_ID');
  assert.deepEqual(fake.createdMarkers[1].position, { lat: 37.471, lng: 126.937 });
  assert.equal(fake.createdMarkers[1].gmpClickable, true);
  assert.equal(controller.select('study'), true);
  assert.deepEqual(fake.createdMaps[0].center, { lat: 37.471, lng: 126.937 });
  assert.equal(fake.createdMaps[0].zoom, 16);
  assert.deepEqual(callbacks, []);
  assert.equal(fake.infoWindows[0].content.children[0].textContent, meetings[1].title);
  assert.equal(fake.infoWindows[0].openOptions.shouldFocus, false);
  assert.equal(fake.infoWindows[0].openOptions.anchor, fake.createdMarkers[1]);
  fake.createdMarkers[0].click();
  assert.deepEqual(callbacks, ['run']);
  assert.equal(controller.select('unknown'), false);
  assert.equal(fake.fetched[0].url, '/api/maps/config');
  assert.equal(fake.fetched[0].options.credentials, 'same-origin');
  controller.destroy();
  assert.equal(controller.status, 'destroyed');
  assert.equal(controller.select('run'), false);
  assert.ok(fake.createdMarkers.every(marker => marker.map === null && marker.events.size === 0));
  assert.equal(fake.win.gm_authFailure, undefined);
});

test('missing keys show an explicit state without creating a map', async () => {
  const fake = setup({ config: { configured: false, error: 'MAPS_NOT_CONFIGURED' }, responseStatus: 503 });
  const controller = await initMap({ container: fake.container, meetings });
  assert.equal(controller.status, 'missing-key');
  assert.equal(fake.createdMaps.length, 0);
  assert.equal(controller.select('run'), false);
});

test('invalid coordinates never produce fabricated marker locations', async () => {
  const fake = setup();
  const controller = await initMap({ container: fake.container, meetings: [
    { ...meetings[0], lat: NaN }, { ...meetings[1], lng: 181 },
  ] });
  assert.equal(controller.status, 'empty');
  assert.equal(fake.fetched.length, 0);
  assert.equal(fake.createdMaps.length, 0);
});

test('authentication failure after initialization clears markers and preserves the existing handler', async () => {
  const fake = setup();
  let previousCalled = 0;
  const previous = () => { previousCalled++; };
  fake.win.gm_authFailure = previous;
  const controller = await initMap({ container: fake.container, meetings });
  fake.win.gm_authFailure();
  assert.equal(previousCalled, 1);
  assert.equal(controller.status, 'error');
  assert.equal(fake.container.children[0].attributes.role, 'alert');
  assert.equal(controller.select('run'), false);
  assert.ok(fake.createdMarkers.every(marker => marker.map === null));
  controller.destroy();
  assert.equal(fake.win.gm_authFailure, previous);
});

test('script load failure becomes a retryable page state and releases callbacks', async () => {
  const fake = setup({ scriptError: true });
  const controller = await initMap({ container: fake.container, meetings });
  assert.equal(controller.status, 'error');
  assert.equal(fake.doc.head.children.length, 1);
  assert.equal(fake.doc.head.children[0].removed, true);
  assert.ok(fake.doc.head.children[0].src.startsWith('https://maps.googleapis.com/maps/api/js?'));
  assert.equal(Object.keys(fake.win).some(key => key.startsWith('__workshopMapsReady')), false);
  assert.equal(fake.win.gm_authFailure, undefined);
});

test('configuration network failure displays an error, not a map substitute', async () => {
  const fake = setup();
  fake.win.fetch = async () => { throw new Error('offline'); };
  const controller = await initMap({ container: fake.container, meetings });
  assert.equal(controller.status, 'error');
  assert.equal(fake.createdMaps.length, 0);
  assert.equal(fake.container.children[0].className, 'map-state');
});

test('a failed Maps library import releases the authentication listener', async () => {
  const fake = setup();
  fake.win.google.maps.importLibrary = async () => { throw new Error('blocked-library'); };
  const controller = await initMap({ container: fake.container, meetings });
  assert.equal(controller.status, 'error');
  assert.equal(fake.createdMaps.length, 0);
  assert.equal(fake.win.gm_authFailure, undefined);
});
