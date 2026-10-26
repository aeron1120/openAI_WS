# Google 지도 연결

지도 단계는 Google Maps JavaScript API를 실제로 불러옵니다. 모임마다 좌표로 마커를 만들고, 모임 카드를 선택하면 지도 중심을 이동합니다. 마커를 누르면 모임 이름과 장소를 열고 같은 모임을 선택합니다. 키가 없을 때는 연결 준비 안내를 보여주며, 가짜 지도로 대체하지 않습니다.

## Cloudflare 설정

1. 사용자가 관리하는 Google Cloud 프로젝트에서 Maps JavaScript API를 사용 설정합니다. API 사용에는 결제 계정 연결이 필요합니다. 결제 계정 연결, 예산, 할당량은 사용자가 직접 결정합니다.
2. 지도 전용 브라우저 API 키를 만듭니다. 애플리케이션 제한은 **웹사이트(HTTP 리퍼러)** 로 지정하고 `https://openai-ws-workshop1.a01085519047.workers.dev/*`와 `https://v3-openai-ws-workshop1.a01085519047.workers.dev/*`를 등록합니다. 버전 해시 URL을 직접 시연하려면 해당 주소도 개별 등록합니다.
3. API 제한은 **Maps JavaScript API** 만 허용합니다. 날씨 API 키, OAuth 비밀 키, 서버용 키를 재사용하지 않습니다.
4. Cloudflare의 `openai-ws-workshop1` 설정 → Variables and Secrets에 `GOOGLE_MAPS_API_KEY`를 설정합니다. 저장 후 v3 코드를 다시 업로드해 v3 별칭에 새 설정을 반영해야 합니다. 이전 고정 버전은 이전 설정을 유지합니다.
5. 워크숍 테스트는 `DEMO_MAP_ID`를 사용합니다. 운영 시에는 JavaScript 지도 ID를 만들고 `GOOGLE_MAPS_MAP_ID`에 넣습니다.
6. 배포된 주소에서 실제 지도, 마커 클릭, 모임 카드 선택을 확인합니다. 인증 오류가 나면 브라우저 개발자 콘솔에서 API 사용 설정, 결제, 리퍼러 제한의 정확한 오류를 확인합니다.

`/api/maps/config`는 `GOOGLE_MAPS_API_KEY`와 지도 ID만 반환합니다. 이 키는 Google 지도 요청을 위해 브라우저에 공개되는 키이므로 환경 변수에 저장하는 것만으로 비밀이 되지 않습니다. 웹사이트 및 API 제한이 필수입니다. 서버 전용 비밀은 이 응답에 포함하지 않습니다. 응답은 캐시하지 않고, 임의의 다른 사이트를 위한 CORS도 열지 않습니다.

## 연결 인터페이스

```js
import { initMap } from './maps.mjs';
const controller = await initMap({
  container: document.querySelector('#meeting-map'),
  meetings, // { id, title, place, lat, lng }[]; lat/lng는 숫자
  onSelect: id => selectMeetingCard(id),
});
controller.select(meetingId); // 모임 카드 클릭 시; onSelect를 다시 호출하지 않음
// 화면 제거 시 controller.destroy()
```

서버는 GET `/api/maps/config`를 `handleMapsConfig(request, env)`로 연결합니다. 그 외 메서드는 405입니다. 미설정은 503과 `{ configured: false, error: 'MAPS_NOT_CONFIGURED' }`입니다.

`container.dataset.mapState` 및 `controller.status`는 `loading`, `ready`, `missing-key`, `empty`, `error`, `destroyed` 중 하나입니다. `.map-canvas`에 명시적 높이(예: `height: 420px; min-height: 320px`)를 지정해야 Google 지도가 보입니다. 안내문은 `.map-state`, `.map-state-title`, `.map-state-description`, 정보창은 `.map-info`, `.map-info-title`, `.map-info-place`를 사용합니다. 이름과 장소는 HTML로 삽입하지 않습니다. 지도 로딩은 15초, 설정 요청은 10초 후 오류 처리합니다.

## 검증

`node --test tests/maps.test.mjs`

설정 응답과 비밀 분리, 키 누락, 좌표 유효성, 카드/마커 선택 방향, 정보창 텍스트, 인증 실패, 스크립트 실패, 해제 동작을 가벼운 Maps API 모형으로 검증합니다. 실제 키와 결제가 연결된 배포 환경에서의 지도 표시는 별도 확인이 필요합니다.

## 공식 문서

- [Maps JavaScript API 로딩](https://developers.google.com/maps/documentation/javascript/load-maps-js-api)
- [AdvancedMarkerElement와 지도 ID 준비](https://developers.google.com/maps/documentation/javascript/advanced-markers/start)
- [접근 가능한 마커](https://developers.google.com/maps/documentation/javascript/advanced-markers/accessible-markers)
- [인증 실패 이벤트](https://developers.google.com/maps/documentation/javascript/events)
- [지도 오류 코드](https://developers.google.com/maps/documentation/javascript/error-messages)
- [API 키 제한 권장사항](https://developers.google.com/maps/api-security-best-practices)
