// 새 질문·추가 질문을 운영진 메일로 알립니다(Resend HTTP API).
// 키나 받는 주소가 없으면 보내지 않고, 실패해도 질문 저장은 막지 않습니다(서버 로그만 남김).
const NOT_CONFIGURED = '메일 설정이 없어요. Render에 RESEND_API_KEY와 NOTIFY_EMAIL을 넣어 주세요.';

export function createNotifier({ apiKey, to, publicOrigin, fetchImpl = fetch }) {
  const configured = Boolean(apiKey && to);

  // 메일 1통 보내기. 성공이면 { ok: true }, 실패면 이유를 담아 { ok: false, reason }.
  async function send({ subject, text }) {
    if (!configured) return { ok: false, reason: NOT_CONFIGURED };
    try {
      const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: 'SNU 수업 알림 <onboarding@resend.dev>', to: [to], subject, text }),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        const detail = (await response.text().catch(() => '')).slice(0, 300);
        throw new Error(`Resend ${response.status}: ${detail}`);
      }
      return { ok: true };
    } catch (error) {
      console.error('learn-server: notify failed', error.message);
      return { ok: false, reason: error.message };
    }
  }

  return {
    configured,
    async questionWaiting({ questionId, workshop, step, email, body, followUp }) {
      const result = await send({
        subject: `[수업 질문] Workshop ${workshop} · ${step}${followUp ? ' (추가 질문)' : ''}`,
        text: `${email}\n\n${body.slice(0, 500)}\n\n답변하기: ${publicOrigin}/admin/?q=${questionId}`
      });
      return result.ok;
    },
    // 운영진 화면의 "알림 메일 시험 보내기" 버튼용
    test() {
      return send({
        subject: '[수업 질문] 알림 메일 시험',
        text: `알림 메일이 잘 도착했어요. 질문이 올라오면 이렇게 알려 드려요.\n\n운영진 화면: ${publicOrigin}/admin/`
      });
    }
  };
}
