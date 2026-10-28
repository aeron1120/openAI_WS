// 홈 배너의 지구: 그림 속 지구 자리에 실제 육지 지도(images/brand/earth-mask.png)로 그린 지구를 겹쳐 천천히 돌립니다.
// 마우스·손가락으로 끌면 돌아가고, 놓으면 관성으로 돌다가 원래 속도로 돌아옵니다.
// 화면 밖에 있거나 탭이 숨겨지면 멈추고, '동작 줄이기' 설정이면 스스로 돌지 않습니다(끌기는 됨).
const OCEAN = [100, 49, 242];
const LAND = [10, 190, 80];
const TILT = 0.38;   // 북쪽으로 기운 정도(라디안). 배너 그림처럼 북반구가 조금 더 보이게
const SPIN = 0.22;   // 스스로 도는 속도(라디안/초) ≈ 28초에 한 바퀴
const MAX_SIZE = 640;
// 지구 자리(배너 너비 기준): 가운데 x 49.5%, y는 배너 높이의 50%, 지름 42.6% (styles.css의 .globe와 같게)
const GLOBE_X = 0.495, GLOBE_D = 0.426;
const TEXT_RIGHT = 0.35; // 배너 왼쪽 글씨가 끝나는 곳. 이보다 왼쪽의 흰 글씨는 지구 위로 그대로 보이게 둡니다.

const banner = document.querySelector('[data-globe]');
if (banner) startGlobe(banner);

