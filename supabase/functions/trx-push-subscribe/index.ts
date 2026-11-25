import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isTrustedPushEndpoint } from "../_shared/push-endpoint.ts";
const MAX_ACTIVE=250;
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
function admin(){const raw=Deno.env.get("SUPABASE_SECRET_KEYS");let key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(raw){try{key=JSON.parse(raw).default??key}catch{/* legacy fallback */}}const url=Deno.env.get("SUPABASE_URL");if(!url||!key)throw new Error("Supabase server credentials unavailable");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 if(!(req.headers.get("content-type")??"").toLowerCase().includes("application/json"))return json({error:"Content-Type must be application/json"},415);
 if(Number(req.headers.get("content-length")??0)>16384)return json({error:"Request body too large"},413);
 try{const body=await req.json(),sub=body?.subscription,endpoint=typeof sub?.endpoint==="string"?sub.endpoint:"",p256dh=typeof sub?.keys?.p256dh==="string"?sub.keys.p256dh:"",auth=typeof sub?.keys?.auth==="string"?sub.keys.auth:"";
  if(!isTrustedPushEndpoint(endpoint)||!/^[A-Za-z0-9_-]{40,200}$/.test(p256dh)||!/^[A-Za-z0-9_-]{16,100}$/.test(auth))return json({error:"Invalid or unsupported push subscription"},400);
  const db=admin();
  const forwarded=req.headers.get("x-forwarded-for");
  const clientIp=req.headers.get("cf-connecting-ip")??(forwarded?.split(",").at(-1)?.trim())??"unknown";
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(clientIp));
  const ipHash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
  const {data:allowed,error:rateError}=await db.rpc("consume_trx_push_subscribe_limit",{p_ip_hash:ipHash});
  if(rateError)throw rateError;
  if(!allowed)return json({error:"Too many subscription attempts. Try again later."},429);
  const {data:existing,error:lookupError}=await db.from("trx_push_subscriptions").select("id,enabled").eq("endpoint",endpoint).maybeSingle();if(lookupError)throw lookupError;
  if(!existing||!existing.enabled){const {count,error}=await db.from("trx_push_subscriptions").select("id",{count:"exact",head:true}).eq("enabled",true);if(error)throw error;if((count??0)>=MAX_ACTIVE)return json({error:"Device subscription limit reached"},429)}
  const {error}=await db.from("trx_push_subscriptions").upsert({endpoint,p256dh,auth,device_label:typeof body.deviceLabel==="string"?body.deviceLabel.slice(0,120):null,enabled:true,updated_at:new Date().toISOString()},{onConflict:"endpoint"});if(error)throw error;return json({success:true});
 }catch(error){console.error("Push subscribe failed",String(error));return json({error:"Could not register this device"},500)}
});