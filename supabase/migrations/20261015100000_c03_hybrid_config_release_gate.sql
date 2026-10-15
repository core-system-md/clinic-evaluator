-- C-03: immutable release records for the full hybrid Git/Supabase assessment configuration.
-- Prepared for review only. Do not apply to Production until all current published
-- versions are registered and runtime-verified, then the explicit enable gate is approved.

begin;

create table if not exists public.assessment_config_releases (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.assessment_families(id) on delete restrict,
  assessment_type_id uuid not null references public.assessment_types(id) on delete restrict,
  assessment_version integer not null check (assessment_version > 0),
  git_commit_sha text not null check (git_commit_sha ~ '^[0-9a-f]{40}([0-9a-f]{24})?$'),
  config_digest text not null check (config_digest ~ '^[0-9a-f]{64}$'),
  canonicalizer_version text not null check (length(trim(canonicalizer_version)) > 0),
  interpretation_version integer not null check (interpretation_version > 0),
  interpretation_registry_digest text not null check (interpretation_registry_digest ~ '^[0-9a-f]{64}$'),
  scoring_engine_version text not null check (length(trim(scoring_engine_version)) > 0),
  scoring_contract_version text not null check (length(trim(scoring_contract_version)) > 0),
  report_model_version text not null check (length(trim(report_model_version)) > 0),
  fixture_set_version text not null check (length(trim(fixture_set_version)) > 0),
  migration_contract_version text not null check (length(trim(migration_contract_version)) > 0),
  edge_release_ref text not null check (length(trim(edge_release_ref)) > 0),
  state text not null default 'PREPARED'
    check (state in ('PREPARED','VERIFIED','PUBLISHED','REJECTED','DEGRADED')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_config_digest text check (verified_config_digest is null or verified_config_digest ~ '^[0-9a-f]{64}$'),
  verified_registry_digest text check (verified_registry_digest is null or verified_registry_digest ~ '^[0-9a-f]{64}$'),
  verified_git_commit_sha text,
  verified_edge_release_ref text,
  verified_interpretation_version integer,
  verified_scoring_engine_version text,
  verified_scoring_contract_version text,
  verified_report_model_version text,
  verified_fixture_set_version text,
  verified_migration_contract_version text,
  validation_report jsonb not null default '{}'::jsonb,
  failure_reason text,
  published_at timestamptz,
  unique (assessment_type_id, git_commit_sha, config_digest)
);

create table if not exists public.assessment_config_release_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  enabled_at timestamptz,
  enabled_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into public.assessment_config_release_settings(singleton, enabled)
values (true, false) on conflict (singleton) do nothing;

alter table public.assessment_families
  add column if not exists current_release_id uuid;
alter table public.sessions
  add column if not exists assessment_release_id uuid;

do $fk$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'assessment_families_current_release_id_fkey'
      and conrelid = 'public.assessment_families'::regclass
  ) then
    alter table public.assessment_families
      add constraint assessment_families_current_release_id_fkey
      foreign key (current_release_id) references public.assessment_config_releases(id)
      on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'sessions_assessment_release_id_fkey'
      and conrelid = 'public.sessions'::regclass
  ) then
    alter table public.sessions
      add constraint sessions_assessment_release_id_fkey
      foreign key (assessment_release_id) references public.assessment_config_releases(id)
      on delete restrict;
  end if;
end
$fk$;

create index if not exists assessment_config_releases_version_state_idx
  on public.assessment_config_releases(family_id, assessment_type_id, state, verified_at desc);
create index if not exists sessions_assessment_release_id_idx
  on public.sessions(assessment_release_id) where assessment_release_id is not null;

alter table public.assessment_config_releases enable row level security;
alter table public.assessment_config_release_settings enable row level security;
revoke all on public.assessment_config_releases from public, anon, authenticated;
revoke all on public.assessment_config_release_settings from public, anon, authenticated;

