# D-05 — Tracked migration DDL statement index

**Pinned migration tree:** `312c60907649aa62de605937a0a82cf5d3fe3b75` (migration paths/blob SHAs later rechecked unchanged on current main). **Scope:** all 56 tracked `supabase/migrations/*.sql` files. This index records line-numbered table-owned DDL statements found in the retrieved source, including table creation/alteration, FK references, indexes, RLS, policies, triggers and direct table grants/revokes. Function-body references are cross-referenced in the main 25-table worksheet; a DDL line hit does not prove the live object is semantically correct. No database or migration changes were made.

## Files 1–5 of 56

### `supabase/migrations/20260930233955_add_server_scoring_rpc.sql`

- Blob SHA: `e2e332e9ea3ad385ae4437eede5305d8df84f673`; tree bytes: 182; retrieved UTF-8 bytes: 182.
- Historical marker only; no persistent table DDL. Content states the corresponding Production change is already present and must not be replayed.

### `supabase/migrations/20260930234340_unify_public_and_protected_assessment_access.sql`

- Blob SHA: `e2e332e9ea3ad385ae4437eede5305d8df84f673`; tree bytes: 182; retrieved UTF-8 bytes: 182.
- Historical marker only; no persistent table DDL. Content states the corresponding Production change is already present and must not be replayed.

### `supabase/migrations/20260930234428_preserve_access_for_idempotent_completion.sql`

- Blob SHA: `e2e332e9ea3ad385ae4437eede5305d8df84f673`; tree bytes: 182; retrieved UTF-8 bytes: 182.
- Historical marker only; no persistent table DDL. Content states the corresponding Production change is already present and must not be replayed.

### `supabase/migrations/20260930234953_pin_assessment_version_on_session.sql`

- Blob SHA: `e2e332e9ea3ad385ae4437eede5305d8df84f673`; tree bytes: 182; retrieved UTF-8 bytes: 182.
- Historical marker only; no persistent table DDL. Content states the corresponding Production change is already present and must not be replayed.

### `supabase/migrations/20260930235404_admin_identity_foundation.sql`

- Blob SHA: `e2e332e9ea3ad385ae4437eede5305d8df84f673`; tree bytes: 182; retrieved UTF-8 bytes: 182.
- Historical marker only; no persistent table DDL. Content states the corresponding Production change is already present and must not be replayed.


## Files 6–10 of 56

### `supabase/migrations/20261001061605_admin_dashboard_auth_hardening.sql`

- Blob SHA: `1b703cd7cf71437cebbacfac35ffb8d0c239c6b2`; tree bytes: 2207; retrieved UTF-8 bytes: 2207.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261001080710_p1_pg_net_client_execute_revoke.sql`

- Blob SHA: `78ec66b61baed7998fb9bef4ba64f76f59a10739`; tree bytes: 605; retrieved UTF-8 bytes: 605.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261001080714_p1_revoke_client_trigger_helper.sql`

- Blob SHA: `105059bf6e02a465691a41c6a69fadd3fd1cb971`; tree bytes: 164; retrieved UTF-8 bytes: 164.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261001080806_p1_relocate_pg_net_to_extensions.sql`

- Blob SHA: `0255f8b80332a1cd06887f4e1f94974b27687574`; tree bytes: 224; retrieved UTF-8 bytes: 224.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261001083056_p1_e_fix_answers_upsert_conflict.sql`

- Blob SHA: `837394d11f94420e14433936fbcabe7e1979636e`; tree bytes: 270; retrieved UTF-8 bytes: 270.
- L4 [answers]: `alter table public.answers`


## Files 11–15 of 56

### `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`

- Blob SHA: `12d04ecf5f414df2a76381635b78cbdcf1dbcb80`; tree bytes: 15467; retrieved UTF-8 bytes: 15467.
- L7 [assessment_families]: `create table if not exists public.assessment_families (`
- L16 [assessment_types]: `alter table public.assessment_types`
- L42 [assessment_types]: `alter table public.assessment_types`
- L45 [assessment_types]: `alter table public.assessment_types`
- L48 [assessment_types]: `alter table public.assessment_types`
- L50 [assessment_families]: `foreign key (family_id) references public.assessment_families(id);`
- L59 [assessment_families]: `alter table public.assessment_families`
- L62 [assessment_families]: `alter table public.assessment_families`
- L65 [assessment_types]: `references public.assessment_types(id)`
- L121 [axes]: `drop trigger if exists p2_axes_immutable on public.axes;`
- L126 [questions]: `drop trigger if exists p2_questions_immutable on public.questions;`
- L131 [options]: `drop trigger if exists p2_options_immutable on public.options;`
- L136 [traps]: `drop trigger if exists p2_traps_immutable on public.traps;`
- L141 [insights_mapping]: `drop trigger if exists p2_insights_mapping_immutable on public.insights_mapping;`
- L146 [assessment_assets]: `drop trigger if exists p2_assessment_assets_immutable on public.assessment_assets;`
- L207 [assessment_types]: `drop trigger if exists p2_assessment_type_immutability on public.assessment_types;`
- L438 [assessment_families]: `alter table public.assessment_families enable row level security;`
- L439 [assessment_families]: `revoke all on table public.assessment_families from anon, authenticated;`

