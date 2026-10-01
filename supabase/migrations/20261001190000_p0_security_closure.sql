-- P0 security closure: enforce server-only data boundary and retire legacy execution paths.
-- Applied to production on 2026-10-01 and kept here as the repository source of truth.

do $$
declare t text;
begin
  foreach t in array array[
    'admin_users','answers','assessment_assets','assessment_settings','assessment_types',
    'assessment_users','axes','experience_multipliers','historical_snapshots',
    'insights_mapping','leads','options','questions','scores','sessions',
    'specialty_profiles','team_capacity_factors','traps'
  ] loop
    execute format('revoke all on table public.%I from anon, authenticated', t);
  end loop;
end $$;

grant select on table
  public.admin_users,
  public.assessment_settings,
  public.assessment_types,
  public.axes,
  public.questions,
  public.options,
  public.leads,
  public.scores,
  public.answers
to authenticated;

drop policy if exists p0_admin_select_admin_users on public.admin_users;
create policy p0_admin_select_admin_users
on public.admin_users
for select to authenticated
using (public.is_active_admin((select auth.uid())));

do $$
declare t text;
begin
  foreach t in array array[
    'assessment_settings','assessment_types','axes','questions','options',
    'leads','scores','answers'
  ] loop
    execute format('drop policy if exists p0_admin_select_%I on public.%I', t, t);
    execute format(
      'create policy p0_admin_select_%I on public.%I for select to authenticated using (public.is_active_admin((select auth.uid())))',
      t,t
    );
  end loop;
end $$;

revoke all on table public.assessment_session_access from anon, authenticated;

revoke all on function public.calculate_session_score(uuid) from public, anon, authenticated, service_role;
grant execute on function public.calculate_session_score(uuid) to service_role;

revoke all on function public.duplicate_assessment(uuid) from public, anon, authenticated, service_role;

alter function public.update_updated_at_column() set search_path = public, pg_temp;
