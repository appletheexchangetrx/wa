/// <reference lib="webworker" />
import {cleanupOutdatedCaches,createHandlerBoundToURL,precacheAndRoute} from 'workbox-precaching';
import {NavigationRoute,registerRoute} from 'workbox-routing';
declare const self:ServiceWorkerGlobalScope&{__WB_MANIFEST:Array<{url:string;revision?:string|null}>};
precacheAndRoute(self.__WB_MANIFEST);cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('/wa/index.html'),{allowlist:[/^\/wa\//]}));
self.addEventListener('message',(event:ExtendableMessageEvent)=>{if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting())});
self.addEventListener('push',(event:PushEvent)=>{let payload:{title?:string;body?:string;url?:string}={};try{payload=event.data?.json()??{}}catch{payload={title:'WhatsApp',body:'Anda menerima pesan baru.'}}event.waitUntil(self.registration.showNotification(payload.title||'WhatsApp',{body:payload.body||'Anda menerima pesan baru.',icon:'/wa/icons/pwa-192.png',badge:'/wa/icons/pwa-192.png',tag:'wa-inbox-new-message',data:{url:payload.url||'/wa/'}}))});
self.addEventListener('notificationclick',(event:NotificationEvent)=>{event.notification.close();let target=new URL('/wa/',self.location.origin).href;try{const u=new URL(event.notification.data?.url||'/wa/',self.location.origin);if(u.origin===self.location.origin&&u.pathname.startsWith('/wa/'))target=u.href}catch{/* keep app root fallback */}event.waitUntil((async()=>{const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of clients){if('focus'in client){await client.focus();if('navigate'in client)await client.navigate(target);return}}await self.clients.openWindow(target)})())});
