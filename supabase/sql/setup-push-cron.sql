-- Apply the scheduler-extension migration first.
-- Store the exact PUSH_DISPATCH_SECRET (also set in Edge Function Secrets)
-- in Vault, and store the project URL:
-- select vault.create_secret('https://axednjikcambzbkxyqpp.supabase.co','trx_push_project_url');
-- select vault.create_secret('<same PUSH_DISPATCH_SECRET>','trx_push_dispatch_secret');
-- Never commit a real secret. Re-running cron.schedule with this name updates
-- the existing job instead of creating a duplicate.
do $$
begin
  if not exists(select 1 from vault.decrypted_secrets where name='trx_push_project_url') then
    raise exception 'Missing Vault secret trx_push_project_url';
  end if;
  if not exists(select 1 from vault.decrypted_secrets where name='trx_push_dispatch_secret') then
    raise exception 'Missing Vault secret trx_push_dispatch_secret';
  end if;
end;
$$;
select cron.schedule('trx-push-dispatch-every-minute','* * * * *',$job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='trx_push_project_url') || '/functions/v1/trx-push-dispatch',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','sb_publishable_Vysddy5_b0uZ3iKgnkDTIw_X5O1pBEd',
      'Authorization','Bearer sb_publishable_Vysddy5_b0uZ3iKgnkDTIw_X5O1pBEd',
      'x-push-dispatch-secret',(select decrypted_secret from vault.decrypted_secrets where name='trx_push_dispatch_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
$job$);
