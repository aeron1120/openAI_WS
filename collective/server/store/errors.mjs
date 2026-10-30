// 저장소 공통 오류. 화면에는 app.mjs가 409로 바꿔 알려줍니다.
export class ConflictError extends Error {
  constructor(message, detail = {}) { super(message); this.detail = detail; }
}
