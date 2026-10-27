// Supabase Storage 비공개 버킷(question-images). 공개 주소는 만들지 않고, 볼 때마다 10분짜리 서명 주소를 만듭니다.
export const BUCKET = 'question-images';

export function storageClient({ url, key, fetchImpl = fetch }) {
  const auth = { apikey: key, ...(key.startsWith('eyJ') ? { authorization: `Bearer ${key}` } : {}) };
  async function call(path, { headers = {}, ...init }) {
    const response = await fetchImpl(`${url}/storage/v1/${path}`, { ...init, headers: { ...auth, ...headers }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Storage ${response.status}`);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  return {
    async upload(path, bytes, mime) {
      await call(`object/${BUCKET}/${path}`, { method: 'POST', headers: { 'content-type': mime, 'x-upsert': 'false' }, body: bytes });
    },
    async signedUrl(path, seconds = 600) {
      const data = await call(`object/sign/${BUCKET}/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ expiresIn: seconds }) });
      return `${url}/storage/v1${data.signedURL}`;
    },
    async remove(paths) {
      await call(`object/${BUCKET}`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prefixes: paths }) });
    }
  };
}
