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
  is_active boolean not null default false,
  published_at timestamptz,
  archived_at timestamptz,
  updated_at timestamptz not null default now()
);
create table public.sessions(
  id uuid primary key,
  assessment_type_id uuid not null references public.assessment_types(id),
  assessment_release_id uuid
);
create table public.admin_users(
  user_id uuid primary key references auth.users(id),
  role text not null,
  active boolean not null default true
);
create table public.admin_capabilities(
  user_id uuid not null references public.admin_users(user_id),
  capability text not null,
  granted_by uuid references auth.users(id),
  primary key(user_id, capability)
);
create table public.admin_audit_log(
  id bigserial primary key,
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  family_id uuid,
  before_data jsonb,
  after_data jsonb
);
-- Import exact authorization functions extracted from the canonical repository migration.
\i tests/.generated-c03-admin-auth.sql
create or replace function public.write_admin_audit(
  p_action text, p_entity_type text, p_entity_id uuid, p_family_id uuid,
  p_before jsonb default null, p_after jsonb default null
) returns bigint language plpgsql as $c03$
declare v_id bigint;
begin
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,family_id,before_data,after_data)
  values(auth.uid(),p_action,p_entity_type,p_entity_id,p_family_id,p_before,p_after)
  returning id into v_id;
  return v_id;
end $c03$;
create or replace function public.validate_assessment_version_secure(p_version_id uuid)
returns jsonb language sql as $c03$ select jsonb_build_object('valid', true) $c03$;

-- Load the real publication/restoration function bodies used by the repository.
\i supabase/migrations/20261003175645_p5_p2_immutability_lifecycle_compat.sql
\i supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql

insert into auth.users(id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.admin_users(user_id,role,active)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','owner',true);
insert into public.assessment_families(id,slug,current_published_version_id)
values ('11111111-1111-4111-8111-111111111111','clinic-performance','22222222-2222-4222-8222-222222222222');

insert into public.assessment_types(id,family_id,version,status,is_active)
values
 ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',1,'published',true),
 ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',2,'draft',true),
 ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111',3,'draft',true);

select set_config('test.uid','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select set_config('request.jwt.claim.role','authenticated',false);

-- Exercise the actual repository authorization function through the actual lifecycle publisher.
insert into auth.users(id) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.admin_users(user_id,role,active)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','admin',true);
insert into public.assessment_families(id,slug,current_published_version_id)
values ('66666666-6666-4666-8666-666666666666','authorization-smoke','77777777-7777-4777-8777-777777777777');
insert into public.assessment_types(id,family_id,version,status,is_active)
values
 ('77777777-7777-4777-8777-777777777777','66666666-6666-4666-8666-666666666666',1,'published',true),
 ('88888888-8888-4888-8888-888888888888','66666666-6666-4666-8666-666666666666',2,'draft',true);

select set_config('test.uid','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
do $assert_admin_denied$
begin
  begin
    perform public.publish_assessment_version_secure('88888888-8888-4888-8888-888888888888');
    raise exception 'admin without public.publish unexpectedly passed authorization';
  exception when sqlstate '42501' then null;
  end;
  if (select status from public.assessment_types where id='88888888-8888-4888-8888-888888888888') <> 'draft' then
    raise exception 'denied publish mutated the draft';
  end if;
  if (select current_published_version_id from public.assessment_families where id='66666666-6666-4666-8666-666666666666')
       <> '77777777-7777-4777-8777-777777777777'::uuid then
    raise exception 'denied publish mutated the current published pointer';
  end if;
end
$assert_admin_denied$;

insert into public.admin_capabilities(user_id,capability,granted_by)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','public.publish','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select public.publish_assessment_version_secure('88888888-8888-4888-8888-888888888888');
select 1 / ((
  select status='published' from public.assessment_types where id='88888888-8888-4888-8888-888888888888'
)::int) as actual_authorized_publish_succeeded;
select 1 / ((
  select current_published_version_id='88888888-8888-4888-8888-888888888888'::uuid
  from public.assessment_families where id='66666666-6666-4666-8666-666666666666'
)::int) as actual_authorized_pointer_updated;
select 1 / ((
  select count(*) > 0 from public.admin_audit_log
  where action='assessment.publish'
    and entity_id='88888888-8888-4888-8888-888888888888'
)::int) as actual_authorized_publish_audited;

select set_config('test.uid','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
select public.stop_public_assessment_secure('66666666-6666-4666-8666-666666666666');

select public.register_assessment_config_release_secure(
  '22222222-2222-4222-8222-222222222222',
  repeat('a',40), repeat('b',64), 'C03_CANONICAL_V1', 1, repeat('c',64),
  'MD_CODE_ASSESSMENT_ENGINE','FINAL_IMPLEMENTATION_CONTRACT-2026-10-07',
  'REPORT_MODEL_V1','P3_FIXTURE_SET_V1','C03_RELEASE_CONTRACT_V1','edge-v1'
) as release1 \gset

select set_config('request.jwt.claim.role','service_role',false);
select public.verify_assessment_config_release_secure(
  (:'release1'::jsonb->>'release_id')::uuid,
  '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 1,
  repeat('b',64), 'C03_CANONICAL_V1', repeat('c',64), repeat('a',40), 'edge-v1', 1,
  'MD_CODE_ASSESSMENT_ENGINE','FINAL_IMPLEMENTATION_CONTRACT-2026-10-07',
  'REPORT_MODEL_V1','P3_FIXTURE_SET_V1','C03_RELEASE_CONTRACT_V1','{"fixture":"matching"}'::jsonb
) as verified1 \gset
select 1 / (((:'verified1'::jsonb->>'state')='VERIFIED')::int) as release_verified;

select set_config('request.jwt.claim.role','authenticated',false);
select public.activate_existing_assessment_release_secure(
  (:'release1'::jsonb->>'release_id')::uuid,
  '22222222-2222-4222-8222-222222222222'
);
select public.enable_assessment_config_release_gate_secure();
insert into public.sessions(id,assessment_type_id)
values ('55555555-5555-4555-8555-555555555555','22222222-2222-4222-8222-222222222222');
select 1 / ((
  select assessment_release_id = (:'release1'::jsonb->>'release_id')::uuid
  from public.sessions where id='55555555-5555-4555-8555-555555555555'
)::int) as session_release_pinned;

select public.register_assessment_config_release_secure(
  '33333333-3333-4333-8333-333333333333',
  repeat('d',40), repeat('e',64), 'C03_CANONICAL_V1', 1, repeat('f',64),
  'MD_CODE_ASSESSMENT_ENGINE','FINAL_IMPLEMENTATION_CONTRACT-2026-10-07',
  'REPORT_MODEL_V1','P3_FIXTURE_SET_V1','C03_RELEASE_CONTRACT_V1','edge-v2'
) as release2 \gset
select set_config('request.jwt.claim.role','service_role',false);
select public.verify_assessment_config_release_secure(
  (:'release2'::jsonb->>'release_id')::uuid,
  '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 2,
  repeat('e',64), 'C03_CANONICAL_V1', repeat('f',64), repeat('d',40), 'edge-v2', 1,
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
  '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444444', 3,
  repeat('9',64), 'C03_CANONICAL_V1', repeat('3',64), repeat('1',40), 'edge-bad', 1,
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
