-- C-02: accept reconstructed assessment option value 70.
-- Forward-only correction. Never edit the previously applied foundation migration.
begin;

do $guard$
begin
  if not exists (
    select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = 'public'
       and t.relname = 'answers'
       and c.conname = 'answers_answer_value_compat_check'
       and c.contype = 'c'
  ) then
    raise exception 'Expected constraint public.answers.answers_answer_value_compat_check was not found';
  end if;

  if exists (
    select 1
      from public.answers
     where answer_value is not null
       and answer_value not in (0, 1, 2, 3, 4, 5, 40, 70, 100)
  ) then
    raise exception 'C-02 stopped: existing answers.answer_value contains values outside the approved compatibility set';
  end if;
end
$guard$;

alter table public.answers
  drop constraint answers_answer_value_compat_check;

alter table public.answers
  add constraint answers_answer_value_compat_check
  check (answer_value in (0, 1, 2, 3, 4, 5, 40, 70, 100));

commit;
