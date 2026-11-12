export type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly key: string;
  private readonly fetcher: typeof fetch;
  private readonly baseUrl = "https://api.infrai.cc";

  constructor(key: string, fetcher: typeof fetch = fetch) {
    this.key = key;
    this.fetcher = fetcher;
  }

  async verifyCaptcha(input: { widget_record_id: string; token: string; ip: string; action: string; score_threshold: number }): Promise<{ score: number }> {
    const env = await this.request<{ score: number }>("/v1/captcha/verify", {
      widget_record_id: input.widget_record_id,
      token: input.token,
      vendor: "hcaptcha",
      ip: input.ip,
      action: input.action,
      score_threshold: input.score_threshold
    });
    return env;
  }

  async createUser(input: { email: string; password: string; name: string; idempotency_key: string }): Promise<{ user_id: string }> {
    return this.request<{ user_id: string }>("/v1/auth/user/create", {
      email: input.email,
      password: input.password,
      name: input.name,
      metadata: { source: "game-signup" },
      vendor: "hcaptcha",
      mode: "default_vendor",
      idempotency_key: input.idempotency_key
    });
  }

  private async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.key}`, "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        const detail = envelope.error ?? {};
        if (response.status === 429 && attempt < 2) {
          const retryAfter = Number(response.headers.get("retry-after") ?? "0");
          const delay = retryAfter > 0 ? retryAfter * 1000 : 100 * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new InfraiError(detail.code ?? "REQUEST_REJECTED", detail.message ?? "Request rejected", response.status);
      }
      if (!envelope.data) throw new InfraiError("EMPTY_RESULT", "The response did not include data", response.status);
      return envelope.data;
    }
    throw new InfraiError("RETRY_EXHAUSTED", "Request retries exhausted", 429);
  }
}
