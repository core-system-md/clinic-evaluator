-- P1-B: trigger maintenance helper is not a browser/API capability.
revoke execute on function public.update_updated_at_column() from public, anon, authenticated;
