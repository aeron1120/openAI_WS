// Supabase REST(PostgREST) 클라이언트. 서비스 키는 서버에서만 씁니다(RLS를 우회하므로 브라우저로 보내지 않음).
// 새 키(sb_secret_…)는 apikey 헤더로, 예전 service_role JWT(eyJ…)는 Authorization 헤더로도 보냅니다.
const enc = encodeURIComponent;
const inList = ids => `in.(${ids.map(enc).join(',')})`;
// 질문 목록(요약)과 질문 하나(대화·첨부까지). student:students(...)는 questions.student_id 외래키로 학생을 붙입니다.
const SUMMARY = 'id,workshop,step_id,mode,status,created_at,updated_at,student:students(email,name),messages(author,body,created_at)';
const DETAIL = 'id,student_id,workshop,step_id,mode,status,created_at,updated_at,student:students(email,name),messages(id,author,operator_email,body,error_text,created_at,attachments(id,path,mime))';

export function supabaseClient({ url, key, fetchImpl = fetch }) {
  const base = { apikey: key, 'content-type': 'application/json', ...(key.startsWith('eyJ') ? { authorization: `Bearer ${key}` } : {}) };
  async function request(path, { headers = {}, ...init } = {}) {
    const response = await fetchImpl(`${url}/rest/v1/${path}`, { ...init, headers: { ...base, ...headers }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Supabase ${response.status}`);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
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
    },
    listProgress(studentId) {
      return request(`progress?student_id=eq.${encodeURIComponent(studentId)}&select=workshop,step_id,completed_at&order=completed_at.asc`);
    },
    // 이미 완료한 단계를 다시 눌러도 처음 완료한 시각을 유지합니다.
    async markStep({ studentId, workshop, stepId, now }) {
      await request('progress?on_conflict=student_id,workshop,step_id', {
        method: 'POST',
        headers: { prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify({ student_id: studentId, workshop, step_id: stepId, completed_at: now })
      });
    },
    async unmarkStep({ studentId, workshop, stepId }) {
      await request(`progress?student_id=eq.${encodeURIComponent(studentId)}&workshop=eq.${encodeURIComponent(workshop)}&step_id=eq.${encodeURIComponent(stepId)}`, {
        method: 'DELETE',
        headers: { prefer: 'return=minimal' }
      });
    },
    listAllProgress() {
      return request('progress?select=workshop,step_id&limit=10000');
    },
    async createQuestion({ studentId, workshop, stepId, mode, status, now }) {
      const rows = await request('questions?select=id', {
        method: 'POST',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify({ student_id: studentId, workshop, step_id: stepId, mode, status, created_at: now, updated_at: now })
      });
      return rows[0].id;
    },
    async addMessage({ questionId, author, operatorEmail = null, body, errorText = null, now }) {
      const rows = await request('messages?select=id', {
        method: 'POST',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify({ question_id: questionId, author, operator_email: operatorEmail, body, error_text: errorText, created_at: now })
      });
      return rows[0].id;
    },
    async updateQuestion(id, fields) {
      await request(`questions?id=eq.${enc(id)}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify(fields) });
    },
    // 메시지·첨부는 외래키(ON DELETE CASCADE)로 함께 지워집니다.
    async deleteQuestion(id) {
      await request(`questions?id=eq.${enc(id)}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } });
    },
    async getQuestion(id) {
      const rows = await request(`questions?id=eq.${enc(id)}&select=${DETAIL}&messages.order=created_at.asc`);
      return rows?.[0] ?? null;
    },
    listQuestions({ studentId, status, workshop } = {}) {
      const filters = [];
      if (studentId) filters.push(`student_id=eq.${enc(studentId)}`);
      if (status) filters.push(`status=eq.${enc(status)}`);
      if (workshop) filters.push(`workshop=eq.${enc(workshop)}`);
      return request(`questions?${[...filters, `select=${SUMMARY}`, 'messages.order=created_at.asc', 'order=updated_at.desc', 'limit=200'].join('&')}`);
    },
    async createAttachment({ id, uploaderId, path, mime, size, now }) {
      await request('attachments', {
        method: 'POST',
        headers: { prefer: 'return=minimal' },
        body: JSON.stringify({ id, uploader_id: uploaderId, path, mime, size, created_at: now })
      });
    },
    // 내가 올렸고, 아직 메시지에 안 붙었고, since 이후에 올린 첨부만 돌려줍니다.
    claimableAttachments({ ids, uploaderId, since }) {
      return request(`attachments?id=${inList(ids)}&uploader_id=eq.${enc(uploaderId)}&message_id=is.null&created_at=gte.${enc(since)}&select=id`);
    },
    // 내가 올렸고 아직 비어 있는 첨부만 한 번에 붙이고, 붙은 개수를 돌려줍니다(동시 요청이 같은 이미지를 두 번 붙이지 못하게).
    async attachToMessage({ ids, messageId, uploaderId }) {
      const rows = await request(`attachments?id=${inList(ids)}&uploader_id=eq.${enc(uploaderId)}&message_id=is.null&select=id`, {
        method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify({ message_id: messageId })
      });
      return rows?.length ?? 0;
    },
    staleAttachments(before) {
      return request(`attachments?message_id=is.null&created_at=lt.${enc(before)}&select=id,path&limit=500`);
    },
    // 정리 도중 메시지에 붙은 첨부는 지우지 않도록 message_id가 비어 있는 행만 지웁니다.
    async deleteAttachments(ids) {
      await request(`attachments?id=${inList(ids)}&message_id=is.null`, { method: 'DELETE', headers: { prefer: 'return=minimal' } });
    }
  };
}
