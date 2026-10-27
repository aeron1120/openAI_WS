// 새 질문·추가 질문을 운영진 메일로 알립니다(Resend HTTP API).
// 키나 받는 주소가 없으면 보내지 않고, 실패해도 질문 저장은 막지 않습니다(서버 로그만 남김).
export function createNotifier({ apiKey, to, publicOrigin, fetchImpl = fetch }) {
  return {
    async questionWaiting({ questionId, workshop, step, email, body, followUp }) {
      if (!apiKey || !to) return false;
      try {
        const response = await fetchImpl('https://api.resend.com/emails', {
          method: 'POST',
          headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            from: 'SNU 수업 알림 <onboarding@resend.dev>',
            to: [to],
            subject: `[수업 질문] Workshop ${workshop} · ${step}${followUp ? ' (추가 질문)' : ''}`,
            text: `${email}\n\n${body.slice(0, 500)}\n\n답변하기: ${publicOrigin}/admin/?q=${questionId}`
          }),
          signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) throw new Error(`Resend ${response.status}`);
        return true;
      } catch (error) {
        console.error('learn-server: notify failed', error.message);
        return false;
      }
    }
  };
}
