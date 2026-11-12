import { InfraiClient } from "./infrai_client.ts";

export type SignupRequest = { email: string; password: string; name: string; captchaToken: string; captchaWidgetRecordId: string; ip: string; requestId: string };
export type PlayerAsset = { assetId: string; ownerId: string; kind: "avatar" | "loadout"; state: "published" | "queued" };
export type LiveEvent = { eventId: string; playerId: string; type: "signup" | "asset_created"; at: string };
export type ModerationItem = { playerId: string; reason: "captcha_rejected"; queue: "signup-review" };

export function parseSignup(body: unknown): SignupRequest {
  if (!body || typeof body !== "object") throw new Error("signup body must be an object");
  const value = body as Record<string, unknown>;
  const fields = ["email", "password", "name", "captchaToken", "captchaWidgetRecordId", "ip", "requestId"];
  for (const field of fields) if (typeof value[field] !== "string" || value[field] === "") throw new Error(`missing ${field}`);
  return value as unknown as SignupRequest;
}

export class SignupService {
  readonly assets: PlayerAsset[] = [];
  readonly events: LiveEvent[] = [];
  readonly moderation: ModerationItem[] = [];
  private readonly client: InfraiClient;

  constructor(client: InfraiClient) { this.client = client; }

  async register(body: unknown): Promise<{ status: "created" | "review"; playerId?: string }> {
    const signup = parseSignup(body);
    try {
      await this.client.verifyCaptcha({ widget_record_id: signup.captchaWidgetRecordId, token: signup.captchaToken, ip: signup.ip, action: "signup", score_threshold: 0.5 });
    } catch (error) {
      if (error instanceof Error && "status" in error && (error as { status: number }).status >= 400 && (error as { status: number }).status < 500) {
        this.moderation.push({ playerId: signup.requestId, reason: "captcha_rejected", queue: "signup-review" });
        return { status: "review" };
      }
      throw error;
    }
    const user = await this.client.createUser({ email: signup.email, password: signup.password, name: signup.name, idempotency_key: signup.requestId });
    this.events.push({ eventId: signup.requestId, playerId: user.user_id, type: "signup", at: new Date().toISOString() });
    this.assets.push({ assetId: `${user.user_id}:starter`, ownerId: user.user_id, kind: "loadout", state: "published" });
    return { status: "created", playerId: user.user_id };
  }
}
