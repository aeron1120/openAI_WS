// 공개 화면의 상태 판정. 행사 상태, 신청 가능 여부, 자료 공개 여부는 서로 독립입니다.
// 모든 판정은 서버 시각(now)으로 합니다.

// 행사: cancelled(취소) | tbd(일정 준비 중) | upcoming(예정) | ongoing(진행 중) | ended(종료)
export function eventState(event, now) {
  if (event.status === 'cancelled') return 'cancelled';
  if (!event.start) return 'tbd';
  const start = Date.parse(event.start);
  const end = event.end ? Date.parse(event.end) : start + 60 * 60 * 1000;
  if (now < start) return 'upcoming';
  return now < end ? 'ongoing' : 'ended';
}

// 신청: none(신청 링크 없음) | soon(신청 시작 전) | open | closed. 끝나거나 취소된 행사는 자동으로 닫혀요.
export function recruitState(event, now) {
  if (!event.applyUrl) return 'none';
  const state = eventState(event, now);
  if (state === 'cancelled' || state === 'ended') return 'closed';
  if (event.applyOpensAt && now < Date.parse(event.applyOpensAt)) return 'soon';
  const closes = event.applyClosesAt ? Date.parse(event.applyClosesAt) : event.start ? Date.parse(event.start) : Infinity;
  return now < closes ? 'open' : 'closed';
}

// 자료 하나: open(이 학교 화면에서 열림) | scheduled(공개 예정) | missing(찾을 수 없음)
// 전체 공개 시각(publicAt)이 지난 자료는 어느 학교에서든 공개 자료입니다. 학교 화면에는 exposeAt부터 소개해요.
export function materialState(link, version, now) {
  if (!version) return { state: 'missing' };
  const publicAt = Date.parse(version.data.publicAt);
  const exposeAt = Math.max(Date.parse(link.exposeAt ?? version.data.publicAt), publicAt);
  if (now >= exposeAt) return { state: 'open', globallyPublic: true };
  return { state: 'scheduled', at: new Date(exposeAt).toISOString(), globallyPublic: now >= publicAt };
}

export const isVersionPublic = (version, now) => Boolean(version) && now >= Date.parse(version.data.publicAt);
