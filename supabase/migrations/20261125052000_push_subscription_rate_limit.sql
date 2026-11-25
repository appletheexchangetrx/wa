create table if not exists private.trx_push_rate_limits(
  ip_hash text primary key check(ip_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check(request_count>=0),
  updated_at timestamptz not null default now()
);
revoke all on table private.trx_push_rate_limits from public,anon,authenticated;
grant select,insert,update,delete on table private.trx_push_rate_limits to service_role;

create or replace function public.consume_trx_push_subscribe_limit(p_ip_hash text)
returns boolean
language plpgsql security definer set search_path=''
as $$
declare current_count integer;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  insert into private.trx_push_rate_limits(ip_hash,window_started_at,request_count,updated_at)
  values(p_ip_hash,now(),1,now())
  on conflict(ip_hash) do update set
    window_started_at=case
      when private.trx_push_rate_limits.window_started_at < now()-interval '1 hour' then now()
      else private.trx_push_rate_limits.window_started_at end,
    request_count=case
      when private.trx_push_rate_limits.window_started_at < now()-interval '1 hour' then 1
      else private.trx_push_rate_limits.request_count+1 end,
    updated_at=now()
  returning request_count into current_count;
  return current_count <= 20;
end;
$$;
revoke all on function public.consume_trx_push_subscribe_limit(text) from public,anon,authenticated;
grant execute on function public.consume_trx_push_subscribe_limit(text) to service_role;