create or replace function public.c03_release_immutable_guard()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if tg_op = 'DELETE' then
    if old.state in ('VERIFIED','PUBLISHED','DEGRADED') then
      raise exception 'Verified or published release evidence is immutable' using errcode = '55000';
    end if;
    return old;
  end if;

  if old.state in ('VERIFIED','PUBLISHED','DEGRADED') and (
    new.family_id is distinct from old.family_id or
    new.assessment_type_id is distinct from old.assessment_type_id or
    new.assessment_version is distinct from old.assessment_version or
    new.git_commit_sha is distinct from old.git_commit_sha or
    new.config_digest is distinct from old.config_digest or
    new.canonicalizer_version is distinct from old.canonicalizer_version or
    new.interpretation_version is distinct from old.interpretation_version or
    new.interpretation_registry_digest is distinct from old.interpretation_registry_digest or
    new.scoring_engine_version is distinct from old.scoring_engine_version or
    new.scoring_contract_version is distinct from old.scoring_contract_version or
    new.report_model_version is distinct from old.report_model_version or
    new.fixture_set_version is distinct from old.fixture_set_version or
    new.migration_contract_version is distinct from old.migration_contract_version or
    new.edge_release_ref is distinct from old.edge_release_ref
  ) then
    raise exception 'Verified or published release identity is immutable; register a new release' using errcode = '55000';
  end if;
  return new;
end;
$function$;

drop trigger if exists c03_release_immutable_guard on public.assessment_config_releases;
create trigger c03_release_immutable_guard
before update or delete on public.assessment_config_releases
for each row execute function public.c03_release_immutable_guard();

