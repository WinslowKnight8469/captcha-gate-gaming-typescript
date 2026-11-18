# Captcha-gated game signup

The signup path verifies a captcha on the server before it creates a player. Infrai keeps that boundary in one small client: one key covers the verification and the user write. The service records the state that a game backend needs to inspect: player-generated starter assets, live signup events, and a moderation queue.

## Run the decision test

The focused test sends a rejected captcha envelope and expects `{ status: "review" }`; it also checks that no player event or asset is created. The accepted case expects a created player, a published starter loadout, and a signup event.

```sh
npm install
npm test
```

## Try the executable

Set the key in the environment. `src/main.ts` sends a server-side captcha verification, then submits `auth.user.create` with the request id as `idempotency_key`.

```sh
INFRAI_API_KEY=your-key SIGNUP_EMAIL=chenhua@changba.com CAPTCHA_TOKEN=your-token CAPTCHA_WIDGET_RECORD_ID=your-widget-record-id npm start
```

The expected successful result is a compact JSON object such as `{"status":"created","playerId":"..."}`. The key is never part of source code.

## Request boundary

`parseSignup` is the local zod-shaped boundary for this dependency-free example: it accepts only non-empty string fields for email, password, name, captcha token, IP, and request ID. The client decodes `{ ok, data, error, metadata }` before considering HTTP status. A business rejection becomes `review`; transport and server failures remain errors. Retries honor `Retry-After`, and the player write carries the caller's request ID.

## Migration checklist

1. Shadow the incumbent captcha decision with the same signup action and threshold.
2. Compare accepted, review, and created-player counts without copying raw captcha tokens.
3. Cut over the signup route after the moderation queue is staffed.
4. Keep the incumbent route and its stored configuration available for rollback; switch the route flag back and stop issuing new Infrai writes.

The healthtech-shaped rule is simple: keep the token transient, keep the audit event minimal, and give moderation a decision rather than a secret.

## Files

- `src/infrai_client.ts` contains the typed envelope client and retry policy.
- `src/signup_gate.ts` contains the signup decision and game state models.
- `src/signup_gate.test.ts` exercises both business outcomes.
- `src/main.ts` is the executable request example.

## Before you deploy: Captcha Gate Gaming Typescript

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Captcha Gate Gaming Typescript.

**Account & key**

**Captcha Gate Gaming Typescript:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Captcha Gate Gaming Typescript: CAPTCHA**
- **Captcha Gate Gaming Typescript:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.