function startGlobe(banner) {
  const canvas = banner.querySelector('.globe');
  const tip = banner.querySelector('.globe-tip');
  const picture = banner.querySelector('img');
  const cutout = document.createElement('canvas');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let mask, maskW, maskH;
  let size = 0, lonU, rowStart, shade, alpha, image, rim, gloss;
  let center = -0.7;   // 처음 모습: 배너 그림처럼 대서양이 가운데(경도 약 -40°)
  let velocity = 0, drag = null, visible = true, running = false, last = 0;

  // 화면 픽셀마다 위도·경도를 미리 계산해 둡니다. 돌릴 때는 경도만 더하면 됩니다.
  function layout() {
    const width = canvas.getBoundingClientRect().width;
    const next = Math.min(MAX_SIZE, Math.round(width * Math.min(devicePixelRatio || 1, 2)));
    if (!next || next === size) return;
    size = canvas.width = canvas.height = next;
    const n = size * size;
    lonU = new Float32Array(n);
    rowStart = new Int32Array(n);
    shade = new Float32Array(n);
    alpha = new Uint8ClampedArray(n);
    const sinT = Math.sin(TILT), cosT = Math.cos(TILT);
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const p = j * size + i;
        const x = (i + 0.5) / size * 2 - 1, y = 1 - (j + 0.5) / size * 2;
        const d = Math.hypot(x, y);
        alpha[p] = Math.min(1, Math.max(0, (1 - d) * size / 2 + 0.5)) * 255;
        if (!alpha[p]) continue;
        const z = Math.sqrt(Math.max(0, 1 - d * d));
        const lat = Math.asin(Math.min(1, Math.max(-1, y * cosT + z * sinT)));
        const lon = Math.atan2(x, z * cosT - y * sinT);
        lonU[p] = (lon + Math.PI) / (2 * Math.PI) * maskW;
        rowStart[p] = Math.min(maskH - 1, Math.floor((0.5 - lat / Math.PI) * maskH)) * maskW;
        shade[p] = 0.55 + 0.45 * Math.pow(z, 0.6);
      }
    }
    image = ctx.createImageData(size, size);
    const r = size / 2;
    rim = ctx.createRadialGradient(r, r, r * 0.8, r, r, r);
    rim.addColorStop(0, 'rgba(170, 255, 205, 0)');
    rim.addColorStop(1, 'rgba(170, 255, 205, .5)');
    gloss = ctx.createRadialGradient(r * 0.7, r * 0.55, 0, r * 0.7, r * 0.55, r);
    gloss.addColorStop(0, 'rgba(255, 255, 255, .2)');
    gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
    makeCutout();
  }

  // 배너 글씨("OpenAI Student")가 지구와 겹치는 곳: 그림에서 흰 글씨만 골라 지구에서 비워 둡니다.
  function makeCutout() {
    cutout.width = cutout.height = size;
    const c = cutout.getContext('2d', { willReadFrequently: true });
    const w = picture.naturalWidth, h = picture.naturalHeight;
    if (!w) return;
    const k = size / (GLOBE_D * w);
    const left = (GLOBE_X - GLOBE_D / 2) * w, top = h / 2 - GLOBE_D * w / 2;
    c.drawImage(picture, -left * k, -top * k, w * k, h * k);
    const text = Math.max(0, Math.min(size, Math.ceil((TEXT_RIGHT * w - left) * k)));
    if (!text) { c.clearRect(0, 0, size, size); return; }
    const shot = c.getImageData(0, 0, size, size);
    const d = shot.data;
    for (let p = 0; p < d.length; p += 4) {
      const white = (p / 4) % size < text ? Math.min(d[p], d[p + 1], d[p + 2]) : 0;
      d[p + 3] = Math.min(255, Math.max(0, (white - 150) * 3.2));
    }
    c.putImageData(shot, 0, 0);
  }

  function draw() {
    if (!image) return;
    const data = image.data;
    const offset = center / (2 * Math.PI) * maskW;
    for (let p = 0, q = 0; p < alpha.length; p++, q += 4) {
      const a = alpha[p];
      data[q + 3] = a;
      if (!a) continue;
      let u = Math.floor(lonU[p] + offset) % maskW;
      if (u < 0) u += maskW;
      const m = mask[rowStart[p] + u] / 255, s = shade[p];
      data[q] = (OCEAN[0] + (LAND[0] - OCEAN[0]) * m) * s;
      data[q + 1] = (OCEAN[1] + (LAND[1] - OCEAN[1]) * m) * s;
      data[q + 2] = (OCEAN[2] + (LAND[2] - OCEAN[2]) * m) * s;
    }
    ctx.putImageData(image, 0, 0);
    // 가장자리 빛과 왼쪽 위 반사광은 지구 위에만 칠합니다.
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = gloss;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(cutout, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }

  function frame(time) {
    running = false;
    const dt = Math.min(0.05, last ? (time - last) / 1000 : 0);
    last = time;
    if (!drag) {
      const target = reduce.matches ? 0 : -SPIN;
      velocity += (target - velocity) * Math.min(1, dt * 1.5);
      center += velocity * dt;
    }
    draw();
    schedule();
  }
  function schedule() {
    if (running || !visible || document.hidden) { last = 0; return; }
    if (!drag && reduce.matches && Math.abs(velocity) < 0.001) { last = 0; return; }
    running = true;
    requestAnimationFrame(frame);
  }

  // 끌어서 돌리기. 세로로 끌면 페이지가 스크롤되도록 가로 움직임만 받습니다(CSS touch-action).
  canvas.addEventListener('pointerdown', event => {
    drag = { id: event.pointerId, x: event.clientX, t: event.timeStamp };
    canvas.setPointerCapture(event.pointerId);
    banner.classList.add('is-dragging');
    tip.hidden = true;
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== drag?.id) return;
    const radius = canvas.getBoundingClientRect().width / 2;
    const turn = (event.clientX - drag.x) / radius;
    const dt = Math.max(8, event.timeStamp - drag.t) / 1000;
    center -= turn;
    velocity = velocity * 0.4 - (turn / dt) * 0.6;
    drag.x = event.clientX;
    drag.t = event.timeStamp;
    schedule();
  });
  const release = () => {
    if (!drag) return;
    drag = null;
    banner.classList.remove('is-dragging');
    velocity = Math.max(-6, Math.min(6, velocity));
    schedule();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }).observe(banner);
  document.addEventListener('visibilitychange', schedule);
  reduce.addEventListener?.('change', schedule);
  new ResizeObserver(() => { if (mask) { layout(); draw(); } }).observe(canvas);

  const img = new Image();
  img.src = '/images/brand/earth-mask.png';
  Promise.all([img.decode(), picture.decode()]).then(() => {
    const source = document.createElement('canvas');
    source.width = maskW = img.naturalWidth;
    source.height = maskH = img.naturalHeight;
    const sctx = source.getContext('2d', { willReadFrequently: true });
    sctx.drawImage(img, 0, 0);
    const pixels = sctx.getImageData(0, 0, maskW, maskH).data;
    mask = new Uint8Array(maskW * maskH);
    for (let i = 0; i < mask.length; i++) mask[i] = pixels[i * 4];
    layout();
    draw();
    banner.classList.add('is-ready');
    tip.hidden = false;
    velocity = reduce.matches ? 0 : -SPIN;
    schedule();
  }).catch(() => {});
}
