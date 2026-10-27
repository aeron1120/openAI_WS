// AI 답변 연결부. 지금은 AI_PROVIDER=none만 지원해서 항상 null(→ 질문은 바로 운영진에게)을 돌려줍니다.
// 나중에 서비스를 정하면 여기서 { question, step } 내용으로 답을 만들어 문자열로 돌려주면 됩니다.
export function createAi({ provider }) {
  return {
    provider,
    async answer() {
      return null;
    }
  };
}
