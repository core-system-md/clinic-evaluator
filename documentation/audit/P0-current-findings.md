# P0 — Current Baseline Findings

**Status:** audit in progress

## Confirmed current state

- Supabase Auth currently has 5 users; none has a role claim in `raw_app_meta_data`.
- `assessment_users` currently contains 0 rows, so the protected-assessment capability exists in schema/code but has no current issued users.
- Public schema currently contains 18 tables with RLS policies present across them; policy counts range from 1 to 7 depending on table.
- The project currently has no versioned Supabase migrations represented in the repository, so the live database remains the current operational schema until a reviewed baseline is created.

## Architectural decisions already accepted

- ADR-001: Hybrid trust boundary; one Owner + real Admin accounts; public assessments remain simple; protected assessments remain; no multi-tenancy.
- ADR-002: Hybrid scoring; browser result is UX-only, server recalculates and owns the official result.
- ADR-003: Git becomes the source of truth for database schema; baseline first, then versioned migrations.
- ADR-004: Supabase Auth provides identity; `admin_users` provides authoritative admin authorization; Owner/Admin roles initially, permissions can expand later.

## Next audit target

Complete a table-by-table authorization matrix before creating the database baseline. For each table/function, classify:

1. public read required,
2. public write required,
3. authenticated admin read/write,
4. server-only access,
5. legacy/unused,
6. data that must never be exposed to anonymous clients.

No production schema change is implied by this document.
