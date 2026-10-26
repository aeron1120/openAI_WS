# Workshop 01 deployment record

Cloudflare Worker: `openai-ws-workshop1` · repository: `aeron1120/openAI_WS`.
The original Workshop 02 Worker and original `openai-ws1.pages.dev` are preserved.

Presenter page: https://openai-ws-workshop1.a01085519047.workers.dev/versions/

| Stage | Final source commit | Immutable Cloudflare version | Presenter alias |
| --- | --- | --- | --- |
| v0 basic | b6551f8d706196d6e0feee366d8d229e77f79f42 | 202ebaa5-f02a-4e6b-82e5-a961154fa53d | https://v0-openai-ws-workshop1.a01085519047.workers.dev/ |
| v1 weather | ac46a2c9c8be065066184cbc9bce3f8df8ce245e | b850274f-3e00-4a8c-9bc5-e05ba3f7e0e1 | https://v1-openai-ws-workshop1.a01085519047.workers.dev/ |
| v2 Google login | 6cf785cfe394c17b6d19917dbbe18c042b194d85 | 2edc2030-c8ef-49bd-9e35-fbd60fd6652d | https://v2-openai-ws-workshop1.a01085519047.workers.dev/ |
| v3 map | 15d552a | 81afe283-0264-4137-970e-805ef99a8c19 | https://v3-openai-ws-workshop1.a01085519047.workers.dev/ |

Immutable URL format: `https://<first8-of-version-id>-openai-ws-workshop1.a01085519047.workers.dev/`. Presenter aliases above stay at their stages; future changes should not repoint v0 at a later feature set.

The initial cumulative feature commits are b6551f8 (v0), fde85b0 (v1), 7fc89eb (v2), 3ed26c9 (v3). Subsequent compatibility fixes were applied to v1/v2 branches and main without rewriting that history. The latest stage branches are `codex/workshop1-v1-ready` and `codex/workshop1-v2-ready`.

## Verified on 2026-10-26

- All four versions uploaded and sequentially deployed; final refresh order v1 → v2 → v3.
- 34 automated tests cover forecast matching, validation, failure handling, Google signature/session/nonce/origin checks, map selection and failure behavior.
- v0 browser cards and category filtering verified. Public build includes only allowlisted assets.
- Live KMA response for 2026-10-27 18:00, grid59/125: 10°C and POP0%, issue20261026 1700, verified at09:04UTC. This is an observed result, not a value embedded in the app.
- Google configuration is valid and official Google sign-in button rendered. Actual account selection/profile/refresh/logout still needs a user account smoke check.
- Google Maps key is absent. Implementation is present; production intentionally shows configuration pending. Live map verification remains pending.

## Configuration details

KMA_SERVICE_KEY and SESSION_SECRET are encrypted secrets. GOOGLE_CLIENT_ID is public client configuration. No secret values are committed or copied to public assets.

The user registered the production, v2 and v3 origins with Google. Only these aliases should be used for login demonstrations unless another origin is separately registered.

Wrangler must use `--keep-vars`. Cloudflare version URLs retain the configuration from upload time. After changing configuration, upload the matching stage code again with its alias, then deploy its returned version ID. Avoid deploying an older configuration while someone is editing dashboard settings.

Use `wrangler.workshop1.jsonc` for Workshop01 and retain `wrangler.jsonc` for Workshop02. Worker requests use `redirect: manual` because Workers does not support `error`; 3xx responses are rejected. KMA requests ask for identity encoding because the runtime-negotiated compressed request returned HTTP500 during verification.

## Presentation flow

1. v0: show empty weather slots and meeting name/time/place.
2. v1: show real temperature and precipitation probability; refresh.
3. v2: Google account selection, profile, refresh, logout.
4. v3: after Maps setup, choose two different cards and click markers.

Dates default to tomorrow in Seoul. Use a supported forecast date at presentation time. No invented data is substituted for unavailable forecasts.
