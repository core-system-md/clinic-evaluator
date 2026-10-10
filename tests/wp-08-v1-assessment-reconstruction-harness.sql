create extension if not exists pgcrypto;
create table public.assessment_families(id uuid primary key,slug text unique,current_published_version_id uuid,updated_at timestamptz default now());
create table public.assessment_types(id uuid primary key default gen_random_uuid(),slug text unique,title_ar text,title_en text,description text,question_count int,axis_count int,has_traps bool,has_ev_simulator bool,config_version int,is_active bool,status text,version int,published_at timestamptz,family_id uuid,parent_id uuid,axis_roles jsonb,kpi_mappings jsonb,ev_mappings jsonb);
create table public.axes(id uuid primary key default gen_random_uuid(),assessment_type_id uuid,code text,title text,title_ar text,description text,weight numeric,display_order int,status text);
create table public.questions(id uuid primary key default gen_random_uuid(),axis_id uuid,assessment_type_id uuid,code text,question_text text,question_text_ar text,question_type text,display_order int,is_required bool,trap_index int,status text,impact text,layer text,trap_for jsonb);
create table public.options(id uuid primary key default gen_random_uuid(),question_id uuid,option_index int,option_value int,label text,label_ar text,display_text text,display_text_ar text,is_trap bool,display_order int);
create table public.sessions(id uuid primary key default gen_random_uuid(),assessment_type_id uuid);
create table public.answers(id uuid primary key default gen_random_uuid(),session_id uuid);
create table public.assessment_results(id uuid primary key default gen_random_uuid(),assessment_type_id uuid);
create table public.leads(id uuid primary key default gen_random_uuid(),assessment_type_id uuid);
create table public.assessment_session_access(id uuid primary key default gen_random_uuid(),assessment_type_id uuid);
create table public.historical_snapshots(id uuid primary key default gen_random_uuid(),assessment_type_id uuid);
create table public.insights_mapping(id uuid primary key default gen_random_uuid(),assessment_type_id uuid,insight_code text);
create table public.assessment_assets(id uuid primary key default gen_random_uuid(),assessment_type_id uuid);
create table public.traps(id uuid primary key default gen_random_uuid(),assessment_type_id uuid);
insert into public.assessment_families values(gen_random_uuid(),'comprehensive-clinic-assessment',null),(gen_random_uuid(),'patient-journey',null);
-- Seed the three superseded versions with the exact IDs expected by the migration.
insert into public.assessment_types(id,slug,version,status,is_active,family_id,parent_id,question_count,axis_count) values
('0779bf3c-45a1-42d9-a2e5-9c9523a23b81','comprehensive-clinic-assessment',1,'archived',false,(select id from public.assessment_families where slug='comprehensive-clinic-assessment'),null,36,6),
('d58150e6-9a85-4837-b41f-2a5f99682639','comprehensive-clinic-assessment-v2',2,'published',true,(select id from public.assessment_families where slug='comprehensive-clinic-assessment'),'0779bf3c-45a1-42d9-a2e5-9c9523a23b81',36,6),
('97663a83-52cf-4251-a3bc-667e47fb591a','patient-journey',1,'published',true,(select id from public.assessment_families where slug='patient-journey'),null,25,5);
create unique index assessment_types_family_version_uidx on public.assessment_types(family_id,version);
alter table public.assessment_types add constraint assessment_types_parent_id_fkey foreign key(parent_id) references public.assessment_types(id);
alter table public.assessment_families add constraint assessment_families_current_published_version_fkey foreign key(current_published_version_id) references public.assessment_types(id) on delete restrict;
update public.assessment_families set current_published_version_id='d58150e6-9a85-4837-b41f-2a5f99682639' where slug='comprehensive-clinic-assessment';
update public.assessment_families set current_published_version_id='97663a83-52cf-4251-a3bc-667e47fb591a' where slug='patient-journey';
create function public._wp08_noop_trigger() returns trigger language plpgsql as $ begin return coalesce(new,old); end $;
create trigger p2_assessment_type_immutability before update or delete on public.assessment_types for each row execute function public._wp08_noop_trigger();
create trigger p2_axes_immutable before insert or update or delete on public.axes for each row execute function public._wp08_noop_trigger();
create trigger p2_questions_immutable before insert or update or delete on public.questions for each row execute function public._wp08_noop_trigger();
create trigger p2_options_immutable before insert or update or delete on public.options for each row execute function public._wp08_noop_trigger();
create trigger p2_traps_immutable before insert or update or delete on public.traps for each row execute function public._wp08_noop_trigger();
create trigger p2_insights_mapping_immutable before insert or update or delete on public.insights_mapping for each row execute function public._wp08_noop_trigger();
create trigger p2_assessment_assets_immutable before insert or update or delete on public.assessment_assets for each row execute function public._wp08_noop_trigger();
create table public._wp08_old_content_marker(id int);
insert into public._wp08_old_content_marker values(1);
\i supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql
do $$
declare n int; comp uuid; patient uuid;
begin
 select current_published_version_id into comp from public.assessment_families where slug='comprehensive-clinic-assessment';
 select current_published_version_id into patient from public.assessment_families where slug='patient-journey';
 assert (select version from public.assessment_types where id=comp)=1, 'Comprehensive is not V1';
 assert (select version from public.assessment_types where id=patient)=1, 'Patient Journey is not V1';
 assert (select count(*) from public.questions where assessment_type_id=comp)=36, 'Comprehensive question count';
 assert (select count(*) from public.options where question_id in (select id from public.questions where assessment_type_id=comp))=152, 'Comprehensive option count';
 assert (select count(*) from public.questions where assessment_type_id=patient)=25, 'Patient question count';
 assert (select count(*) from public.options where question_id in (select id from public.questions where assessment_type_id=patient))=96, 'Patient option count';
 assert abs((select coalesce(sum(weight),0) from public.axes where assessment_type_id=comp)-100) < 0.000001, 'Comprehensive V1 weight total';
 assert abs((select coalesce(sum(weight),0) from public.axes where assessment_type_id=patient)-100) < 0.000001, 'Patient V1 weight total';
 assert (select count(*) from public.axes where assessment_type_id=patient and weight between 0 and 100)=5, 'Patient V1 canonical weight range';
 assert (select count(*) from public.axes where assessment_type_id=comp and weight between 0 and 100)=6, 'Comprehensive V1 canonical weight range';
 assert not exists(select 1 from public.assessment_types where version=2 and status='published'), 'Published V2 remains';
 assert (select count(*) from public.assessment_types where version=1 and status='published')=2, 'Published final V1 count';
end $$;
