import assert from "node:assert/strict";
import test from "node:test";
import { InfraiClient } from "./infrai_client.ts";
import { SignupService } from "./signup_gate.ts";

const input = { email: "player@example.test", password: "secret", name: "Mina", captchaToken: "captcha", captchaWidgetRecordId: "widget-1", ip: "203.0.113.4", requestId: "signup-1" };

test("a rejected captcha enters moderation and does not create a player", async () => {
  const client = new InfraiClient("test-key", async () => new Response(JSON.stringify({ ok: false, error: { code: "CAPTCHA_REJECTED", message: "review" } }), { status: 422, headers: { "content-type": "application/json" } }));
  const service = new SignupService(client);
  const result = await service.register(input);
  assert.deepEqual(result, { status: "review" });
  assert.equal(service.moderation.length, 1);
  assert.equal(service.events.length, 0);
});

test("an accepted captcha creates one player, event, and starter asset", async () => {
  let calls = 0;
  const client = new InfraiClient("test-key", async (_url, init) => {
    calls += 1;
    const body = JSON.parse(String(init?.body));
    assert.equal(init?.method, "POST");
    return new Response(JSON.stringify(calls === 1 ? { ok: true, data: { score: 0.9 } } : { ok: true, data: { user_id: "player-1" } }), { status: 200, headers: { "content-type": "application/json" } });
  });
  const service = new SignupService(client);
  const result = await service.register(input);
  assert.deepEqual(result, { status: "created", playerId: "player-1" });
  assert.equal(service.events[0].type, "signup");
  assert.equal(service.assets[0].state, "published");
});
