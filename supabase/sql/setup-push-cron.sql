-- Run once after adding PUSH_DISPATCH_SECRET to Supabase Edge Function secrets.
-- Replace the placeholder below with the exact same value.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select vault.create_secret('https://axednjikcambzbkxyqpp.supabase.co','trx_push_project_url');
select vault.create_secret('REPLACE_WITH_PUSH_DISPATCH_SECRET','trx_push_dispatch_secret');
select cron.schedule(
  'trx-push-dispatch-every-minute','* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='trx_push_project_url') || '/functions/v1/trx-push-dispatch',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','sb_publishable_Vysddy5_b0uZ3iKgnkDTIw_X5O1pBEd',
      'x-push-dispatch-secret',(select decrypted_secret from vault.decrypted_secrets where name='trx_push_dispatch_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  $$
);
