# PWA and Web Push setup

## Generate VAPID keys

From the repository root, run:

```sh
deno run --allow-net supabase/scripts/generate-vapid-keys.ts
```

The script prints a `publicKey` and a JSON `privateKey` (JWK).

## Configure Supabase Edge Function secrets

In Supabase Dashboard → Edge Functions → Secrets, add:

- `VAPID_PUBLIC_KEY`: generated publicKey
- `VAPID_PRIVATE_KEY`: the complete JSON privateKey JWK
- `VAPID_SUBJECT`: a contact URI, e.g. `mailto:admin@example.com`
- `PUSH_DISPATCH_SECRET`: a long random value (at least 32 random bytes)

Never commit the private key or dispatch secret. The browser receives only the public VAPID key through `trx-push-config`.

## Configure scheduled dispatch

1. Keep the exact PUSH_DISPATCH_SECRET in a password manager.
2. Replace `REPLACE_WITH_PUSH_DISPATCH_SECRET` in `supabase/sql/setup-push-cron.sql`.
3. Run that SQL once in Supabase SQL Editor.
4. Confirm the job exists in `cron.job`. Do not schedule a duplicate job.

The job calls `trx-push-dispatch` every minute. The function rejects requests without the matching `x-push-dispatch-secret`.

## Platform behavior

- Android and supported desktop browsers: install using the browser install UI.
- iOS/iPadOS: add the site to Home Screen, open the installed web app, then grant notification permission.
- Push requires HTTPS and browser support.
- Up to 1,000 recent message rows are cached locally in IndexedDB.
- Push payloads contain no message body or customer phone number.
- Local message cache is device-local; clearing browser site data removes it.

This repository has no Supabase Auth. Subscription endpoints are public shared-inbox enrollment and are not suitable for a multi-tenant/private inbox without an authorization model.
