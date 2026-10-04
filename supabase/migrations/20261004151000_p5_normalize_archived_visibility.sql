-- Normalize historical archived versions so archive state never implies public visibility.
update public.assessment_types
set is_active=false,
    updated_at=now()
where status='archived'
  and is_active is distinct from false;
