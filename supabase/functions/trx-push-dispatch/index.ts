import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
import {send,vapidPublicKey} from "jsr:@daaku/webpush@0.2.0";
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
function equal(a:string,b:string){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
function admin(){const raw=Deno.env.get("SUPABASE_SECRET_KEYS");let key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(raw){try{key=JSON.parse(raw).default??key}catch{/* legacy fallback */}}const url=Deno.env.get("SUPABASE_URL");if(!url||!key)throw new Error("Supabase server credentials unavailable");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
function validSubject(v:string){if(/^mailto:[^\s@]+@[^\s@]+$/.test(v))return true;try{return new URL(v).protocol==="https:"}catch{return false}}
Deno.serve(async req=>{
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 const expected=Deno.env.get("PUSH_DISPATCH_SECRET")??"",supplied=req.headers.get("x-push-dispatch-secret")??"";
 if(expected.length<32||!supplied||!equal(expected,supplied))return json({error:"Unauthorized"},401);
 const raw=Deno.env.get("VAPID_PRIVATE_KEY")??"",pub=Deno.env.get("VAPID_PUBLIC_KEY")??"",subject=Deno.env.get("VAPID_SUBJECT")??"";
 if(!raw||!/^[A-Za-z0-9_-]{80,100}$/.test(pub)||!validSubject(subject))return json({error:"VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY and a valid VAPID_SUBJECT are required"},503);
 let vapid:JsonWebKey;
 try{vapid=JSON.parse(raw) as JsonWebKey;if(vapid.kty!=="EC"||vapid.crv!=="P-256"||!vapid.d||!vapid.x||!vapid.y||vapidPublicKey(vapid)!==pub)throw new Error("VAPID key pair mismatch")}
 catch(e){console.error("VAPID configuration invalid",String(e));return json({error:"VAPID configuration is invalid or key pair does not match"},503)}
 try{
  const db=admin(),{data:events,error:claimError}=await db.rpc("claim_trx_push_outbox",{batch_size:10});
  if(claimError)throw claimError;if(!events?.length)return json({success:true,processed:0});
  const {data:subs,error:subError}=await db.from("trx_push_subscriptions").select("id,endpoint,p256dh,auth").eq("enabled",true);
  if(subError)throw subError;let delivered=0,failed=0;
  for(const event of events){
   const done=new Set<string>(event.delivered_subscription_ids??[]),pending=(subs??[]).filter(s=>!done.has(s.id));
   if(!pending.length){const {error}=await db.from("trx_push_outbox").update({status:"sent",sent_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",event.id);if(error)throw error;continue}
   let retry=false;
   for(const sub of pending){
    try{
     await send({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title:"WhatsApp",body:"Anda menerima pesan baru.",url:"/wa/"}),{vapid,subscriber:subject,ttl:60});
     const {error}=await db.from("trx_push_outbox").update({delivered_subscription_ids:[...done,sub.id],updated_at:new Date().toISOString()}).eq("id",event.id);
     if(error)throw error;done.add(sub.id);delivered++;
    }catch(e){
     const err=e as {statusCode?:number;permanent?:boolean};
     if(err.permanent||err.statusCode===404||err.statusCode===410){const {error}=await db.from("trx_push_subscriptions").update({enabled:false,updated_at:new Date().toISOString()}).eq("id",sub.id);if(error)throw error}
     else retry=true;
     console.warn("Web Push delivery failed",{statusCode:err.statusCode,permanent:err.permanent});
    }
   }
   const now=new Date(),attempts=Number(event.attempts||0)+1;
   const update=retry?{status:attempts>=8?"failed":"pending",attempts,next_attempt_at:new Date(now.getTime()+Math.min(60,2**attempts)*60000).toISOString(),updated_at:now.toISOString()}:{status:"sent",sent_at:now.toISOString(),updated_at:now.toISOString()};
   const {error}=await db.from("trx_push_outbox").update(update).eq("id",event.id);if(error)throw error;if(retry)failed++;
  }
  return json({success:true,processed:events.length,delivered,failed});
 }catch(e){console.error("Push dispatch failed",String(e));return json({error:"Push dispatcher failed"},500)}
});
