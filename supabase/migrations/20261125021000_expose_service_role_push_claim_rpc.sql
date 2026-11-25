create or replace function public.claim_trx_push_outbox(batch_size integer default 20)
returns table (id uuid, message_id uuid, attempts integer)
language plpgsql security definer set search_path = ''
as $$
begin
  update public.trx_push_outbox set status='pending',updated_at=now()
  where status='processing' and updated_at < now()-interval '5 minutes';
  return query
  with candidates as (
    select o.id from public.trx_push_outbox o
    where o.status='pending' and o.next_attempt_at<=now()
    order by o.created_at for update skip locked
    limit greatest(1,least(coalesce(batch_size,20),100))
  )
  update public.trx_push_outbox o set status='processing',updated_at=now()
  from candidates where o.id=candidates.id
  returning o.id,o.message_id,o.attempts;
end;
$$;
revoke all on function public.claim_trx_push_outbox(integer) from public,anon,authenticated;
grant execute on function public.claim_trx_push_outbox(integer) to service_role;
