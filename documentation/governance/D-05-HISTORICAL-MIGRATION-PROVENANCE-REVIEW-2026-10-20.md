# D-05 — Historical migration/schema provenance review — 2026-10-20

**Repository:** `core-system-md/clinic-evaluator`  
**Production project:** `oaqpzaarppccbnepffxx`  
**Mode:** Read-only Git commit/file-history inspection. No database query or mutation was performed during this historical-source review; no migration, grant, policy, deployment, deletion, or recreation was performed.

## 1. Question

Determine whether the missing initial `CREATE TABLE` declarations for the 18 legacy tables are attributable to later migration-file cleanup, or whether the repository record indicates that the legacy schema predated tracked migrations.

## 2. Confirmed chronological evidence

### 2.1 The repository recorded an untracked live schema before the migration path existed

- Commit [`39c7dfc`](https://github.com/core-system-md/clinic-evaluator/commit/39c7dfc8443c150ec833881e1f910d42dbb14aa9), created at **2026-09-30 22:21:34 UTC**, added ADR-003. Its original text explicitly states that the repository did not contain `supabase/migrations` or schema/migration files and that the live Supabase project returned **zero migration-history entries**, even though live tables, RLS policies, PostgreSQL functions, Edge Functions and operational data already existed.
- Commit [`7b0a877`](https://github.com/core-system-md/clinic-evaluator/commit/7b0a877cbcd74073c6fab5a0246017d01e8ed056), created at **2026-09-30 22:23:05 UTC**, accepted ADR-003. The accepted decision requires the current schema baseline to be reviewed and cleaned before it is committed, rather than exported blindly from Production. The document is a decision, not the promised schema-baseline artifact.

This is direct evidence that the live schema was already present before tracked migration files and remote migration history were established, at least as recorded on 2026-09-30.

### 2.2 Early tracked history entries are provenance markers, not original SQL bodies

The first five tracked migration files have the same **182-byte** content and blob identity. Their content says that the corresponding Production change is already present, that the file preserves migration provenance, and that it must not be replayed.

Examples of the Git additions are:
- [`f7f1d51`](https://github.com/core-system-md/clinic-evaluator/commit/f7f1d51b16077351def6752fc1ac6646dd2e06aa) — added the marker for `20260930233955_add_server_scoring_rpc.sql`.
- [`3f65668`](https://github.com/core-system-md/clinic-evaluator/commit/3f65668c4ed1b532503e12c67c2955b6d4159172), [`6984f99`](https://github.com/core-system-md/clinic-evaluator/commit/6984f99a133b0efaf28ef0c2ff7aecf6070dec83), [`c552ea6`](https://github.com/core-system-md/clinic-evaluator/commit/c552ea6f0870b757d971341a8e97deba2a4b02d1), and [`d5a39d6`](https://github.com/core-system-md/clinic-evaluator/commit/d5a39d633e2df1796e5404b6b44ffecf5e6b5c9a) added equivalent markers for the other four early version identities.

These markers preserve version/name provenance; they do **not** preserve the SQL bodies that originally created or changed the pre-existing legacy objects. Their presence supports the distinction between tracking a migration identity and having its original DDL available.

### 2.3 Historical filename cleanup examined so far does not explain the 18-table gap

The targeted deletion/renaming commits reviewed include:
- [`656459d`](https://github.com/core-system-md/clinic-evaluator/commit/656459dfe1392e4ea1a7d2524894f0497c1d5585) removed the superseded `20261001083200_p1_e_fix_answers_upsert_conflict.sql`; the canonical `20261001083056_p1_e_fix_answers_upsert_conflict.sql` remains.
- [`0e49b43`](https://github.com/core-system-md/clinic-evaluator/commit/0e49b438494e5f4f345550bf4e677caf41c8e4cd), [`fc039e9`](https://github.com/core-system-md/clinic-evaluator/commit/fc039e9df21131ff91316fdfd76f80d98e2b3a61), [`e6910e2`](https://github.com/core-system-md/clinic-evaluator/commit/e6910e2308ae1a007ac0334fd8e1e8c95ac4cca3), and [`c2a0e5a`](https://github.com/core-system-md/clinic-evaluator/commit/c2a0e5ac1179a611d196ff17aa094ce306d9f350) removed future-dated or duplicate P2 migration candidates. The duplicate family/version migration bodies included `CREATE TABLE public.assessment_families`, but the canonical `20261001100633_p2_assessment_family_versions.sql` remains on main and contains that same table's initial declaration. This concerns one of the seven located table definitions, not any of the 18 legacy tables.
- [`e2a2e5d`](https://github.com/core-system-md/clinic-evaluator/commit/e2a2e5dae31b805668e2d2f16fc865dc59fbac0a) removed a duplicate admin-auth migration timestamp.
- [`28b70f3`](https://github.com/core-system-md/clinic-evaluator/commit/28b70f3d90167f4ebded47aa3316f4b436c7ccb9), created at **2026-10-10 07:24:46 UTC**, aligned migration filenames with already-applied Production history, restored the secure-report migration body, preserved a separate `started_at` correction, and archived a superseded unapplied draft-lifecycle candidate.

The specific cleanup commits inspected concern duplicate timestamps, future-dated placeholders, already-applied migration identities, or an unapplied candidate. No reviewed patch establishes that an initial table-creation definition for any of the 18 legacy tables was removed by those operations. This is a bounded finding from the commits and files inspected, not a claim that every historical repository, external backup, or local working copy has been exhaustively searched.

### 2.4 Subsequent documents confirm that the schema-baseline work remained a separate obligation

`documentation/audit/P2-migration-provenance-reconciliation-2026-10-01.md` records live/local migration-history discrepancies and explicitly prohibits inventing a baseline without comparing schema and history. It does not contain full original DDL for the 25 live tables. The current 56-file scan likewise finds initial persistent table DDL for seven tables and no such initial declaration for the 18 listed in the P0 privilege migration.

## 3. Evidence-based conclusion

**Best-supported current explanation:** the 18 legacy tables were already part of the live schema before the repository began tracking migrations, and the planned reviewed baseline was not located among current tracked artifacts. The available evidence does **not** establish that the known October 1 or October 10 filename-cleanup commits caused this 18-table gap.

**Still unproven:** whether initial table DDL exists in an older Git object/branch not yet examined, a developer-local checkout, a pre-migration SQL export, an external backup, or Supabase SQL/editor history. The review also cannot rule out file removal before the 2026-09-30 ADR snapshot. Do not attribute the gap to a specific cleanup operation without evidence.

## 4. Required disposition

- Keep D-05 **OPEN / BLOCKING RECONCILIATION** and WP-11 **IN PROGRESS / NOT CLOSED**.
- Treat the 18 names as known legacy assessment/application tables; the open issue is DDL provenance and complete schema evolution, not whether the tables are known.
- Continue searching only for authoritative historical sources (older reachable refs/tags, repository objects, approved SQL exports/backups, or recorded deployment/editor history). Any source must be identity- and completeness-checked before it is accepted.
- Do not recreate tables, synthesize a Production-derived baseline, rewrite migration history, apply migrations, change schema/grants/policies, merge PR #120, or begin WP-12 based on this finding.