### `supabase/migrations/20261001100833_p2_admin_status_guard.sql`

- Blob SHA: `58c25faeea482279e9cd1ddd85ee8be51e8c77f9`; tree bytes: 1532; retrieved UTF-8 bytes: 1532.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261001101014_p2_immutability_trigger_fix.sql`

- Blob SHA: `1c3931d7b98c7487f5438cfdfa0813190f37ab3c`; tree bytes: 1399; retrieved UTF-8 bytes: 1399.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261001104008_20261001104100_p2_score_weight_precision.sql`

- Blob SHA: `1b65af7f16390822fd5e74e1817ee20a129abf8d`; tree bytes: 451; retrieved UTF-8 bytes: 451.
- L4 [scores]: `alter table public.scores`
- L8 [scores]: `alter table public.scores`

### `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql`

- Blob SHA: `67c061783bf2eb158226930f693afd8fc3bd5429`; tree bytes: 10688; retrieved UTF-8 bytes: 10688.
- L10 [sessions]: `alter table public.sessions`
- L12 [assessment_users]: `references public.assessment_users(id) on delete set null,`
- L21 [assessment_session_access]: `create table if not exists public.assessment_session_access (`
- L23 [sessions]: `session_id uuid references public.sessions(id) on delete cascade,`
- L24 [assessment_users]: `assessment_user_id uuid not null references public.assessment_users(id) on delete cascade,`
- L39 [assessment_session_access]: `alter table public.assessment_session_access enable row level security;`
- L41 [assessment_session_access]: `revoke all on table public.assessment_session_access from public, anon, authenticated;`
- L42 [assessment_session_access]: `grant all on table public.assessment_session_access to service_role;`
- L44 [answers]: `alter table public.answers`
- L49 [answers]: `alter table public.answers drop constraint if exists answers_answer_value_check;`
- L51 [answers]: `alter table public.answers`


## Files 16–20 of 56

### `supabase/migrations/20261001190000_p0_security_closure.sql`

- Blob SHA: `a11255bd74b52e98944900a8b4f829976907b4e3`; tree bytes: 2169; retrieved UTF-8 bytes: 2169.
- L29 [admin_users]: `drop policy if exists p0_admin_select_admin_users on public.admin_users;`
- L50 [assessment_session_access]: `revoke all on table public.assessment_session_access from anon, authenticated;`

### `supabase/migrations/20261002161455_p3_production_implementation.sql`

- Blob SHA: `245c37acdd2611e839a56fa370043c9cffb3f1c0`; tree bytes: 18305; retrieved UTF-8 bytes: 18305.
- L5 [sessions]: `alter table public.sessions`
- L10 [assessment_results]: `create table if not exists public.assessment_results (`
- L12 [sessions]: `session_id uuid not null unique references public.sessions(id) on delete cascade,`
- L13 [assessment_types]: `assessment_type_id uuid not null references public.assessment_types(id),`
- L29 [assessment_results]: `alter table public.assessment_results enable row level security;`
- L30 [assessment_results]: `revoke all on table public.assessment_results from public, anon, authenticated;`
- L31 [assessment_results]: `grant all on table public.assessment_results to service_role;`

### `supabase/migrations/20261002161945_p3_preserve_completion_access_v2.sql`

- Blob SHA: `268d292a8c3e1f52aad51f111a076197d68649e1`; tree bytes: 16157; retrieved UTF-8 bytes: 16157.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261003082558_20261003090000_p4_submission_foundation.sql`

- Blob SHA: `53f0259deca7502523c563f5487a43dd2e44a2f4`; tree bytes: 13963; retrieved UTF-8 bytes: 13963.
- L4 [sessions]: `alter table public.sessions`
- L20 [sessions]: `alter table public.sessions`
- L23 [sessions]: `alter table public.sessions`

### `supabase/migrations/20261003082603_20261003093000_p4_submission_prepare_finalize.sql`

- Blob SHA: `516678ba20014f8f8713c5f7583a7a9325baec6a`; tree bytes: 21832; retrieved UTF-8 bytes: 21832.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.
