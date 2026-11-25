# WhatsApp Web — Apple The Exchange TRX

A mobile-first WhatsApp Cloud API inbox built with React, Vite, TypeScript and Supabase. Deployed with GitHub Pages.

## Development

```bash
npm install
npm run dev
```

The Supabase project URL and public publishable key are hardcoded in `src/lib/supabase.ts`. No GitHub Actions variables or frontend environment file is required.

## GitHub Pages

Configure **Settings → Pages → Build and deployment → GitHub Actions**. The workflow in `.github/workflows/deploy.yml` builds and deploys the app on pushes to `main`.

## WhatsApp integration

- Reads inbound and outbound messages from `public.trx_messages`.
- Subscribes to Supabase Realtime for new messages and status changes.
- Sends text messages through the `trx-send-messages` Edge Function.
- Meta access tokens and app secrets must remain in Supabase Edge Function secrets; never put them in frontend code.

This first version intentionally has no Supabase Auth. Public database policies are required for browser reads; see `supabase/migrations/202611250001_public_read_trx_messages.sql`. This grants anonymous read access to all rows in `trx_messages`; anyone with the public project URL/key can read the inbox. The public send Edge Function may also be invoked by others. Do not use this setup for private/customer-sensitive conversations without adding access controls.


## PWA, offline messages and push notifications

The app is configured as an installable PWA with a custom Workbox Service Worker. It precaches the app shell and stores up to 1,000 recent message rows in IndexedDB for offline reading. Message sending remains online-only.

Push notification implementation and Supabase setup instructions are in [supabase/PWA-PUSH-SETUP.md](supabase/PWA-PUSH-SETUP.md). Configure VAPID and dispatcher secrets before enabling browser notifications. Push payloads are generic and do not include message text or customer phone numbers.
