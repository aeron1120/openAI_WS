// 운영진용: 홈 배너의 돌아가는 지구에 쓰는 육지 지도(public/images/brand/earth-mask.png)를 만듭니다.
// 사용법: node portal/scripts/earth-mask.mjs  (인터넷 필요, 사이트 빌드에는 필요하지 않음)
// 원본: Natural Earth 육지 경계(world-atlas, 공개 데이터). 가로 = 경도 -180~180, 세로 = 위도 90~-90.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const SOURCE = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-50m.json';
const OUT = fileURLToPath(new URL('../public/images/brand/earth-mask.png', import.meta.url));
const W = 1024, H = 512, SS = 4; // 4×4 표본으로 경계를 부드럽게

// TopoJSON → 고리(ring) 목록 [[lon, lat], ...]
function rings(topology) {
  const { scale, translate } = topology.transform;
  const arcs = topology.arcs.map(arc => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => { x += dx; y += dy; return [x * scale[0] + translate[0], y * scale[1] + translate[1]]; });
  });
  const ring = indexes => indexes.flatMap((i, k) => {
    const points = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
    return k ? points.slice(1) : points;
  });
  const out = [];
  const add = g => {
    if (g.type === 'GeometryCollection') g.geometries.forEach(add);
    else if (g.type === 'Polygon') g.arcs.forEach(r => out.push(ring(r)));
    else if (g.type === 'MultiPolygon') g.arcs.forEach(p => p.forEach(r => out.push(ring(r))));
  };
  add(topology.objects.land);
  return out;
}

// 날짜변경선(±180°)을 넘는 고리는 경도를 이어 붙이고, 극을 한 바퀴 두르는 고리(남극)는 극까지 닫습니다.
// 이어 붙인 고리는 -360·0·+360만큼 옮긴 세 벌을 그려 지도 양 끝에서 잘리지 않게 합니다.
function unwrap(r) {
  let offset = 0;
  const out = r.map(([lon, lat], i) => {
    if (i) {
      const prev = r[i - 1][0] + offset;
      if (lon + offset - prev > 180) offset -= 360;
      else if (lon + offset - prev < -180) offset += 360;
    }
    return [lon + offset, lat];
  });
  if (Math.abs(out.at(-1)[0] - out[0][0]) > 180) {
    const pole = out.reduce((s, p) => s + p[1], 0) < 0 ? -90 : 90;
    out.push([out.at(-1)[0], pole], [out[0][0], pole], out[0]);
  }
  return [-360, 0, 360].map(shift => out.map(([lon, lat]) => [lon + shift, lat]));
}

// 짝홀 규칙 스캔라인 채우기(큰 해상도) → 평균 내어 W×H 회색조
function rasterize(list) {
  const w = W * SS, h = H * SS;
  const rows = Array.from({ length: h }, () => []);
  for (const r of list.flatMap(unwrap)) {
    for (let i = 0; i < r.length - 1; i++) {
      const [x0, y0] = [(r[i][0] + 180) / 360 * w, (90 - r[i][1]) / 180 * h];
      const [x1, y1] = [(r[i + 1][0] + 180) / 360 * w, (90 - r[i + 1][1]) / 180 * h];
      if (y0 === y1) continue;
      const top = Math.ceil(Math.min(y0, y1) - 0.5), bottom = Math.floor(Math.max(y0, y1) - 0.5);
      for (let y = Math.max(top, 0); y <= Math.min(bottom, h - 1); y++) {
        const cy = y + 0.5;
        if (cy < Math.min(y0, y1) || cy >= Math.max(y0, y1)) continue;
        rows[y].push(x0 + (cy - y0) / (y1 - y0) * (x1 - x0));
      }
    }
  }
  const sum = new Uint16Array(W * H);
  rows.forEach((xs, y) => {
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(0, Math.ceil(xs[k] - 0.5)), to = Math.min(w - 1, Math.floor(xs[k + 1] - 0.5));
      for (let x = from; x <= to; x++) sum[Math.floor(y / SS) * W + Math.floor(x / SS)]++;
    }
  });
  return Uint8Array.from(sum, v => Math.round(v / (SS * SS) * 255));
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = bytes => { let c = 0xffffffff; for (const b of bytes) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}
function png(gray) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(W, 0);
  header.writeUInt32BE(H, 4);
  header[8] = 8; header[9] = 0; // 8비트 회색조
  const raw = Buffer.alloc((W + 1) * H);
  for (let y = 0; y < H; y++) Buffer.from(gray.buffer, y * W, W).copy(raw, y * (W + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const topology = await (await fetch(SOURCE)).json();
writeFileSync(OUT, png(rasterize(rings(topology))));
console.log(`저장: ${OUT}`);
