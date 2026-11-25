import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  if (!publicKey) return new Response(JSON.stringify({ error: "Push notifications are not configured" }), { status: 503, headers });
  return new Response(JSON.stringify({ publicKey }), { headers });
});
