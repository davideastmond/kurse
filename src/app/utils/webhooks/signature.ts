import { createHmac } from "node:crypto";

type BuildWebhookSignatureInput = {
  secret: string;
  timestamp: string;
  payload: string;
};

export function buildWebhookSignature(input: BuildWebhookSignatureInput) {
  const signedPayload = `${input.timestamp}.${input.payload}`;
  const digest = createHmac("sha256", input.secret)
    .update(signedPayload)
    .digest("hex");

  return `v1=${digest}`;
}
