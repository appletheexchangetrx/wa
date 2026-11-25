import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { send } from "jsr:@daaku/webpush@0.2.0";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
function admin(){
  const raw=Deno.env.get("SUPABASE_SECRET_KEYS"); let key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(raw){try{key=JSON.parse(raw).default??key}catch{/* legacy fallback */}}
  const url=Deno.env.get("SUPABASE_URL"); if(!url||!key)throw new Error("Supabase server credentials unavailable");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
Deno.serve(async req=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const expected=Deno.env.get("PUSH_DISPATCH_SECRET"), supplied=req.headers.get("x-push-dispatch-secret");
  if(!expected||!supplied||supplied!==expected)return json({error:"Unauthorized"},401);
  const raw=Deno.env.get("VAPID_PRIVATE_KEY");
  if(!raw)return json({error:"VAPID private key is not configured"},503);
  let vapid:JsonWebKey;
  try{vapid=JSON.parse(raw) as JsonWebKey}catch{return json({error:"VAPID_PRIVATE_KEY must contain a JSON JWK"},500)}
  try{
    const db=admin();
    const {data:events,error:claimError}=await db.schema("private").rpc("claim_trx_push_outbox",{batch_size:20});
    if(claimError)throw claimError;
    if(!events?.length)return json({success:true,processed:0});
    const {data:subs,error:subError}=await db.from("trx_push_subscriptions").select("id,endpoint,p256dh,auth").eq("enabled",true);
    if(subError)throw subError;
    let delivered=0,failed=0;
    for(const event of events){
      if(!subs?.length){
        await db.from("trx_push_outbox").update({status:"sent",sent_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",event.id);
        continue;
      }
      let retry=false;
      for(const sub of subs){
        try{
          await send({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},
            JSON.stringify({title:"WhatsApp",body:"Anda menerima pesan baru.",url:"/wa/"}),
            {vapid,subscriber:Deno.env.get("VAPID_SUBJECT")||"mailto:admin@example.com",ttl:60});
          delivered++;
        }catch(error){
          const e=error as {statusCode?:number;permanent?:boolean};
          if(e.permanent||e.statusCode===404||e.statusCode===410){
            await db.from("trx_push_subscriptions").update({enabled:false,updated_at:new Date().toISOString()}).eq("id",sub.id);
          }else retry=true;
          console.warn("Web Push delivery failed",{statusCode:e.statusCode,permanent:e.permanent});
        }
      }
      const now=new Date(),attempts=Number(event.attempts||0)+1;
      if(retry){
        await db.from("trx_push_outbox").update({
          status:attempts>=8?"failed":"pending",attempts,
          next_attempt_at:new Date(now.getTime()+Math.min(60,2**attempts)*60000).toISOString(),
          updated_at:now.toISOString()
        }).eq("id",event.id); failed++;
      }else{
        await db.from("trx_push_outbox").update({status:"sent",sent_at:now.toISOString(),updated_at:now.toISOString()}).eq("id",event.id);
      }
    }
    return json({success:true,processed:events.length,delivered,failed});
  }catch(error){console.error("Push dispatch failed",String(error));return json({error:"Push dispatcher failed"},500)}
});
