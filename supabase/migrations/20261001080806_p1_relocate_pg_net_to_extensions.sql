-- P1-C: pg_net is non-relocatable on Supabase.
-- Supported posture is to recreate it in the extensions schema.
create schema if not exists extensions;
drop extension pg_net;
create extension pg_net with schema extensions;
