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


## Files 21–25 of 56

### `supabase/migrations/20261003084304_20261003103000_p4_submission_context_lock.sql`

- Blob SHA: `26c4b3ec475aaa676fbdacf0b94ec7f7cc8db1f4`; tree bytes: 4892; retrieved UTF-8 bytes: 4892.
- L2 [sessions]: `alter table public.sessions`

### `supabase/migrations/20261003170912_p5_admin_architecture.sql`

- Blob SHA: `123793c3c580327df1da1c3c917287d84d8517d5`; tree bytes: 33364; retrieved UTF-8 bytes: 33364.
- L4 [admin_capabilities]: `create table if not exists public.admin_capabilities (`
- L12 [admin_audit_log]: `create table if not exists public.admin_audit_log (`
- L18 [assessment_families]: `family_id uuid references public.assessment_families(id),`
- L27 [admin_capabilities]: `alter table public.admin_capabilities enable row level security;`
- L28 [admin_audit_log]: `alter table public.admin_audit_log enable row level security;`
- L30 [admin_capabilities]: `grant select on public.admin_capabilities to authenticated;`
- L31 [admin_audit_log]: `grant select on public.admin_audit_log to authenticated;`
- L124 [admin_capabilities]: `drop policy if exists "admin capabilities self read" on public.admin_capabilities;`
- L132 [admin_audit_log]: `drop policy if exists "owner audit read" on public.admin_audit_log;`
- L138 [assessment_families]: `drop policy if exists "active admin family read" on public.assessment_families;`
- L144 [assessment_families]: `grant select on public.assessment_families to authenticated;`
- L736 [admin_capabilities]: `revoke all on public.admin_capabilities from anon;`
- L737 [admin_audit_log]: `revoke all on public.admin_audit_log from anon;`
- L738 [admin_capabilities]: `revoke insert,update,delete on public.admin_capabilities from authenticated;`
- L739 [admin_audit_log]: `revoke insert,update,delete on public.admin_audit_log from authenticated;`

### `supabase/migrations/20261003170948_p5_admin_capability_management.sql`

- Blob SHA: `f68f9098e8dd23743a32ebdaac2c748b075b5c84`; tree bytes: 2953; retrieved UTF-8 bytes: 2953.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261003171050_p5_admin_canonical_import_and_audit.sql`

- Blob SHA: `f978ff537ac381a7a065921aafa2fb833e146643`; tree bytes: 12300; retrieved UTF-8 bytes: 12300.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261003171123_p5_admin_security_hardening.sql`

- Blob SHA: `03673cf1fbe6a03e32ff92dd43c59696d084df1f`; tree bytes: 1806; retrieved UTF-8 bytes: 1806.
- L1 [admin_audit_log]: `create index if not exists admin_audit_log_actor_idx on public.admin_audit_log(actor_user_id);`
- L2 [admin_audit_log]: `create index if not exists admin_audit_log_family_idx on public.admin_audit_log(family_id);`
- L3 [admin_capabilities]: `create index if not exists admin_capabilities_granted_by_idx on public.admin_capabilities(granted_by);`


## Files 26–30 of 56

### `supabase/migrations/20261003174838_p5_admin_assistant_management.sql`

- Blob SHA: `9e3aaadf7ccf5e23b321422cd027e07444523f04`; tree bytes: 6590; retrieved UTF-8 bytes: 6590.
- L2 [admin_users]: `alter table public.admin_users`

### `supabase/migrations/20261003175220_p5_working_copy_deep_copy_and_legacy_write_lock.sql`

- Blob SHA: `ffdcb82c8f598852f8936a83ab6177bbee8a7948`; tree bytes: 5205; retrieved UTF-8 bytes: 5205.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261003175353_p5_admin_result_read_rpc.sql`

- Blob SHA: `c2313a5b1fc0beec6aefd5751ecceb48d04b5401`; tree bytes: 943; retrieved UTF-8 bytes: 943.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261003175429_p5_assistant_capability_dedup.sql`

- Blob SHA: `6b0919e1de17c2a4ca9f58b0431af6db296189c2`; tree bytes: 2007; retrieved UTF-8 bytes: 2007.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261003175601_p5_working_copy_stable_family_slug.sql`

- Blob SHA: `a126aa97ad7115d9fa16520c1a45c5ba125283f1`; tree bytes: 5232; retrieved UTF-8 bytes: 5232.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.


## Files 31–35 of 56

### `supabase/migrations/20261003175645_p5_p2_immutability_lifecycle_compat.sql`

- Blob SHA: `bfe6ffb1b0893c7e7d86c6889515b2fac02df1c5`; tree bytes: 5252; retrieved UTF-8 bytes: 5252.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261003175724_p5_p2_archival_metadata_exception.sql`

- Blob SHA: `d39241ab0c9087ba6d3738cec7a9c6a26c0b7406`; tree bytes: 1923; retrieved UTF-8 bytes: 1923.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261003175807_p5_restore_archived_version_immutability_compat.sql`

- Blob SHA: `4eac766875dd4c47b4bbd769936b9e4dc57f6b94`; tree bytes: 3208; retrieved UTF-8 bytes: 3208.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261003181243_p5_secure_report_session_read.sql`

- Blob SHA: `1858547bf67f36b1bf28550481d8fd4c88099e57`; tree bytes: 869; retrieved UTF-8 bytes: 869.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261003181305_p5_secure_report_session_read_fix_started_at.sql`

- Blob SHA: `ffb56b51a99fa1286f796528009ceb4edde21865`; tree bytes: 869; retrieved UTF-8 bytes: 869.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.


## Files 36–40 of 56

### `supabase/migrations/20261003183952_p5_owner_audit_read_secure.sql`

- Blob SHA: `d55ba07f0ebcc0097732d354a7a572085f472f05`; tree bytes: 2295; retrieved UTF-8 bytes: 2295.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261003195802_p5_revoke_anonymous_assistant_rpcs.sql`

- Blob SHA: `7f4b1312bcfc96934da5fba838789a0bb4ada652`; tree bytes: 605; retrieved UTF-8 bytes: 605.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261003200444_p5_fix_assistant_create_capability_alias.sql`

- Blob SHA: `1f39f213dd095c70dd7b089d48abf62a0e6fd579`; tree bytes: 2333; retrieved UTF-8 bytes: 2333.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261003224353_p5_published_content_edit_lifecycle.sql`

- Blob SHA: `18ef36c84c936e90707af27af46f7aadd993d0c8`; tree bytes: 26390; retrieved UTF-8 bytes: 26390.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261004071919_p5_secure_admin_session_counts.sql`

- Blob SHA: `2a92d6728c69de2e25301af6d155aca6d8e6c7ff`; tree bytes: 753; retrieved UTF-8 bytes: 753.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.
