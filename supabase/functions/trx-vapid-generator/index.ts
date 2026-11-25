import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { generateVapidKey, vapidPublicKey } from "jsr:@daaku/webpush@0.2.0";

const ALLOWED_ORIGINS = new Set([
  "https://appletheexchangetrx.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const BASE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
  "Vary": "Origin",
};

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-vapid-generator-secret",
    "Access-Control-Max-Age": "86400",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, ...corsHeaders(origin) },
  });
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
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return new Response(null, { status: 403, headers: BASE_HEADERS });
    }
    return new Response(null, {
      status: 204,
      headers: { ...BASE_HEADERS, ...corsHeaders(origin) },
    });
  }

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ error: "Origin not allowed" }, 403);
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, origin);
  }

  // Setup-only secret must remain in Supabase Edge Function Secrets.
  // Never place it in frontend source code, GitHub, or browser storage.
  const expected = Deno.env.get("VAPID_GENERATOR_SECRET");
  const supplied = req.headers.get("x-vapid-generator-secret") ?? "";

  if (!expected || !supplied || !secretsMatch(expected, supplied)) {
    return json({ error: "Unauthorized" }, 401, origin);
  }

  try {
    const privateKey = await generateVapidKey();
    const publicKey = vapidPublicKey(privateKey);

    // Private key is returned only to the authorized setup operator.
    // It is never logged or persisted by this function.
    return json({
      success: true,
      algorithm: "ECDSA P-256 (ES256)",
      VAPID_PUBLIC_KEY: publicKey,
      VAPID_PRIVATE_KEY: JSON.stringify(privateKey),
      warning: "Copy the private key directly into Supabase Edge Function Secrets. It is not stored by this function.",
    }, 200, origin);
  } catch (error) {
    console.error("VAPID key generation failed:", String(error));
    return json({ error: "Could not generate VAPID keys" }, 500, origin);
  }
});
