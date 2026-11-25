import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { generateVapidKey, vapidPublicKey } from "jsr:@daaku/webpush@0.2.0";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // This function deliberately has verify_jwt=false; protect it with a separate,
  // high-entropy setup secret. Never expose that secret in the browser or source.
  const expected = Deno.env.get("VAPID_GENERATOR_SECRET");
  const supplied = req.headers.get("x-vapid-generator-secret");
  if (!expected || !supplied || supplied.length !== expected.length || supplied !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const privateKey = await generateVapidKey();
    const publicKey = vapidPublicKey(privateKey);

    // Return the private JWK exactly once to the authorized operator.
    // Do not log, persist, or include it in any frontend response.
    return json({
      success: true,
      algorithm: "ECDSA P-256 (ES256)",
      VAPID_PUBLIC_KEY: publicKey,
      VAPID_PRIVATE_KEY: JSON.stringify(privateKey),
      warning: "Copy the private key directly into Supabase Edge Function Secrets. It cannot be retrieved again from this function.",
    });
  } catch (error) {
    console.error("VAPID key generation failed:", String(error));
    return json({ error: "Could not generate VAPID keys" }, 500);
  }
});
