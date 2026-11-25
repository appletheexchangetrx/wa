# PWA and Web Push setup

## VAPID secrets
Generate the pair using the deployed `trx-vapid-generator` from a trusted terminal with a temporary `VAPID_GENERATOR_SECRET` (at least 32 random bytes). Store the returned values in Supabase Edge Function Secrets:
- `VAPID_PUBLIC_KEY`: public key.
- `VAPID_PRIVATE_KEY`: complete JSON private JWK.
- `VAPID_SUBJECT`: real contact URI, e.g. `mailto:your-team@your-domain.com`.
- `PUSH_DISPATCH_SECRET`: separate random secret with at least 32 random bytes.

Remove or rotate `VAPID_GENERATOR_SECRET` after generation. Never commit private keys or dispatch secrets. Do not regenerate VAPID keys after devices subscribe unless intentionally rotating the push identity.

## Enable scheduler
Apply migrations in order, including `20261125050000_push_dispatch_delivery_tracking.sql`, `20261125051000_enable_push_scheduler_extensions.sql`, and `20261125052000_push_subscription_rate_limit.sql`. Confirm `pg_cron` and `pg_net` are enabled in Supabase Database → Extensions.

## Store scheduler secrets in Vault
In Supabase SQL Editor, store the project URL and the exact same dispatch secret used in Edge Function Secrets:
```sql
select vault.create_secret('https://axednjikcambzbkxyqpp.supabase.co','trx_push_project_url');
select vault.create_secret('<same PUSH_DISPATCH_SECRET>','trx_push_dispatch_secret');
```
Do not commit the real secret. If a Vault secret already exists, update it through Vault rather than creating a duplicate.

Run `supabase/sql/setup-push-cron.sql`, then verify:
```sql
select jobid,jobname,schedule,active from cron.job where jobname='trx-push-dispatch-every-minute';
select status,start_time,end_time,return_message from cron.job_run_details
where jobid=(select jobid from cron.job where jobname='trx-push-dispatch-every-minute')
order by start_time desc limit 10;
```

## Platform and privacy
- Android and supported desktop browsers: install using the browser's install UI.
- iOS/iPadOS 16.4+: Add to Home Screen, open from the Home Screen icon, then grant notification permission. The app guides users through this requirement.
- Push requires HTTPS and browser support.
- Subscription endpoints are restricted to known FCM, Apple and Mozilla push-service hostnames; enabled devices are capped at 250.
- Up to 1,000 recent messages are cached in IndexedDB. Use **Hapus cache offline** to remove local message data from this device.
- Sending messages remains online-only. Push payloads do not include message text or customer phone numbers.

This application intentionally has no Supabase Auth. Subscription registration remains a public shared-inbox feature. Endpoint validation and a device cap reduce abuse but do not establish user identity; this is not a private multi-tenant authorization model.
