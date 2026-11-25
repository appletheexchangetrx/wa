# WhatsApp Web — Apple The Exchange TRX

A mobile-first WhatsApp Cloud API inbox built with React, Vite, TypeScript and Supabase. Deployed with GitHub Pages.

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.

## GitHub Pages

Configure repository Actions variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Then enable **Settings → Pages → Build and deployment → GitHub Actions**. The workflow in `.github/workflows/deploy.yml` builds and deploys the app.

## WhatsApp integration

- Reads inbound and outbound messages from `public.trx_messages`.
- Subscribes to Supabase Realtime for new messages and status changes.
- Sends text messages through the `trx-send-messages` Edge Function.
- Meta access tokens and app secrets must remain in Supabase Edge Function secrets; never put them in frontend variables.

This first version intentionally has no Supabase Auth. Public database policies are required for browser reads; see `supabase/migrations/202611250001_public_read_trx_messages.sql` and review the implications before applying.
