// 운영 저장소: Supabase(Postgres + Storage). 테이블은 cms_ 접두어로 기존 학습 데이터와 구분합니다(schema.sql).
// 서비스 키는 서버에서만 씁니다. 게시는 DB 함수 cms_publish 하나가 검증·스냅샷·active 전환·기록을 한 트랜잭션으로 처리합니다.
import { ConflictError } from './errors.mjs';

export const MEDIA_BUCKET = 'cms-media';
const enc = encodeURIComponent;

class SupabaseError extends Error {
  constructor(status, body) { super(`Supabase ${status}`); this.status = status; this.body = body; }
}

const toItem = row => row && ({ id: row.id, kind: row.kind, campusId: row.campus_id, data: row.data, revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at, updatedBy: row.updated_by });
const toRelease = row => row && ({ id: row.id, scope: row.scope, number: row.number, kind: row.kind, restoredFrom: row.restored_from, summary: row.summary, createdAt: row.created_at, createdBy: row.created_by, ...(row.snapshot !== undefined ? { snapshot: row.snapshot } : {}), ...(row.item_revisions !== undefined ? { itemRevisions: row.item_revisions } : {}) });
const toMedia = row => row && ({ id: row.id, mime: row.mime, size: row.size, sha256: row.sha256, filename: row.filename, createdAt: row.created_at, createdBy: row.created_by });
const ITEM = 'id,kind,campus_id,data,revision,created_at,updated_at,updated_by';
const RELEASE_META = 'id,scope,number,kind,restored_from,summary,created_at,created_by';

export function createSupabaseStore({ url, key, fetchImpl = fetch }) {
  const auth = { apikey: key, ...(key.startsWith('eyJ') ? { authorization: `Bearer ${key}` } : {}) };
  async function call(base, path, { headers = {}, timeout = 10000, raw = false, ...init } = {}) {
    const response = await fetchImpl(`${url}/${base}/${path}`, { ...init, headers: { ...auth, ...headers }, signal: AbortSignal.timeout(timeout) });
    if (!response.ok) {
      let body = null;
      try { body = await response.json(); } catch {}
      throw new SupabaseError(response.status, body);
    }
    if (raw) return response;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  const rest = (path, init = {}) => call('rest/v1', path, { ...init, headers: { 'content-type': 'application/json', ...init.headers } });

  return {
    kind: 'supabase',
    async listItems({ kind, campusId } = {}) {
      const filters = [`select=${ITEM}`, 'order=created_at.asc', 'limit=5000'];
      if (kind) filters.push(`kind=eq.${enc(kind)}`);
      if (campusId === null) filters.push('campus_id=is.null');
      else if (campusId !== undefined) filters.push(`campus_id=eq.${enc(campusId)}`);
      return (await rest(`cms_items?${filters.join('&')}`)).map(toItem);
    },
    async getItem(id) {
      return toItem((await rest(`cms_items?id=eq.${enc(id)}&select=${ITEM}`))[0] ?? null);
    },
    async createItem({ id, kind, campusId = null, data, actor, now }) {
      try {
        const rows = await rest(`cms_items?select=${ITEM}`, {
          method: 'POST', headers: { prefer: 'return=representation' },
          body: JSON.stringify({ ...(id ? { id } : {}), kind, campus_id: campusId, data, revision: 1, created_at: now, updated_at: now, updated_by: actor })
        });
        return toItem(rows[0]);
      } catch (error) {
        if (error.status === 409) throw new ConflictError('이미 있는 항목이에요.', { id });
        throw error;
      }
    },
    // revision이 기대값과 같을 때만 바꿉니다. 바뀐 행이 없으면 지금 값을 읽어 충돌로 알립니다.
    async updateItem({ id, data, expectedRevision, actor, now }) {
      const rows = await rest(`cms_items?id=eq.${enc(id)}&revision=eq.${enc(expectedRevision)}&select=${ITEM}`, {
        method: 'PATCH', headers: { prefer: 'return=representation' },
        body: JSON.stringify({ data, revision: expectedRevision + 1, updated_at: now, updated_by: actor })
      });
      if (rows.length) return toItem(rows[0]);
      const current = await this.getItem(id);
      if (!current) return null;
      throw new ConflictError('다른 화면에서 먼저 저장했어요.', { current });
    },
    async listReleases({ scope } = {}) {
      const filters = [`select=${RELEASE_META}`, 'order=created_at.desc', 'limit=200'];
      if (scope) filters.push(`scope=eq.${enc(scope)}`);
      return (await rest(`cms_releases?${filters.join('&')}`)).map(toRelease);
    },
    async getRelease(id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
      return toRelease((await rest(`cms_releases?id=eq.${enc(id)}&select=${RELEASE_META},snapshot,item_revisions`))[0] ?? null);
    },
    async activeReleases() {
      const rows = await rest(`cms_active?select=scope,release:cms_releases(${RELEASE_META},snapshot,item_revisions)`);
      return rows.map(row => toRelease(row.release)).filter(Boolean);
    },
    async publish({ requestId, actor, entries, now }) {
      try {
        const result = await rest('rpc/cms_publish', {
          method: 'POST',
          body: JSON.stringify({ p_request_id: requestId, p_actor: actor, p_entries: entries, p_now: now }),
          timeout: 20000
        });
        return { duplicate: result.duplicate, releases: result.releases };
      } catch (error) {
        const message = error.body?.message ?? '';
        if (message.startsWith('CMS_CONFLICT')) throw new ConflictError('게시 준비 뒤에 바뀐 내용이 있어요.', { id: message.split(' ')[1] });
        throw error;
      }
    },
    async addAudit({ actor, action, scope = null, target = null, summary = {}, now }) {
      await rest('cms_audit', { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ at: now, actor, action, scope, target, summary }) });
    },
    async listAudit({ limit = 100 } = {}) {
      return rest(`cms_audit?select=id,at,actor,action,scope,target,summary&order=at.desc&limit=${Number(limit)}`);
    },
    async putMedia({ id, bytes, mime, size, sha256, filename, actor, now }) {
      await call('storage/v1', `object/${MEDIA_BUCKET}/${id}`, { method: 'POST', headers: { 'content-type': mime, 'x-upsert': 'false' }, body: bytes, timeout: 30000 });
      const rows = await rest('cms_media?select=*', {
        method: 'POST', headers: { prefer: 'return=representation' },
        body: JSON.stringify({ id, path: id, mime, size, sha256, filename, created_at: now, created_by: actor })
      });
      return toMedia(rows[0]);
    },
    async getMediaInfo(id) {
      return toMedia((await rest(`cms_media?id=eq.${enc(id)}&select=*`))[0] ?? null);
    },
    async listMedia() {
      return (await rest('cms_media?select=*&order=created_at.desc&limit=200')).map(toMedia);
    },
    async getMediaBytes(id) {
      const response = await call('storage/v1', `object/authenticated/${MEDIA_BUCKET}/${id}`, { raw: true, timeout: 20000 });
      return Buffer.from(await response.arrayBuffer());
    }
  };
}
