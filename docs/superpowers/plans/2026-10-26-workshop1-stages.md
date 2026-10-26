# Workshop 01 staged implementation

User approved four cumulative implementations, individual commits, and sequential Cloudflare deployments. Reference: WorkShop1대본.hwpx, slides 9–33. Existing Workshop 02 and original 틈 deployment remain available.

## Sequence
1. v0: regional meeting cards with name, time, place and weather placeholder.
2. v1: KMA short-term forecast through Worker; secret KMA_SERVICE_KEY; nx=59, ny=125; match TMP/POP for the same requested forecast date/time. Loading, failure and unavailable states.
3. v2: Google Identity Services, server-verified ID token, signed HTTPOnly session, profile and logout. User has existing login configuration.
4. v3: Google Maps JavaScript API, coordinates, markers, selection and info windows. User has no map key yet; show honest configuration state until supplied.

## Structure
- workshop1/ contains public UI. server/ contains Worker API modules.
- scripts/build-workshop1.mjs copies only allowlisted public files to dist-workshop1.
- wrangler.workshop1.jsonc deploys openai-ws-workshop1, preserving original Workshop 02 configuration.
- Independent weather, auth and maps modules are prepared outside the repository then integrated in sequence.
- Each stage is tested, committed, pushed, uploaded with a named version alias and deployed before proceeding.
- Public version URLs and commit IDs are recorded in docs/WORKSHOP1-DEPLOYMENTS.md.

## Shared UI contracts
Meeting fields: id, title, category, time (HH:MM), place, description, lat, lng, image. Weather targets: [data-weather-for="id"]. initWeather({meetings,getDate,root}) returns refresh(). initAuth({container}). initMap({container,meetings,onSelect}) returns select(id).

## Verification
Node tests cover forecast matching and validation, authentication security and session lifecycle, map selection. Browser checks cover desktop/mobile card/date/filter behavior and actual deployed stage assets. External integrations are marked verified only after valid credentials and a real request/login/map load; mocked tests do not establish live integration success.

## Configuration
Never commit or expose KMA_SERVICE_KEY or SESSION_SECRET. GOOGLE_CLIENT_ID and restricted Google Maps browser key are public configuration. Google authorized origins and Maps API/referrer restrictions must include each applicable version alias. Cloudflare deploy must preserve dashboard variables. No billing changes are authorized.
