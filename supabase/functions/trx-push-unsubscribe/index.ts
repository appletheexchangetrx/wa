import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
function admin() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS"); let key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (raw) { try { key = JSON.parse(raw).default ?? key; } catch { /* legacy fallback */ } }
  const url = Deno.env.get("SUPABASE_URL"); if (!url || !key) throw new Error("Supabase server credentials unavailable");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok",{headers});
  if (req.method !== "POST") return json({error:"Method not allowed"},405);
  try {
    const body = await req.json(); const endpoint = typeof body?.endpoint==="string" ? body.endpoint : "";
    if (!endpoint.startsWith("https://") || endpoint.length>4096) return json({error:"Invalid endpoint"},400);
    const {error}=await admin().from("trx_push_subscriptions").update({enabled:false,updated_at:new Date().toISOString()}).eq("endpoint",endpoint);
    if (error) return json({error:"Could not disable subscription"},500);
    return json({success:true});
  } catch (error) { console.error("Push unsubscribe failed",String(error)); return json({error:"Could not unregister this device"},500); }
});