create or replace function public.register_assessment_config_release_secure(
  p_assessment_type_id uuid,
  p_git_commit_sha text,
  p_config_digest text,
  p_canonicalizer_version text,
  p_interpretation_version integer,
  p_interpretation_registry_digest text,
  p_scoring_engine_version text,
  p_scoring_contract_version text,
  p_report_model_version text,
  p_fixture_set_version text,
  p_migration_contract_version text,
  p_edge_release_ref text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_assessment public.assessment_types%rowtype;
  v_release public.assessment_config_releases%rowtype;
begin
  perform public.require_admin_capability('assessment.edit');

  select * into v_assessment
  from public.assessment_types
  where id = p_assessment_type_id
  for update;
  if not found then
    raise exception 'Assessment version not found' using errcode = 'P0002';
  end if;
  if v_assessment.status not in ('draft','archived','published') then
    raise exception 'Only an existing draft, archived, or published version can be registered' using errcode = '55000';
  end if;
  if coalesce(p_git_commit_sha, '') !~ '^[0-9a-f]{40}([0-9a-f]{24})?$'
     or coalesce(p_config_digest, '') !~ '^[0-9a-f]{64}$'
     or coalesce(p_interpretation_registry_digest, '') !~ '^[0-9a-f]{64}$'
     or p_interpretation_version is null or p_interpretation_version < 1
     or nullif(trim(p_canonicalizer_version), '') is null
     or nullif(trim(p_scoring_engine_version), '') is null
     or nullif(trim(p_scoring_contract_version), '') is null
     or nullif(trim(p_report_model_version), '') is null
     or nullif(trim(p_fixture_set_version), '') is null
     or nullif(trim(p_migration_contract_version), '') is null
     or nullif(trim(p_edge_release_ref), '') is null then
    raise exception 'Release manifest is incomplete or has invalid digest/version fields' using errcode = '22023';
  end if;

  insert into public.assessment_config_releases(
    family_id, assessment_type_id, assessment_version, git_commit_sha,
    config_digest, canonicalizer_version, interpretation_version,
    interpretation_registry_digest, scoring_engine_version, scoring_contract_version,
    report_model_version, fixture_set_version, migration_contract_version,
    edge_release_ref, state, created_by
  ) values (
    v_assessment.family_id, v_assessment.id, v_assessment.version, p_git_commit_sha,
    p_config_digest, p_canonicalizer_version, p_interpretation_version,
    p_interpretation_registry_digest, p_scoring_engine_version, p_scoring_contract_version,
    p_report_model_version, p_fixture_set_version, p_migration_contract_version,
    trim(p_edge_release_ref), 'PREPARED', auth.uid()
  )
  on conflict (assessment_type_id, git_commit_sha, config_digest) do nothing;

  select * into v_release
  from public.assessment_config_releases
  where assessment_type_id = p_assessment_type_id
    and git_commit_sha = p_git_commit_sha
    and config_digest = p_config_digest;

  if v_release.state = 'REJECTED' then
    raise exception 'This exact release identity was rejected; correct the manifest and register a new identity' using errcode = '55000';
  end if;

  return jsonb_build_object(
    'success', true,
    'release_id', v_release.id,
    'state', v_release.state,
    'assessment_type_id', v_release.assessment_type_id,
    'assessment_version', v_release.assessment_version,
    'config_digest', v_release.config_digest
  );
end;
$function$;

create or replace function public.verify_assessment_config_release_secure(
  p_release_id uuid,
  p_actual_family_id uuid,
  p_actual_assessment_type_id uuid,
  p_actual_assessment_version integer,
  p_actual_config_digest text,
  p_actual_canonicalizer_version text,
  p_actual_registry_digest text,
  p_actual_git_commit_sha text,
  p_actual_edge_release_ref text,
  p_actual_interpretation_version integer,
  p_actual_scoring_engine_version text,
  p_actual_scoring_contract_version text,
  p_actual_report_model_version text,
  p_actual_fixture_set_version text,
  p_actual_migration_contract_version text,
  p_validation_report jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_release public.assessment_config_releases%rowtype;
  v_mismatches jsonb := '[]'::jsonb;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'Service-role runtime verifier required' using errcode = '42501';
  end if;

  select * into v_release
  from public.assessment_config_releases
  where id = p_release_id
  for update;
  if not found then
    raise exception 'Assessment release not found' using errcode = 'P0002';
  end if;
  if v_release.state not in ('PREPARED','VERIFIED') then
    raise exception 'Only prepared releases can be verified' using errcode = '55000';
  end if;

  if p_actual_family_id is distinct from v_release.family_id then v_mismatches := v_mismatches || jsonb_build_array('family_id'); end if;
  if p_actual_assessment_type_id is distinct from v_release.assessment_type_id then v_mismatches := v_mismatches || jsonb_build_array('assessment_type_id'); end if;
  if p_actual_assessment_version is distinct from v_release.assessment_version then v_mismatches := v_mismatches || jsonb_build_array('assessment_version'); end if;
  if p_actual_config_digest is distinct from v_release.config_digest then v_mismatches := v_mismatches || jsonb_build_array('config_digest'); end if;
  if p_actual_canonicalizer_version is distinct from v_release.canonicalizer_version then v_mismatches := v_mismatches || jsonb_build_array('canonicalizer_version'); end if;
  if p_actual_registry_digest is distinct from v_release.interpretation_registry_digest then v_mismatches := v_mismatches || jsonb_build_array('interpretation_registry_digest'); end if;
  if p_actual_git_commit_sha is distinct from v_release.git_commit_sha then v_mismatches := v_mismatches || jsonb_build_array('git_commit_sha'); end if;
  if p_actual_edge_release_ref is distinct from v_release.edge_release_ref then v_mismatches := v_mismatches || jsonb_build_array('edge_release_ref'); end if;
  if p_actual_interpretation_version is distinct from v_release.interpretation_version then v_mismatches := v_mismatches || jsonb_build_array('interpretation_version'); end if;
  if p_actual_scoring_engine_version is distinct from v_release.scoring_engine_version then v_mismatches := v_mismatches || jsonb_build_array('scoring_engine_version'); end if;
  if p_actual_scoring_contract_version is distinct from v_release.scoring_contract_version then v_mismatches := v_mismatches || jsonb_build_array('scoring_contract_version'); end if;
  if p_actual_report_model_version is distinct from v_release.report_model_version then v_mismatches := v_mismatches || jsonb_build_array('report_model_version'); end if;
  if p_actual_fixture_set_version is distinct from v_release.fixture_set_version then v_mismatches := v_mismatches || jsonb_build_array('fixture_set_version'); end if;
  if p_actual_migration_contract_version is distinct from v_release.migration_contract_version then v_mismatches := v_mismatches || jsonb_build_array('migration_contract_version'); end if;

  if jsonb_array_length(v_mismatches) > 0 then
    update public.assessment_config_releases
    set state = 'REJECTED',
        failure_reason = 'Runtime verification mismatch: ' || array_to_string(array(select jsonb_array_elements_text(v_mismatches)), ', '),
        validation_report = coalesce(p_validation_report, '{}'::jsonb) || jsonb_build_object('mismatches', v_mismatches)
    where id = p_release_id;
    return jsonb_build_object('success', false, 'state', 'REJECTED', 'mismatches', v_mismatches);
  end if;

  update public.assessment_config_releases
  set state = 'VERIFIED',
      verified_at = now(),
      verified_config_digest = p_actual_config_digest,
      verified_registry_digest = p_actual_registry_digest,
      verified_git_commit_sha = p_actual_git_commit_sha,
      verified_edge_release_ref = p_actual_edge_release_ref,
      verified_interpretation_version = p_actual_interpretation_version,
      verified_scoring_engine_version = p_actual_scoring_engine_version,
      verified_scoring_contract_version = p_actual_scoring_contract_version,
      verified_report_model_version = p_actual_report_model_version,
      verified_fixture_set_version = p_actual_fixture_set_version,
      verified_migration_contract_version = p_actual_migration_contract_version,
      validation_report = coalesce(p_validation_report, '{}'::jsonb),
      failure_reason = null
  where id = p_release_id;

  return jsonb_build_object('success', true, 'state', 'VERIFIED', 'release_id', p_release_id);
end;
$function$;

create or replace function public.c03_assessment_release_gate_enabled()
returns boolean
language sql
stable
set search_path to ''
as $function$
  select coalesce((select enabled from public.assessment_config_release_settings where singleton), false);
$function$;

create or replace function public.c03_guard_family_release_pointer()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_release public.assessment_config_releases%rowtype;
  v_requested_release_id uuid;
begin
  if not public.c03_assessment_release_gate_enabled() then
    return new;
  end if;

  v_requested_release_id := nullif(current_setting('app.c03_release_id', true), '')::uuid;

  if new.current_published_version_id is distinct from old.current_published_version_id then
    if new.current_published_version_id is null then
      new.current_release_id := null;
      if old.current_release_id is not null then
        update public.assessment_config_releases set state = 'VERIFIED'
        where id = old.current_release_id and state = 'PUBLISHED';
      end if;
      return new;
    end if;

    select * into v_release
    from public.assessment_config_releases
    where family_id = new.id
      and assessment_type_id = new.current_published_version_id
      and (v_requested_release_id is null or id = v_requested_release_id)
      and state = 'VERIFIED'
      and verified_config_digest = config_digest
      and verified_registry_digest = interpretation_registry_digest
      and verified_git_commit_sha = git_commit_sha
      and verified_edge_release_ref = edge_release_ref
    order by verified_at desc
    limit 1
    for update;
    if not found then
      raise exception 'Publication blocked: no matching verified C-03 release exists' using errcode = '55000';
    end if;

    if old.current_release_id is not null then
      update public.assessment_config_releases set state = 'VERIFIED'
      where id = old.current_release_id and state = 'PUBLISHED';
    end if;
    update public.assessment_config_releases set state = 'PUBLISHED', published_at = now()
    where id = v_release.id;
    new.current_release_id := v_release.id;
    return new;
  end if;

  if new.current_release_id is distinct from old.current_release_id then
    if new.current_published_version_id is null then
      raise exception 'Cannot bind a release while the family has no published version' using errcode = '55000';
    end if;
    select * into v_release
    from public.assessment_config_releases
    where id = new.current_release_id
      and family_id = new.id
      and assessment_type_id = new.current_published_version_id
      and state in ('VERIFIED','PUBLISHED')
      and verified_config_digest = config_digest
      and verified_registry_digest = interpretation_registry_digest
      and verified_git_commit_sha = git_commit_sha
      and verified_edge_release_ref = edge_release_ref
    for update;
    if not found then
      raise exception 'Release pointer does not match a verified release for the published version' using errcode = '55000';
    end if;
    if old.current_release_id is not null then
      update public.assessment_config_releases set state = 'VERIFIED'
      where id = old.current_release_id and state = 'PUBLISHED';
    end if;
    update public.assessment_config_releases set state = 'PUBLISHED', published_at = coalesce(published_at, now())
    where id = v_release.id;
  end if;
  return new;
end;
$function$;

drop trigger if exists c03_guard_family_release_pointer on public.assessment_families;
create trigger c03_guard_family_release_pointer
before update of current_published_version_id, current_release_id on public.assessment_families
for each row execute function public.c03_guard_family_release_pointer();

create or replace function public.c03_pin_session_release()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_family public.assessment_families%rowtype;
  v_release public.assessment_config_releases%rowtype;
begin
  if not public.c03_assessment_release_gate_enabled() then
    return new;
  end if;
  select f.* into v_family
  from public.assessment_families f
  where f.current_published_version_id = new.assessment_type_id
  for share;
  if not found or v_family.current_release_id is null then
    raise exception 'Session start blocked: published assessment has no verified release pointer' using errcode = '55000';
  end if;
  select * into v_release from public.assessment_config_releases
  where id = v_family.current_release_id
    and family_id = v_family.id
    and assessment_type_id = new.assessment_type_id
    and state = 'PUBLISHED'
    and verified_config_digest = config_digest
  for share;
  if not found then
    raise exception 'Session start blocked: active assessment release is invalid' using errcode = '55000';
  end if;
  new.assessment_release_id := v_release.id;
  return new;
end;
$function$;

drop trigger if exists c03_pin_session_release on public.sessions;
create trigger c03_pin_session_release
before insert on public.sessions
for each row execute function public.c03_pin_session_release();

create or replace function public.activate_existing_assessment_release_secure(
  p_release_id uuid,
  p_expected_published_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_release public.assessment_config_releases%rowtype;
  v_family public.assessment_families%rowtype;
  v_version public.assessment_types%rowtype;
begin
  perform public.require_admin_capability('public.publish');
  select * into v_release from public.assessment_config_releases where id = p_release_id for update;
  if not found then raise exception 'Assessment release not found' using errcode = 'P0002'; end if;
  if v_release.state <> 'VERIFIED' or v_release.verified_config_digest is distinct from v_release.config_digest then
    raise exception 'Only a verified release can be activated' using errcode = '55000';
  end if;
  select * into v_family from public.assessment_families where id = v_release.family_id for update;
  if not found then raise exception 'Assessment family not found' using errcode = 'P0002'; end if;
  if v_family.current_published_version_id is distinct from p_expected_published_version_id
     or v_family.current_published_version_id is distinct from v_release.assessment_type_id then
    raise exception 'Published pointer compare-and-swap failed' using errcode = '40001';
  end if;
  select * into v_version from public.assessment_types where id = v_release.assessment_type_id;
  if not found or v_version.status <> 'published' or v_version.is_active is not true
     or v_version.family_id is distinct from v_release.family_id
     or v_version.version is distinct from v_release.assessment_version then
    raise exception 'Release does not match the current published version' using errcode = '55000';
  end if;
  if not public.c03_assessment_release_gate_enabled() then
    update public.assessment_config_releases set state = 'PUBLISHED', published_at = coalesce(published_at, now())
    where id = p_release_id;
  end if;
  update public.assessment_families set current_release_id = p_release_id, updated_at = now()
  where id = v_family.id;
  return jsonb_build_object('success', true, 'release_id', p_release_id, 'state', 'PUBLISHED');
end;
$function$;

create or replace function public.publish_assessment_config_release_secure(
  p_release_id uuid,
  p_expected_published_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_release public.assessment_config_releases%rowtype;
  v_family public.assessment_families%rowtype;
  v_version public.assessment_types%rowtype;
  v_result jsonb;
begin
  perform public.require_admin_capability('public.publish');
  select * into v_release from public.assessment_config_releases where id = p_release_id for update;
  if not found then raise exception 'Assessment release not found' using errcode = 'P0002'; end if;
  if v_release.state <> 'VERIFIED' or v_release.verified_config_digest is distinct from v_release.config_digest then
    raise exception 'Only a verified release can be published' using errcode = '55000';
  end if;
  select * into v_family from public.assessment_families where id = v_release.family_id for update;
  if not found then raise exception 'Assessment family not found' using errcode = 'P0002'; end if;
  if v_family.current_published_version_id is distinct from p_expected_published_version_id then
    raise exception 'Published pointer compare-and-swap failed' using errcode = '40001';
  end if;
  select * into v_version from public.assessment_types where id = v_release.assessment_type_id for update;
  if not found or v_version.family_id is distinct from v_release.family_id
     or v_version.version is distinct from v_release.assessment_version then
    raise exception 'Release does not match its assessment version' using errcode = '55000';
  end if;

  if v_version.status = 'draft' then
    perform set_config('app.c03_release_id', v_release.id::text, true);
    v_result := public.publish_assessment_version_secure(v_version.id);
    perform set_config('app.c03_release_id', '', true);
  elsif v_version.status = 'archived' then
    perform set_config('app.c03_release_id', v_release.id::text, true);
    v_result := public.restore_public_assessment_secure(v_version.id);
    perform set_config('app.c03_release_id', '', true);
  elsif v_version.status = 'published' and v_family.current_published_version_id = v_version.id then
    update public.assessment_families set current_release_id = v_release.id, updated_at = now()
    where id = v_family.id;
  else
    raise exception 'Release target is not a publishable working or current published version' using errcode = '55000';
  end if;

  if not public.c03_assessment_release_gate_enabled() then
    update public.assessment_config_releases set state = 'PUBLISHED', published_at = coalesce(published_at, now())
    where id = v_release.id;
    update public.assessment_families set current_release_id = v_release.id, updated_at = now()
    where id = v_release.family_id and current_published_version_id = v_release.assessment_type_id;
  end if;

  select * into v_family from public.assessment_families where id = v_release.family_id;
  if v_family.current_published_version_id is distinct from v_release.assessment_type_id
     or v_family.current_release_id is distinct from v_release.id then
    raise exception 'Publication did not activate the requested verified release' using errcode = '55000';
  end if;
  return jsonb_build_object('success', true, 'release_id', v_release.id, 'state', 'PUBLISHED', 'result', v_result);
end;
$function$;

create or replace function public.enable_assessment_config_release_gate_secure()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_missing integer;
begin
  perform public.require_admin_capability('public.publish');
  perform 1 from public.assessment_config_release_settings where singleton for update;
  select count(*) into v_missing
  from public.assessment_families f
  where f.current_published_version_id is not null
    and not exists (
      select 1 from public.assessment_config_releases r
      where r.id = f.current_release_id
        and r.family_id = f.id
        and r.assessment_type_id = f.current_published_version_id
        and r.state = 'PUBLISHED'
        and r.verified_config_digest = r.config_digest
        and r.verified_registry_digest = r.interpretation_registry_digest
        and r.verified_git_commit_sha = r.git_commit_sha
        and r.verified_edge_release_ref = r.edge_release_ref
    );
  if v_missing > 0 then
    raise exception 'Cannot enable C-03 release gate: % published families lack a verified active release', v_missing using errcode = '55000';
  end if;
  update public.assessment_config_release_settings
  set enabled = true, enabled_at = now(), enabled_by = auth.uid(), updated_at = now()
  where singleton;
  return jsonb_build_object('success', true, 'enabled', true);
end;
$function$;

revoke all on function public.c03_release_immutable_guard() from public, anon, authenticated;
revoke all on function public.c03_assessment_release_gate_enabled() from public, anon, authenticated;
revoke all on function public.c03_guard_family_release_pointer() from public, anon, authenticated;
revoke all on function public.c03_pin_session_release() from public, anon, authenticated;
revoke all on function public.register_assessment_config_release_secure(uuid,text,text,text,integer,text,text,text,text,text,text,text) from public, anon;
revoke all on function public.verify_assessment_config_release_secure(uuid,uuid,uuid,integer,text,text,text,text,text,integer,text,text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.activate_existing_assessment_release_secure(uuid,uuid) from public, anon;
revoke all on function public.publish_assessment_config_release_secure(uuid,uuid) from public, anon;
revoke all on function public.enable_assessment_config_release_gate_secure() from public, anon;

grant execute on function public.register_assessment_config_release_secure(uuid,text,text,text,integer,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.verify_assessment_config_release_secure(uuid,uuid,uuid,integer,text,text,text,text,text,integer,text,text,text,text,text,jsonb) to service_role;
grant execute on function public.activate_existing_assessment_release_secure(uuid,uuid) to authenticated;
grant execute on function public.publish_assessment_config_release_secure(uuid,uuid) to authenticated;
grant execute on function public.enable_assessment_config_release_gate_secure() to authenticated;

commit;
