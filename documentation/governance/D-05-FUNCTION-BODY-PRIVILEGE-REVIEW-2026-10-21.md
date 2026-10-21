# D-05 / WP-11 — Function body, effective EXECUTE, and historical-ref review — 2026-10-21

**Repository base inspected:** `main` at `be834661dd12a75032b1e0e6542284e3ff1090be`  
**Production project:** `oaqpzaarppccbnepffxx`  
**Mode:** Read-only live PostgreSQL catalog queries and read-only GitHub ref/tree inspection. No SQL writes, DDL, grant/policy changes, migration application, deployment, deletion, recreation, or merge was performed. This evidence is being recorded on branch `wp-11/d05-function-body-review-20261021`; it is not on `main`.

## 1. Historical source search — result

The following reachable historical branch trees were inspected for schema/baseline/dump/DDL artifacts and their tracked migration paths:

| Branch | Tip | Tracked migration files | Result relevant to original schema |
|---|---|---:|---|
| `migration-identity-reconciliation-2026-10-10` | `60b73a8cfb1491cf0c105a3a6b4dcd33bbeea764` | 51 | No authoritative schema/baseline artifact located |
| `chore/reconcile-p5-migration-history-2026-10-04` | `598c0635a92ffd99c198f216afa3629b0d0180ee` | 39 | No authoritative schema/baseline artifact located |
| `d14-production-migration-impact-inventory-2026-10-12` | `22ab9e68bef3e9c0cfe3bb66c16b6964c9745975` | 51 | No authoritative schema/baseline artifact located |
| `ownership-migration-remediation-2026-10-09` | `cbeb36626b8bad4a372cd5e406ad8490ab56e849` | 51 | No authoritative schema/baseline artifact located |
| `p3/next-09-migration-provenance` | `0583fb6f4080b72450b7d35c3983e36bd330359d` | 16 | No authoritative schema/baseline artifact located |

The Git tag-ref query returned no tags. These checks extend the prior current-tree scan but do not cover unreachable Git objects, deleted remote refs no longer listed, developer-local checkouts, external backups, or Supabase editor/deployment history.

The five earliest migration identities in the examined historical trees remain 182-byte non-replayable provenance markers. This is consistent with ADR-003's contemporaneous record that the live schema existed before the repository began tracking migrations. The examined October filename/timestamp cleanup patches do not establish that they removed initial DDL for the 18 legacy tables.

**Disposition:** the best-supported explanation remains that the legacy schema predated the tracked migration path and that the accepted reviewed-baseline obligation was not completed in the inspected repository artifacts. Attribution to a particular cleanup remains unproven.

## 2. Live SECURITY DEFINER / EXECUTE inventory

Read-only catalog queries on 2026-10-21 returned:

| Measure | Result |
|---|---:|
| Public functions/procedures | 87 |
| SECURITY DEFINER functions | 65 |
| SECURITY DEFINER with `search_path = ''` | 14 |
| SECURITY DEFINER with `search_path = public, pg_temp` | 51 |
| SECURITY DEFINER with unset/other function-level search_path | 0 |
| SECURITY DEFINER executable by `anon` | 0 |
| SECURITY DEFINER executable by `authenticated` | 51 |
| SECURITY DEFINER executable by `service_role` | 65 |
| All public functions executable by `authenticated` | 53 |
| All public functions executable by `anon` | 2 |
| All public functions executable by `service_role` | 86 |
| Functions with a direct PUBLIC EXECUTE ACL | 2 |

The only two functions with a direct PUBLIC EXECUTE ACL are trigger-returning functions:
- `p2_assert_draft_version()`
- `p2_assessment_type_immutability()`

Catalog inspection confirmed these are attached as row triggers only: six triggers invoke `p2_assert_draft_version()` on `assessment_assets`, `axes`, `insights_mapping`, `options`, `questions`, and `traps`; one trigger invokes `p2_assessment_type_immutability()` on `assessment_types`. PostgreSQL trigger-returning functions are not ordinary callable RPC functions. Their broad EXECUTE ACL is still a privilege-hygiene disposition item; no grant was changed.

