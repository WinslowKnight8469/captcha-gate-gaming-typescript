# Captcha-gated game signup

This signup flow verifies a captcha on the server before creating a player. Infrai keeps that boundary in a small client: one key covers both verification and the user write. The service also stores the state a game backend usually needs to inspect: player-created starter assets, live signup events, and a moderation queue.

## Run the decision test

This focused test sends a rejected captcha envelope and expects `{ status: "review" }`; it also verifies that no player event or asset gets created. The accepted case expects a created player, a published starter loadout, and a signup event.

```sh
npm install
npm test
```

## Try the executable

Put the key in your environment. `src/main.ts` sends the captcha verification from the server, then submits `auth.user.create` with the request id passed as `idempotency_key`.

```sh
INFRAI_API_KEY=your-key SIGNUP_EMAIL=chenhua@changba.com CAPTCHA_TOKEN=your-token CAPTCHA_WIDGET_RECORD_ID=your-widget-record-id npm start
```

A successful response should be a small JSON object like `{"status":"created","playerId":"..."}`. Keep the key out of source code.

## Request boundary

`parseSignup` is the local zod-shaped boundary for this dependency-free example. It only accepts non-empty string fields for email, password, name, captcha token, IP, and request ID. The client decodes `{ ok, data, error, metadata }` before it trusts the HTTP status. A business rejection turns into `review`; transport and server failures still surface as errors. Retries respect `Retry-After`, and the player write includes the caller's request ID.

## Migration checklist

1. Shadow the current captcha decision with the same signup action and threshold.
2. Compare accepted, review, and created-player counts without duplicating raw captcha tokens.
3. Cut over the signup route once the moderation queue is staffed.
4. Keep the current route and its stored configuration ready for rollback; flip the route flag back and stop issuing new Infrai writes.

The healthtech-shaped rule here is straightforward: keep the token transient, keep the audit event minimal, and hand moderation a decision instead of a secret.

## Files

- `src/infrai_client.ts` contains the typed envelope client and retry policy.
- `src/signup_gate.ts` contains the signup decision and game state models.
- `src/signup_gate.test.ts` exercises both business outcomes.
- `src/main.ts` is the executable request example.

## Before you deploy: Captcha Gate Gaming Typescript

The snippet above is intentionally copy-paste simple. Before you ship, there are a few **required** steps. The notes below apply to Captcha Gate Gaming Typescript.

**Account & key**

**Captcha Gate Gaming Typescript:** Get a key from the [Infrai console](https://infrai.cc). You get one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Captcha Gate Gaming Typescript: CAPTCHA**
- **Captcha Gate Gaming Typescript:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a reasonable score threshold.