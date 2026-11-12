import { InfraiClient } from "./infrai_client.ts";
import { SignupService } from "./signup_gate.ts";

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before starting the example");
const email = process.env.SIGNUP_EMAIL;
if (!email) throw new Error("Set SIGNUP_EMAIL before starting the example");
const widgetRecordId = process.env.CAPTCHA_WIDGET_RECORD_ID;
if (!widgetRecordId) throw new Error("Set CAPTCHA_WIDGET_RECORD_ID before starting the example");

const service = new SignupService(new InfraiClient(process.env.INFRAI_API_KEY));
const result = await service.register({
  email,
  password: "change-me",
  name: "Mina",
  captchaToken: process.env.CAPTCHA_TOKEN ?? "local-token",
  captchaWidgetRecordId: widgetRecordId,
  ip: "203.0.113.4",
  requestId: `signup-${Date.now()}`
});
console.log(JSON.stringify(result));
