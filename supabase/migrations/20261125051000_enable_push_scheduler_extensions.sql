-- Supabase-supported extensions required by the scheduled Edge Function dispatcher.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
