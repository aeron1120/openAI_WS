# Google 지도 연결

지도 단계는 Google Maps JavaScript API를 실제로 불러옵니다. 모임마다 좌표로 마커를 만들고, 모임 카드를 선택하면 지도 중심을 이동합니다. 마커를 누르면 모임 이름과 장소를 열고 같은 모임을 선택합니다. 키가 없을 때는 연결 준비 안내를 보여주며, 가짜 지도로 대체하지 않습니다.

## 지도 키 준비 (결제 없이)

워크숍과 실습은 결제 정보 없이 받는 [지도 데모 키](https://developers.google.com/maps/demo-key?hl=ko)를 씁니다. 결제 계정은 연결하지 않습니다.

1. 지도 데모 키 페이지에서 **데모 키 가져오기**를 누르고, 개인 Gmail 계정으로 로그인해 약관에 동의하면 키가 바로 보입니다. Google Workspace(학교·회사) 계정으로는 받을 수 없습니다.
2. 데모 키는 지도 표시, 마커와 정보 창, 지도 스타일을 지원합니다. 하루 한도를 넘으면 다음 날까지 멈출 뿐 요금은 나오지 않습니다. 키는 안내 메일이나 Google Cloud 콘솔에서 다시 찾을 수 있습니다.
3. 키는 대화창이나 공개 파일에 붙이지 않고 비공개 설정 파일(로컬은 `.env`·`.dev.vars`, 배포는 아래 Cloudflare 설정)에 넣습니다. 날씨 API 키, OAuth 비밀 키, 서버용 키를 재사용하지 않습니다.

## Cloudflare 설정

1. 공개 주소에서 쓸 때는 Google Cloud 콘솔에서 이 키의 웹사이트 제한에 `https://openai-ws-workshop1.a01085519047.workers.dev/*`와 `https://v3-openai-ws-workshop1.a01085519047.workers.dev/*`를 등록합니다. 버전 해시 URL을 직접 시연하려면 해당 주소도 개별 등록합니다.
2. Cloudflare의 `openai-ws-workshop1` 설정 → Variables and Secrets에 `GOOGLE_MAPS_API_KEY`를 설정합니다. 저장 후 v3 코드를 다시 업로드해 v3 별칭에 새 설정을 반영해야 합니다. 이전 고정 버전은 이전 설정을 유지합니다.
3. 지도 ID는 테스트용 `DEMO_MAP_ID`를 사용합니다. `GOOGLE_MAPS_MAP_ID`를 비워 두면 서버가 이 값을 돌려줍니다.
4. 배포된 주소에서 실제 지도, 마커 클릭, 모임 카드 선택을 확인합니다. 인증 오류가 나면 브라우저 개발자 콘솔에서 키 값, 웹사이트 제한, 데모 키 하루 한도의 정확한 오류를 확인합니다.

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

설정 응답과 비밀 분리, 키 누락, 좌표 유효성, 카드/마커 선택 방향, 정보창 텍스트, 인증 실패, 스크립트 실패, 해제 동작을 가벼운 Maps API 모형으로 검증합니다. 실제 지도 데모 키를 넣은 배포 환경에서의 지도 표시는 별도 확인이 필요합니다.

## 공식 문서

- [지도 데모 키 가져오기](https://developers.google.com/maps/demo-key?hl=ko)
- [Maps JavaScript API 로딩](https://developers.google.com/maps/documentation/javascript/load-maps-js-api)
- [AdvancedMarkerElement와 지도 ID 준비](https://developers.google.com/maps/documentation/javascript/advanced-markers/start)
- [접근 가능한 마커](https://developers.google.com/maps/documentation/javascript/advanced-markers/accessible-markers)
- [인증 실패 이벤트](https://developers.google.com/maps/documentation/javascript/events)
- [지도 오류 코드](https://developers.google.com/maps/documentation/javascript/error-messages)
- [API 키 제한 권장사항](https://developers.google.com/maps/api-security-best-practices)
