// 로컬 저장소: 내 컴퓨터에서 전체 흐름을 확인할 때 씁니다. file이 있으면 JSON 파일에 저장해 재시작 후에도 남고,
// 없으면 메모리에만 둡니다(테스트). 운영(Supabase) 저장소와 같은 함수와 같은 규칙(revision 충돌, 게시 원자성, 재시도 중복 방지)을 따릅니다.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ConflictError } from './errors.mjs';

const empty = () => ({ items: {}, releases: [], active: {}, jobs: {}, audit: [], media: {} });
const clone = value => structuredClone(value);
const releaseSummary = ({ snapshot, itemRevisions, ...rest }) => rest;

export async function createLocalStore({ file = null, mediaDir = null } = {}) {
  let state = empty();
  if (file) {
    try { state = { ...empty(), ...JSON.parse(await readFile(file, 'utf8')) }; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const memoryMedia = new Map();
  // 쓰기는 한 번에 하나씩: 파일을 임시 이름으로 쓴 뒤 바꿔 끼워, 도중에 멈춰도 이전 파일이 깨지지 않게 합니다.
  let queue = Promise.resolve();
  const persist = () => {
    if (!file) return Promise.resolve();
    const text = JSON.stringify(state);
    queue = queue.then(async () => {
      await mkdir(dirname(file), { recursive: true });
      await writeFile(`${file}.tmp`, text);
      await rename(`${file}.tmp`, file);
    });
    return queue;
  };

  return {
    kind: file ? 'local-file' : 'memory',
    async listItems({ kind, campusId } = {}) {
      return clone(Object.values(state.items).filter(item => (!kind || item.kind === kind) && (campusId === undefined || item.campusId === campusId)));
    },
    async getItem(id) {
      return state.items[id] ? clone(state.items[id]) : null;
    },
    async createItem({ id = randomUUID(), kind, campusId = null, data, actor, now }) {
      if (state.items[id]) throw new ConflictError('이미 있는 항목이에요.', { id });
      state.items[id] = { id, kind, campusId, data: clone(data), revision: 1, createdAt: now, updatedAt: now, updatedBy: actor };
      await persist();
      return clone(state.items[id]);
    },
    async updateItem({ id, data, expectedRevision, actor, now }) {
      const item = state.items[id];
      if (!item) return null;
      if (item.revision !== expectedRevision) throw new ConflictError('다른 화면에서 먼저 저장했어요.', { current: clone(item) });
      Object.assign(item, { data: clone(data), revision: item.revision + 1, updatedAt: now, updatedBy: actor });
      await persist();
      return clone(item);
    },
    async listReleases({ scope } = {}) {
      return state.releases.filter(release => !scope || release.scope === scope).map(releaseSummary).reverse();
    },
    async getRelease(id) {
      const release = state.releases.find(item => item.id === id);
      return release ? clone(release) : null;
    },
    async activeReleases() {
      return Object.entries(state.active).map(([scope, id]) => clone(state.releases.find(release => release.id === id))).filter(Boolean);
    },
    // 게시: 모든 대상의 revision을 먼저 확인하고, 하나라도 바뀌었으면 아무것도 반영하지 않습니다.
    // 같은 requestId로 다시 요청하면 새로 만들지 않고 처음 결과를 돌려줍니다.
    async publish({ requestId, actor, entries, now }) {
      if (state.jobs[requestId]) return { duplicate: true, releases: clone(state.jobs[requestId].releases) };
      for (const entry of entries) {
        for (const [id, revision] of Object.entries(entry.itemRevisions ?? {})) {
          if (state.items[id]?.revision !== revision) throw new ConflictError('게시 준비 뒤에 바뀐 내용이 있어요.', { id, scope: entry.scope });
        }
      }
      const releases = entries.map(entry => {
        const number = state.releases.filter(release => release.scope === entry.scope).length + 1;
        const release = { id: randomUUID(), scope: entry.scope, number, kind: entry.kind ?? 'publish', restoredFrom: entry.restoredFrom ?? null, snapshot: clone(entry.snapshot), itemRevisions: clone(entry.itemRevisions ?? {}), summary: clone(entry.summary ?? {}), createdAt: now, createdBy: actor, requestId };
        state.releases.push(release);
        state.active[entry.scope] = release.id;
        state.audit.push({ id: randomUUID(), at: now, actor, action: release.kind, scope: entry.scope, target: release.id, summary: { number, ...release.summary } });
        return releaseSummary(release);
      });
      state.jobs[requestId] = { at: now, actor, releases };
      await persist();
      return { duplicate: false, releases: clone(releases) };
    },
    async addAudit({ actor, action, scope = null, target = null, summary = {}, now }) {
      state.audit.push({ id: randomUUID(), at: now, actor, action, scope, target, summary });
      await persist();
    },
    async listAudit({ limit = 100 } = {}) {
      return clone(state.audit.slice(-limit).reverse());
    },
    async putMedia({ id, bytes, mime, size, sha256, filename, actor, now }) {
      if (mediaDir) {
        await mkdir(mediaDir, { recursive: true });
        await writeFile(join(mediaDir, id), bytes);
      } else {
        memoryMedia.set(id, Buffer.from(bytes));
      }
      state.media[id] = { id, mime, size, sha256, filename, createdAt: now, createdBy: actor };
      await persist();
      return clone(state.media[id]);
    },
    async getMediaInfo(id) {
      return state.media[id] ? clone(state.media[id]) : null;
    },
    async listMedia() {
      return clone(Object.values(state.media)).reverse();
    },
    async getMediaBytes(id) {
      if (!state.media[id]) return null;
      return mediaDir ? readFile(join(mediaDir, id)) : memoryMedia.get(id) ?? null;
    }
  };
}
