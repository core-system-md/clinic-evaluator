\set ON_ERROR_STOP on

do $roles$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end
$roles$;

create schema if not exists auth;
create table auth.users(id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.role', true), '')
$$;

create table public.assessment_families(
  id uuid primary key,
  slug text not null unique,
  current_published_version_id uuid,
  current_release_id uuid,
  updated_at timestamptz not null default now()
);
create table public.assessment_types(
  id uuid primary key,
  family_id uuid not null references public.assessment_families(id),
  version integer not null,
  status text not null,
  is_active boolean not null default false
);
create table public.sessions(
  id uuid primary key,
  assessment_type_id uuid not null references public.assessment_types(id),
  assessment_release_id uuid
);
create or replace function public.require_admin_capability(text)
returns void language plpgsql as $$ begin return; end $$;
create or replace function public.publish_assessment_version_secure(p_version_id uuid)
returns jsonb language plpgsql as $$
declare v public.assessment_types%rowtype;
begin
  select * into v from public.assessment_types where id=p_version_id for update;
  update public.assessment_types set status='archived',is_active=false
    where family_id=v.family_id and id <> p_version_id and status='published';
  update public.assessment_types set status='published',is_active=true where id=p_version_id;
  update public.assessment_families set current_published_version_id=p_version_id,updated_at=now()
    where id=v.family_id;
  return jsonb_build_object('success',true,'version_id',p_version_id);
end $$;
create or replace function public.restore_public_assessment_secure(p_version_id uuid)
returns jsonb language plpgsql as $$
declare v public.assessment_types%rowtype;
begin
  select * into v from public.assessment_types where id=p_version_id for update;
  update public.assessment_types set status='archived',is_active=false
    where family_id=v.family_id and id <> p_version_id and status='published';
  update public.assessment_types set status='published',is_active=true where id=p_version_id;
  update public.assessment_families set current_published_version_id=p_version_id,updated_at=now()
    where id=v.family_id;
  return jsonb_build_object('success',true,'version_id',p_version_id);
end $$;

\i supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql

insert into auth.users(id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.assessment_families(id,slug,current_published_version_id)
values ('11111111-1111-4111-8111-111111111111','clinic-performance','22222222-2222-4222-8222-222222222222');
insert into public.assessment_types(id,family_id,version,status,is_active)
values
 ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',1,'published',true),
 ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',2,'draft',true),
 ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111',3,'draft',true);

select set_config('test.uid','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select set_config('request.jwt.claim.role','authenticated',false);

select public.register_assessment_config_release_secure(
  '22222222-2222-4222-8222-222222222222',
  repeat('a',40), repeat('b',64), 'C03_CANONICAL_V1', 1, repeat('c',64),
  'MD_CODE_ASSESSMENT_ENGINE','FINAL_IMPLEMENTATION_CONTRACT-2026-10-07',
  'REPORT_MODEL_V1','P3_FIXTURE_SET_V1','C03_RELEASE_CONTRACT_V1','edge-v1'
) as release1 \gset

select set_config('request.jwt.claim.role','service_role',false);
select public.verify_assessment_config_release_secure(
  (:'release1'::jsonb->>'release_id')::uuid,
  repeat('b',64), repeat('c',64), repeat('a',40), 'edge-v1', 1,
  'MD_CODE_ASSESSMENT_ENGINE','FINAL_IMPLEMENTATION_CONTRACT-2026-10-07',
  'REPORT_MODEL_V1','P3_FIXTURE_SET_V1','C03_RELEASE_CONTRACT_V1','{"fixture":"matching"}'::jsonb
) as verified1 \gset
select case when (:'verified1'::jsonb->>'state')='VERIFIED' then true else (select 1/0=1) end;

select set_config('request.jwt.claim.role','authenticated',false);
select public.activate_existing_assessment_release_secure(
  (:'release1'::jsonb->>'release_id')::uuid,
  '22222222-2222-4222-8222-222222222222'
);
insert into public.sessions(id,assessment_type_id)
values ('55555555-5555-4555-8555-555555555555','22222222-2222-4222-8222-222222222222');
select 1 / ((
  select assessment_release_id = (:'release1'::jsonb->>'release_id')::uuid
  from public.sessions where id='55555555-5555-4555-8555-555555555555'
)::int) as session_release_pinned;

select public.enable_assessment_config_release_gate_secure();

select public.register_assessment_config_release_secure(
  '33333333-3333-4333-8333-333333333333',
  repeat('d',40), repeat('e',64), 'C03_CANONICAL_V1', 1, repeat('f',64),
  'MD_CODE_ASSESSMENT_ENGINE','FINAL_IMPLEMENTATION_CONTRACT-2026-10-07',
  'REPORT_MODEL_V1','P3_FIXTURE_SET_V1','C03_RELEASE_CONTRACT_V1','edge-v2'
) as release2 \gset
select set_config('request.jwt.claim.role','service_role',false);
select public.verify_assessment_config_release_secure(
  (:'release2'::jsonb->>'release_id')::uuid,
  repeat('e',64), repeat('f',64), repeat('d',40), 'edge-v2', 1,
  'MD_CODE_ASSESSMENT_ENGINE','FINAL_IMPLEMENTATION_CONTRACT-2026-10-07',
  'REPORT_MODEL_V1','P3_FIXTURE_SET_V1','C03_RELEASE_CONTRACT_V1','{"fixture":"matching"}'::jsonb
) as verified2 \gset
select set_config('request.jwt.claim.role','authenticated',false);
select public.publish_assessment_config_release_secure(
  (:'release2'::jsonb->>'release_id')::uuid,
  '22222222-2222-4222-8222-222222222222'
);
select 1 / ((
  select current_published_version_id = '33333333-3333-4333-8333-333333333333'::uuid
     and current_release_id = (:'release2'::jsonb->>'release_id')::uuid
  from public.assessment_families where id='11111111-1111-4111-8111-111111111111'
)::int) as verified_release_published;

do $assert_stale_cas$
begin
  begin
    perform public.publish_assessment_config_release_secure(
      (select id from public.assessment_config_releases where config_digest=repeat('b',64)),
      '22222222-2222-4222-8222-222222222222'
    );
    raise exception 'stale pointer compare-and-swap unexpectedly succeeded';
  exception when sqlstate '40001' then null;
  end;
end
$assert_stale_cas$;

select public.publish_assessment_config_release_secure(
  (:'release1'::jsonb->>'release_id')::uuid,
  '33333333-3333-4333-8333-333333333333'
);
select 1 / ((
  select current_published_version_id = '22222222-2222-4222-8222-222222222222'::uuid
     and current_release_id = (:'release1'::jsonb->>'release_id')::uuid
  from public.assessment_families where id='11111111-1111-4111-8111-111111111111'
)::int) as rollback_restored_verified_release;
select 1 / ((
  select state = 'PUBLISHED' from public.assessment_config_releases
  where id=(:'release1'::jsonb->>'release_id')::uuid
)::int) as rollback_release_state_verified;

select public.register_assessment_config_release_secure(
  '44444444-4444-4444-8444-444444444444',
  repeat('1',40), repeat('2',64), 'C03_CANONICAL_V1', 1, repeat('3',64),
  'MD_CODE_ASSESSMENT_ENGINE','FINAL_IMPLEMENTATION_CONTRACT-2026-10-07',
  'REPORT_MODEL_V1','P3_FIXTURE_SET_V1','C03_RELEASE_CONTRACT_V1','edge-bad'
) as release_bad \gset
select set_config('request.jwt.claim.role','service_role',false);
select public.verify_assessment_config_release_secure(
  (:'release_bad'::jsonb->>'release_id')::uuid,
  repeat('9',64), repeat('3',64), repeat('1',40), 'edge-bad', 1,
  'MD_CODE_ASSESSMENT_ENGINE','FINAL_IMPLEMENTATION_CONTRACT-2026-10-07',
  'REPORT_MODEL_V1','P3_FIXTURE_SET_V1','C03_RELEASE_CONTRACT_V1','{"fixture":"intentional mismatch"}'::jsonb
) as rejected_bad \gset
select 1 / (((:'rejected_bad'::jsonb)::jsonb->>'state') = 'REJECTED')::int as drift_rejected;

do $assert_immutable$
declare v_blocked boolean := false;
begin
  begin
    update public.assessment_config_releases set config_digest=repeat('0',64)
    where id=(select id from public.assessment_config_releases where config_digest=repeat('b',64));
  exception when sqlstate '55000' then
    v_blocked := true;
  end;
  if not v_blocked then raise exception 'verified release identity unexpectedly mutable'; end if;
end
$assert_immutable$;

select 'C03_HYBRID_CONFIG_RELEASE_HARNESS_PASS' as result;
