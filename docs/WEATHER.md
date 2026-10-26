# Workshop 01 · 기상청 날씨 연결

이 단계는 공공데이터포털의 **기상청_단기예보 조회서비스(2.0)** `getVilageFcst`를 서버에서 호출한다. 브라우저나 저장소에는 서비스키를 넣지 않는다. 기상청 API허브의 `authKey`와 공공데이터포털의 서비스키는 별개이므로, 이 코드에는 공공데이터포털 키를 사용한다.

## 설정

1. [공공데이터포털 서비스 페이지](https://www.data.go.kr/data/15084084/openapi.do)에서 해당 서비스 활용신청이 승인돼 있는지 확인한다.
2. Cloudflare 대시보드에서 워크숍 Worker → Settings → Variables and Secrets에 `KMA_SERVICE_KEY`를 **Secret**으로 추가한다. 포털의 일반 인증키(Decoding)를 권장하며, Encoding 값도 한 번만 디코딩하도록 처리한다. 키를 채팅, 코드, README, 화면 캡처에 넣지 않는다.
3. 새 버전에 Secret이 포함되도록 배포한다. 이전 고정 버전 URL은 당시의 설정을 유지할 수 있으므로, 발표용 버전은 키를 설정한 다음 배포한다.
4. 로컬에서는 저장소에 추적되지 않는 `.dev.vars`에 같은 이름을 설정하고 Wrangler로 실행한다. `.dev.vars*`가 `.gitignore`에 포함되어 있는지 먼저 확인한다.

## 호출과 표시

공개 경로는 `GET /api/weather?date=2026-10-27&time=18:00`이다. 이 날짜는 대본 예시일 뿐이며, 발표 당일에는 오늘부터 4일 이내 날짜를 선택한다. 과거 날짜의 값을 새 예보처럼 표시하지 않는다.

- 서버가 대학동 격자 `nx=59`, `ny=125`를 고정한다. 지도 위도·경도와 다른 좌표계다.
- 최신 발표시각을 한국 표준시로 계산한다. 02·05·08·11·14·17·20·23시 중, 앱이 10분의 게시 여유를 둔 가장 최근 발표를 요청한다. 10분은 이 앱의 보수적 조회 정책이며, 제공기관의 응답 시간 보장을 뜻하지 않는다.
- `base_date`/`base_time`은 **발표시각**, `fcstDate`/`fcstTime`은 **모임 예보시각**이다. 반환된 같은 발표·격자·예보시각의 `TMP`와 `POP`만 함께 표시한다.
- 기온은 °C, 강수확률은 %다. 가까운 시각으로 대체하거나 예제 숫자를 표시하지 않는다.
- 키 미설정(503), API 실패(502), 해당 시각 예보 없음(404), 잘못된 입력(400)을 구분한다. 서비스키나 원본 오류 내용을 응답에 넣지 않는다.
- 예보는 연장기간에서 3시간 간격일 수 있다. 정확한 시간의 두 값이 모두 없으면 ‘예보 없음’으로 표시한다.
- 새로고침과 날짜 변경은 다시 요청한다. 이전 날짜의 느린 응답은 최신 날짜 화면을 덮어쓰지 않는다.

## 발표 전 실제 확인

1. 키가 설정된 배포 URL에서 내일, 18:00 모임의 날씨를 확인한다.
2. 브라우저 Network에서 `/api/weather`가 200인지 확인하고, 응답의 `forecastDate`, `forecastTime`, `baseDate`, `baseTime`, `nx`, `ny`를 확인한다. 브라우저 요청에 서비스키가 없어야 한다.
3. 새로고침하면 요청이 다시 생기는지 확인한다. 카드의 툴팁에 출처와 발표시각이 표시된다.
4. 예보가 없는 날짜와 네트워크 실패에서는 이전 숫자가 남지 않는지 확인한다.

자동 검증: `node --test tests/weather.test.mjs tests/weather-client.test.mjs`. 테스트 응답은 명시적으로 만든 픽스처이며 실제 날씨 확인을 대신하지 않는다.

## 502 응답 진단

카드의 오류 안내는 동일하게 유지하면서, `/api/weather` 응답의 `diagnostic`에 제한된 진단 정보만 제공한다. `upstreamStatus`는 기상청 측 HTTP 상태 숫자이며, `upstreamCode`는 API가 반환한 1~3자리 숫자 코드만 포함한다. 원본 응답, 서비스키, 요청 URL, 예외 메시지는 반환하지 않는다. JSON을 요청했더라도 포털이 XML 오류를 반환하면 숫자 `returnReasonCode`만 읽는다.

| diagnostic.reason | 확인할 내용 |
| --- | --- |
| `UPSTREAM_HTTP_ERROR` | `upstreamStatus` 확인. 403은 접근 거부, 429는 요청 제한, 5xx는 제공기관 또는 게이트웨이 실패일 수 있다. 상태만으로 키의 유효성을 단정하지 않는다. |
| `UPSTREAM_API_ERROR` | `upstreamCode`를 포털 오류 안내와 비교한다. 예: 20 접근 권한, 22 호출 한도, 30 미등록 키, 31 사용기간 만료. |
| `UPSTREAM_INVALID_JSON` | JSON과 알려진 숫자 XML 오류를 모두 해석하지 못했다. 서비스 응답 형식 또는 게이트웨이 장애를 확인한다. |
| `UPSTREAM_NETWORK_ERROR` | 제공기관 연결 또는 응답 수신 실패. 키가 틀렸다는 뜻으로 단정하지 않는다. |
| `UPSTREAM_TIMEOUT` | 12초 이내에 요청을 완료하지 못했다. |
| `SERVICE_KEY_ENCODING_ERROR` | Secret의 퍼센트 인코딩 형식을 확인하고, 포털의 Decoding 값을 다시 설정한다. |

## 공식 근거

- [공공데이터포털: 서비스 URL, 인증, JSON 형식, 오류 코드](https://www.data.go.kr/data/15084084/openapi.do)
- [기상청 API허브: 단기예보 발표주기와 getVilageFcst 입력·출력 구조](https://apihub.kma.go.kr/apiList.do?seqApi=10&seqApiSub=286)
- [기상자료개방포털: 예보기간 확장과 자료 설명](https://data.kma.go.kr/data/rmt/rmtList.do?code=420&pgmNo=572)

날씨 데이터 출처: 기상청. 공공누리 제1유형 출처 표시 조건에 따라 앱에서도 출처를 표시한다.
