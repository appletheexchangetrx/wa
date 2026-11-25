import { generateVapidKey, vapidPublicKey } from "jsr:@daaku/webpush@0.2.0";
const privateKey=await generateVapidKey();
console.log(JSON.stringify({publicKey:vapidPublicKey(privateKey),privateKey},null,2));
