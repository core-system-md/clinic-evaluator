-- P1-C: pg_net is not a browser/API dependency in Clinic Evaluator.
-- Keep the extension available for supported platform operations, but do not expose
-- its HTTP routines to Data API client roles.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'net'
      and p.prokind = 'f'
      and p.proname in ('http_get','http_post','http_delete','http_collect_response')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;