A live definition scan found no executable dynamic-SQL statement matching `EXECUTE format(...)`, `EXECUTE IMMEDIATE`, or a line-leading PL/pgSQL `EXECUTE` statement in the 87 stored function/procedure definitions. This is a targeted textual scan, not a SQL-parser proof; dynamic SQL in migration bodies remains a separate source review category.

## 3. Authorization body review — bounded findings

- A guard-marker scan of the 51 `SECURITY DEFINER` functions executable by `authenticated` found one wrapper without its own direct authorization check: `save_assessment_secure(uuid,text,text,text,text,text,boolean,boolean)`.
- Its live body dispatches creation to `create_assessment_secure`, published edits to `update_published_assessment_content_secure`, and draft edits to `update_assessment_working_copy_secure`. The three callee definitions each call `require_admin_capability('assessment.edit')` before mutation. This supports a guarded mutation path, but the wrapper reads the target version's status before delegation; it may expose a limited existence/status oracle to any authenticated caller. The precise confidentiality impact is **OPEN**; no runtime probe or repair was performed.
- `is_owner(uuid)` and `is_active_admin(uuid)` are `SECURITY DEFINER`, have EXECUTE for `authenticated`, and accept an arbitrary UUID argument to return whether that account is an active owner/admin. Neither has EXECUTE for `anon` or PUBLIC. This is the previously recorded D-15 permission concern; this review does not close it or authorize a grant change.
- The other authenticated-executable admin mutation/read wrappers reviewed by guard-marker scan contain an admin/owner/capability guard or delegate to a guarded operation. A regex/marker scan is a triage aid, not a substitute for complete per-function semantic review.
- The release-verifier function `verify_assessment_config_release_secure(...)` and CI-only release routines are EXECUTE-restricted to `service_role` in the live ACL; their service-only context check and release state logic remain subject to the separate release-contract evidence.
- Schema privileges remain: `anon`, `authenticated`, and `service_role` have PUBLIC-schema USAGE but not CREATE; `postgres` has CREATE. This reduces the ability of application roles to shadow unqualified objects in `public`, but does not replace per-function body review.

## 4. Important source/live distinction: `assessment_session_access`

The live table has nine columns, including `assessment_type_id`, plus its FK and `assessment_session_access_type_idx`. The tracked migration `20261001120000_protected_assessment_access_foundation.sql` contains `CREATE TABLE IF NOT EXISTS public.assessment_session_access` with eight listed columns and does not list `assessment_type_id` or `assessment_session_access_type_idx`. The migration does not contain an `ALTER TABLE ... ADD COLUMN assessment_type_id` for this table.

This is not sufficient evidence that a cleanup deleted the column's source. The migration is explicitly additive/corrective, uses `IF NOT EXISTS`, and the accepted P2 design document dated 2026-10-01 already says `assessment_session_access.assessment_type_id` “remains” the concrete-version reference. Given ADR-003's evidence that live schema objects predated tracked migrations, a plausible explanation is that the table already existed in Production and the `CREATE TABLE IF NOT EXISTS` did not define its live shape. This is a supported hypothesis, not a proven origin. The column/index's exact origin remains **OPEN**.

## 5. Status and remaining work

- D-05 remains **OPEN / BLOCKING RECONCILIATION**.
- WP-11 remains **IN PROGRESS / NOT CLOSED**.
- WP-12 remains **NOT STARTED**.
- The 18-table gap remains a proven absence within the 56 current tracked migration files, while historical source provenance remains open.
- Continue full per-function semantic review and exact caller/dependency expansion, reconcile each live table object against source, and retain the migration ledger mismatch (56 tracked files vs 57 live records; two live-only identities and one main-only source) as open.
- Do not synthesize a Production-derived baseline, rewrite applied migration history, apply migrations, change schema/grants/policies, delete/recreate objects, merge PR #120, or start WP-12.
