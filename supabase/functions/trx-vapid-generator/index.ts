import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { generateVapidKey, vapidPublicKey } from "jsr:@daaku/webpush@0.2.0";

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
  // Intentionally unrestricted CORS, as requested.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-vapid-generator-secret",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

function secretsMatch(expected: string, supplied: string): boolean {
  if (expected.length !== supplied.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  }
  return mismatch === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // CORS is intentionally unrestricted; this secret still protects key generation.
  // Keep VAPID_GENERATOR_SECRET in Supabase Edge Function Secrets only.
  const expected = Deno.env.get("VAPID_GENERATOR_SECRET");
  const supplied = req.headers.get("x-vapid-generator-secret") ?? "";

  if (!expected || !supplied || !secretsMatch(expected, supplied)) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const privateKey = await generateVapidKey();
    const publicKey = vapidPublicKey(privateKey);

    return json({
      success: true,
      algorithm: "ECDSA P-256 (ES256)",
      VAPID_PUBLIC_KEY: publicKey,
      VAPID_PRIVATE_KEY: JSON.stringify(privateKey),
      warning: "Copy the private key directly into Supabase Edge Function Secrets. It is not stored by this function.",
    });
  } catch (error) {
    console.error("VAPID key generation failed:", String(error));
    return json({ error: "Could not generate VAPID keys" }, 500);
  }
});
