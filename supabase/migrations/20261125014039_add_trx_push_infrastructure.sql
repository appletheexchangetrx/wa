create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists public.trx_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.trx_push_outbox (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.trx_messages(id) on delete cascade,
  event_type text not null default 'new_message',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (message_id, event_type)
);
create index if not exists trx_push_outbox_pending_idx on public.trx_push_outbox (next_attempt_at, created_at) where status in ('pending','processing');
alter table public.trx_push_subscriptions enable row level security;
alter table public.trx_push_outbox enable row level security;
revoke all on table public.trx_push_subscriptions from anon, authenticated;
revoke all on table public.trx_push_outbox from anon, authenticated;
grant all on table public.trx_push_subscriptions to service_role;
grant all on table public.trx_push_outbox to service_role;

create or replace function private.claim_trx_push_outbox(batch_size integer default 20)
returns table (id uuid, message_id uuid, attempts integer)
language plpgsql security definer set search_path = ''
as $$
begin
  update public.trx_push_outbox set status='pending', updated_at=now()
  where status='processing' and updated_at < now() - interval '5 minutes';
  return query
  with candidates as (
    select o.id from public.trx_push_outbox o
    where o.status='pending' and o.next_attempt_at <= now()
    order by o.created_at for update skip locked
    limit greatest(1, least(coalesce(batch_size,20),100))
  )
  update public.trx_push_outbox o set status='processing', updated_at=now()
  from candidates where o.id=candidates.id
  returning o.id,o.message_id,o.attempts;
end;
$$;
revoke all on function private.claim_trx_push_outbox(integer) from public, anon, authenticated;
grant execute on function private.claim_trx_push_outbox(integer) to service_role;

create or replace function private.enqueue_trx_message_push()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.direction='inbound' then
    insert into public.trx_push_outbox(message_id,event_type,payload)
    values(new.id,'new_message',jsonb_build_object('message_id',new.id))
    on conflict(message_id,event_type) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.enqueue_trx_message_push() from public, anon, authenticated;
drop trigger if exists trg_enqueue_trx_message_push on public.trx_messages;
create trigger trg_enqueue_trx_message_push after insert on public.trx_messages
for each row execute function private.enqueue_trx_message_push();
