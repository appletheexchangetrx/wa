const ALLOWED_HOSTS=new Set(["fcm.googleapis.com","web.push.apple.com"]);
export function isTrustedPushEndpoint(value:string):boolean {
  try {
    const u=new URL(value),host=u.hostname.toLowerCase();
    return u.protocol==="https:"&&!u.username&&!u.password&&(!u.port||u.port==="443")
      &&value.length<=4096&&(ALLOWED_HOSTS.has(host)||host.endsWith(".push.services.mozilla.com")||host.endsWith(".push.apple.com"));
  } catch { return false; }
}
