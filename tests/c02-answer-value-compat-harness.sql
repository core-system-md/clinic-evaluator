\set ON_ERROR_STOP on

create schema if not exists public;
create table public.answers (
  id bigint generated always as identity primary key,
  answer_value integer,
  option_value integer
);
alter table public.answers
  add constraint answers_answer_value_compat_check
  check (answer_value in (0, 1, 2, 3, 4, 5, 40, 100));

-- Seed the compatibility contract's existing legacy values before migration.
insert into public.answers(answer_value, option_value)
values (0,0),(1,1),(2,2),(3,3),(4,4),(5,5),(40,40),(100,100);

\\i supabase/migrations/20261013110000_c02_allow_answer_value_70.sql

do $test$
declare
  v integer;
begin
  foreach v in array array[0,1,2,3,4,5,40,70,100] loop
    insert into public.answers(answer_value, option_value) values (v,v);
    if not exists (
      select 1 from public.answers where answer_value = v and option_value = v
    ) then
      raise exception 'Expected answer value % to persist with matching option value', v;
    end if;
  end loop;

  begin
    insert into public.answers(answer_value, option_value) values (99,99);
    raise exception 'Unsupported answer value 99 was accepted';
  exception when check_violation then
    null;
  end;

  if (select count(*) from public.answers where answer_value = 70 and option_value = 70) <> 1 then
    raise exception 'The selected 70-valued option did not persist exactly once';
  end if;

  if not exists (
    select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = 'public'
       and t.relname = 'answers'
       and c.conname = 'answers_answer_value_compat_check'
       and pg_get_constraintdef(c.oid) like '%70%'
  ) then
    raise exception 'Updated compatibility constraint does not include 70';
  end if;
end
$test$;

-- Existing legacy rows remain intact after the forward-only constraint change.
do $legacy$
begin
  if not exists (select 1 from public.answers where answer_value = 0)
     or not exists (select 1 from public.answers where answer_value = 1)
     or not exists (select 1 from public.answers where answer_value = 2)
     or not exists (select 1 from public.answers where answer_value = 3)
     or not exists (select 1 from public.answers where answer_value = 4)
     or not exists (select 1 from public.answers where answer_value = 5)
     or not exists (select 1 from public.answers where answer_value = 40)
     or not exists (select 1 from public.answers where answer_value = 100) then
    raise exception 'One or more legacy compatibility values were not preserved';
  end if;
end
$legacy$;
