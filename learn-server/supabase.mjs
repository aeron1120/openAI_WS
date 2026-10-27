// Supabase REST(PostgREST) 클라이언트. 서비스 키는 서버에서만 씁니다(RLS를 우회하므로 브라우저로 보내지 않음).
// 새 키(sb_secret_…)는 apikey 헤더로, 예전 service_role JWT(eyJ…)는 Authorization 헤더로도 보냅니다.
export function supabaseClient({ url, key, fetchImpl = fetch }) {
  const base = { apikey: key, 'content-type': 'application/json', ...(key.startsWith('eyJ') ? { authorization: `Bearer ${key}` } : {}) };
  async function request(path, { headers = {}, ...init } = {}) {
    const response = await fetchImpl(`${url}/rest/v1/${path}`, { ...init, headers: { ...base, ...headers }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Supabase ${response.status}`);
    return response.status === 204 ? null : response.json();
  }
  return {
    async upsertStudent({ googleSub, email, name, now }) {
      const rows = await request('students?on_conflict=google_sub&select=id,email,name', {
        method: 'POST',
        headers: { prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ google_sub: googleSub, email, name, last_seen_at: now })
      });
      if (!Array.isArray(rows) || !rows[0]?.id) throw new Error('Supabase empty');
      return rows[0];
    }
  };
}
