grant usage on schema public to anon;
grant select on table public.trx_messages to anon;

alter table public.trx_messages enable row level security;

drop policy if exists "Public can read WhatsApp messages" on public.trx_messages;
create policy "Public can read WhatsApp messages"
on public.trx_messages
for select
to anon
using (true);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'trx_messages'
     ) then
    alter publication supabase_realtime add table public.trx_messages;
  end if;
end
$$;