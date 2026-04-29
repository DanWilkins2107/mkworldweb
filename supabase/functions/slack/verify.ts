// Slack request signature verification.
// Spec: https://api.slack.com/authentication/verifying-requests-from-slack

const FIVE_MINUTES_SEC = 60 * 5;

function hexDecode(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifySlackSignature(
  signingSecret: string,
  timestamp: string,
  body: string,
  signature: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(nowSec - ts) > FIVE_MINUTES_SEC) return false;

  if (!signature.startsWith("v0=")) return false;
  const provided = hexDecode(signature.slice(3));

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const macBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`v0:${timestamp}:${body}`),
  );
  const mac = new Uint8Array(macBuf);
  return timingSafeEqual(mac, provided);
}
