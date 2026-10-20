# D-05 — Full tracked-migration and production-ledger reconciliation

**Inspection reference:** `main` at `312c60907649aa62de605937a0a82cf5d3fe3b75` (Git tree SHA `312c60907649aa62de605937a0a82cf5d3fe3b75`).  
**Production project:** `oaqpzaarppccbnepffxx`.  
**Mode:** read-only Git tree/file retrieval and read-only Supabase migration-ledger query. No database writes, migration application, permission changes, deployment, deletion, or recreation were performed.

## 1. Inventory and reconciliation result

- Tracked `supabase/migrations/*.sql` files at the inspected `main` tree: **56**.
- Live Supabase migration ledger rows: **57**.
- Matched by 14-digit migration version: **55**.
- Applied ledger versions with no same-version file on `main`: **2**.
- Tracked source files with no applied ledger version: **1**.

### Applied ledger versions missing source on `main`

- `20261018075528` — `c03_service_role_api_key_compatibility` (applied in Production, no same-version migration file in inspected `main`).
- `20261018075855` — `c03_verifier_api_key_compatibility` (applied in Production, no same-version migration file in inspected `main`).

### Source-only files not represented in the live ledger

- `supabase/migrations/20261018110000_c03_verifier_api_key_compatibility.sql` (version `20261018110000`; no corresponding applied ledger row).

### Full tracked-file manifest

| Migration version | Tracked file | Blob SHA | Bytes | Ledger state |
|---|---|---|---:|---|
| `20260930233955` | `20260930233955_add_server_scoring_rpc.sql` | `e2e332e9ea3ad385ae4437eede5305d8df84f673` | 182 | Applied; ledger name `add_server_scoring_rpc` |
| `20260930234340` | `20260930234340_unify_public_and_protected_assessment_access.sql` | `e2e332e9ea3ad385ae4437eede5305d8df84f673` | 182 | Applied; ledger name `unify_public_and_protected_assessment_access` |
| `20260930234428` | `20260930234428_preserve_access_for_idempotent_completion.sql` | `e2e332e9ea3ad385ae4437eede5305d8df84f673` | 182 | Applied; ledger name `preserve_access_for_idempotent_completion` |
| `20260930234953` | `20260930234953_pin_assessment_version_on_session.sql` | `e2e332e9ea3ad385ae4437eede5305d8df84f673` | 182 | Applied; ledger name `pin_assessment_version_on_session` |
| `20260930235404` | `20260930235404_admin_identity_foundation.sql` | `e2e332e9ea3ad385ae4437eede5305d8df84f673` | 182 | Applied; ledger name `admin_identity_foundation` |
| `20261001061605` | `20261001061605_admin_dashboard_auth_hardening.sql` | `1b703cd7cf71437cebbacfac35ffb8d0c239c6b2` | 2207 | Applied; ledger name `admin_dashboard_auth_hardening` |
| `20261001080710` | `20261001080710_p1_pg_net_client_execute_revoke.sql` | `78ec66b61baed7998fb9bef4ba64f76f59a10739` | 605 | Applied; ledger name `p1_pg_net_client_execute_revoke` |
| `20261001080714` | `20261001080714_p1_revoke_client_trigger_helper.sql` | `105059bf6e02a465691a41c6a69fadd3fd1cb971` | 164 | Applied; ledger name `p1_revoke_client_trigger_helper` |
| `20261001080806` | `20261001080806_p1_relocate_pg_net_to_extensions.sql` | `0255f8b80332a1cd06887f4e1f94974b27687574` | 224 | Applied; ledger name `p1_relocate_pg_net_to_extensions` |
| `20261001083056` | `20261001083056_p1_e_fix_answers_upsert_conflict.sql` | `837394d11f94420e14433936fbcabe7e1979636e` | 270 | Applied; ledger name `p1_e_fix_answers_upsert_conflict` |
| `20261001100633` | `20261001100633_p2_assessment_family_versions.sql` | `12d04ecf5f414df2a76381635b78cbdcf1dbcb80` | 15467 | Applied; ledger name `p2_assessment_family_versions` |
| `20261001100833` | `20261001100833_p2_admin_status_guard.sql` | `58c25faeea482279e9cd1ddd85ee8be51e8c77f9` | 1532 | Applied; ledger name `p2_admin_status_guard` |
| `20261001101014` | `20261001101014_p2_immutability_trigger_fix.sql` | `1c3931d7b98c7487f5438cfdfa0813190f37ab3c` | 1399 | Applied; ledger name `p2_immutability_trigger_fix` |
| `20261001104008` | `20261001104008_20261001104100_p2_score_weight_precision.sql` | `1b65af7f16390822fd5e74e1817ee20a129abf8d` | 451 | Applied; ledger name `20261001104100_p2_score_weight_precision` |
| `20261001120000` | `20261001120000_protected_assessment_access_foundation.sql` | `67c061783bf2eb158226930f693afd8fc3bd5429` | 10688 | Applied; ledger name `protected_assessment_access_foundation` |
| `20261001190000` | `20261001190000_p0_security_closure.sql` | `a11255bd74b52e98944900a8b4f829976907b4e3` | 2169 | Applied; ledger name `p0_security_closure` |
| `20261002161455` | `20261002161455_p3_production_implementation.sql` | `245c37acdd2611e839a56fa370043c9cffb3f1c0` | 18305 | Applied; ledger name `p3_production_implementation` |
| `20261002161945` | `20261002161945_p3_preserve_completion_access_v2.sql` | `268d292a8c3e1f52aad51f111a076197d68649e1` | 16157 | Applied; ledger name `p3_preserve_completion_access_v2` |
| `20261003082558` | `20261003082558_20261003090000_p4_submission_foundation.sql` | `53f0259deca7502523c563f5487a43dd2e44a2f4` | 13963 | Applied; ledger name `20261003090000_p4_submission_foundation` |
| `20261003082603` | `20261003082603_20261003093000_p4_submission_prepare_finalize.sql` | `516678ba20014f8f8713c5f7583a7a9325baec6a` | 21832 | Applied; ledger name `20261003093000_p4_submission_prepare_finalize` |
| `20261003084304` | `20261003084304_20261003103000_p4_submission_context_lock.sql` | `26c4b3ec475aaa676fbdacf0b94ec7f7cc8db1f4` | 4892 | Applied; ledger name `20261003103000_p4_submission_context_lock` |
| `20261003170912` | `20261003170912_p5_admin_architecture.sql` | `123793c3c580327df1da1c3c917287d84d8517d5` | 33364 | Applied; ledger name `p5_admin_architecture` |
| `20261003170948` | `20261003170948_p5_admin_capability_management.sql` | `f68f9098e8dd23743a32ebdaac2c748b075b5c84` | 2953 | Applied; ledger name `p5_admin_capability_management` |
| `20261003171050` | `20261003171050_p5_admin_canonical_import_and_audit.sql` | `f978ff537ac381a7a065921aafa2fb833e146643` | 12300 | Applied; ledger name `p5_admin_canonical_import_and_audit` |
| `20261003171123` | `20261003171123_p5_admin_security_hardening.sql` | `03673cf1fbe6a03e32ff92dd43c59696d084df1f` | 1806 | Applied; ledger name `p5_admin_security_hardening` |
| `20261003174838` | `20261003174838_p5_admin_assistant_management.sql` | `9e3aaadf7ccf5e23b321422cd027e07444523f04` | 6590 | Applied; ledger name `p5_admin_assistant_management` |
| `20261003175220` | `20261003175220_p5_working_copy_deep_copy_and_legacy_write_lock.sql` | `ffdcb82c8f598852f8936a83ab6177bbee8a7948` | 5205 | Applied; ledger name `p5_working_copy_deep_copy_and_legacy_write_lock` |
| `20261003175353` | `20261003175353_p5_admin_result_read_rpc.sql` | `c2313a5b1fc0beec6aefd5751ecceb48d04b5401` | 943 | Applied; ledger name `p5_admin_result_read_rpc` |
| `20261003175429` | `20261003175429_p5_assistant_capability_dedup.sql` | `6b0919e1de17c2a4ca9f58b0431af6db296189c2` | 2007 | Applied; ledger name `p5_assistant_capability_dedup` |
| `20261003175601` | `20261003175601_p5_working_copy_stable_family_slug.sql` | `a126aa97ad7115d9fa16520c1a45c5ba125283f1` | 5232 | Applied; ledger name `p5_working_copy_stable_family_slug` |
| `20261003175645` | `20261003175645_p5_p2_immutability_lifecycle_compat.sql` | `bfe6ffb1b0893c7e7d86c6889515b2fac02df1c5` | 5252 | Applied; ledger name `p5_p2_immutability_lifecycle_compat` |
| `20261003175724` | `20261003175724_p5_p2_archival_metadata_exception.sql` | `d39241ab0c9087ba6d3738cec7a9c6a26c0b7406` | 1923 | Applied; ledger name `p5_p2_archival_metadata_exception` |
| `20261003175807` | `20261003175807_p5_restore_archived_version_immutability_compat.sql` | `4eac766875dd4c47b4bbd769936b9e4dc57f6b94` | 3208 | Applied; ledger name `p5_restore_archived_version_immutability_compat` |
| `20261003181243` | `20261003181243_p5_secure_report_session_read.sql` | `1858547bf67f36b1bf28550481d8fd4c88099e57` | 869 | Applied; ledger name `p5_secure_report_session_read` |
| `20261003181305` | `20261003181305_p5_secure_report_session_read_fix_started_at.sql` | `ffb56b51a99fa1286f796528009ceb4edde21865` | 869 | Applied; ledger name `p5_secure_report_session_read_fix_started_at` |
| `20261003183952` | `20261003183952_p5_owner_audit_read_secure.sql` | `d55ba07f0ebcc0097732d354a7a572085f472f05` | 2295 | Applied; ledger name `p5_owner_audit_read_secure` |
| `20261003195802` | `20261003195802_p5_revoke_anonymous_assistant_rpcs.sql` | `7f4b1312bcfc96934da5fba838789a0bb4ada652` | 605 | Applied; ledger name `p5_revoke_anonymous_assistant_rpcs` |
| `20261003200444` | `20261003200444_p5_fix_assistant_create_capability_alias.sql` | `1f39f213dd095c70dd7b089d48abf62a0e6fd579` | 2333 | Applied; ledger name `p5_fix_assistant_create_capability_alias` |
| `20261003224353` | `20261003224353_p5_published_content_edit_lifecycle.sql` | `18ef36c84c936e90707af27af46f7aadd993d0c8` | 26390 | Applied; ledger name `p5_published_content_edit_lifecycle` |
| `20261004071919` | `20261004071919_p5_secure_admin_session_counts.sql` | `2a92d6728c69de2e25301af6d155aca6d8e6c7ff` | 753 | Applied; ledger name `p5_secure_admin_session_counts` |
| `20261004074332` | `20261004074332_p5_admin_editor_completeness_2026_10_04.sql` | `e6f6141f8be110bb737c479dfa93ca84ab40205b` | 12354 | Applied; ledger name `p5_admin_editor_completeness_2026_10_04` |
| `20261004074428` | `20261004074428_p5_draft_cascade_delete_trigger_fix_2026_10_04.sql` | `3b9f4b5589ea8adfae51de4a003838bccee527af` | 5524 | Applied; ledger name `p5_draft_cascade_delete_trigger_fix_2026_10_04` |
| `20261004102003` | `20261004102003_p5_delete_draft_cascade_fix_2026_10_04.sql` | `7a077fce398ee99008e433148fbe808047706f54` | 3406 | Applied; ledger name `p5_delete_draft_cascade_fix_2026_10_04` |
| `20261004102305` | `20261004102305_p5_ev_mapping_shape_fix.sql` | `9202b9211cd03a0984d6633bd5f82cb3ec9c31db` | 4053 | Applied; ledger name `p5_ev_mapping_shape_fix` |
| `20261004115546` | `20261004115546_p5_public_visibility_option_allocation.sql` | `2e01f82a7824b56e9495695a4347802dc1bc7070` | 7915 | Applied; ledger name `p5_public_visibility_option_allocation` |
| `20261004115737` | `20261004115737_p5_lifecycle_immutability_compat.sql` | `ac5cb1fcc0af2126da64e89df9efe7ae6fd4f588` | 2123 | Applied; ledger name `p5_lifecycle_immutability_compat` |
| `20261004145553` | `20261004145553_p5_lifecycle_trigger_final_fix.sql` | `7334be7fc1093bd3858829bc075dfbf119b55ee4` | 4260 | Applied; ledger name `p5_lifecycle_trigger_final_fix` |
| `20261005143243` | `20261005143243_p5_public_options_projection_recovery.sql` | `2b965619f38f28ea0751bcdc578c7eea3729a64b` | 1478 | Applied; ledger name `p5_public_options_projection_recovery` |
| `20261009164918` | `20261009164918_canonical_axis_weights.sql` | `6715d7cedf8293ebf1686a4f1335eddb4502f3ee` | 8472 | Applied; ledger name `canonical_axis_weights` |
| `20261009164951` | `20261009164951_structured_result_authority.sql` | `c5a48db426707f937100b65f620d996061cadb23` | 19261 | Applied; ledger name `structured_result_authority` |
| `20261009170228` | `20261009170228_reconstruct_final_assessment_versions.sql` | `a81997122f61e652240829ce2a5173d0daf205eb` | 130416 | Applied; ledger name `reconstruct_final_assessment_versions` |
| `20261013110000` | `20261013110000_c02_allow_answer_value_70.sql` | `106ff5ed6efa580ae9c0fb79a2c518876f54d76e` | 1132 | Applied; ledger name `c02_allow_answer_value_70` |
| `20261015100000` | `20261015100000_c03_hybrid_config_release_gate.sql` | `5b8c65678a14f18fa7c074537d094b34377745a0` | 30481 | Applied; ledger name `c03_hybrid_config_release_gate` |
| `20261015120000` | `20261015120000_c03_github_oidc_release_authorization.sql` | `77c54d98f3efe559b8a5796f6cc96eca3abb2f5a` | 15261 | Applied; ledger name `c03_github_oidc_release_authorization` |
| `20261018100000` | `20261018100000_c03_service_role_api_key_compatibility.sql` | `c20231aad7f239c8ff0b773eb4a16bd0dfd63972` | 2292 | Applied; ledger name `c03_service_role_api_key_compatibility` |
| `20261018110000` | `20261018110000_c03_verifier_api_key_compatibility.sql` | `538ec2ac2bedd1f9886dac45600969c0a1a3c3bb` | 6480 | **SOURCE ONLY / NOT APPLIED** |

The applied records `20261018075528` and `20261018075855` are absent from `main`. The tracked `20261018110000_c03_verifier_api_key_compatibility.sql` is source-only; Production instead records `20261018100000` as `c03_service_role_api_key_compatibility`, which is also the name of the tracked `20261018100000_c03_service_role_api_key_compatibility.sql`. This is a concrete source/ledger provenance discrepancy on `main`, not permission to rewrite the ledger or apply a guessed repair. PR #120 describes a candidate correction on its branch, but it remains unmerged and is not part of this `main`/Production comparison.

## 2. Initial table DDL found by tracked migration scan

| Live table | Located initial `CREATE TABLE` source | Disposition |
|---|---|---|
| `public.admin_audit_log` | `supabase/migrations/20261003170912_p5_admin_architecture.sql` | Initial DDL located; full object evolution/ledger parity remains OPEN |
| `public.admin_capabilities` | `supabase/migrations/20261003170912_p5_admin_architecture.sql` | Initial DDL located; full object evolution/ledger parity remains OPEN |
| `public.admin_users` | Not located in the retrieved tracked migration sources | Initial DDL provenance OPEN; absence is not proof of non-existence in an external archive |
| `public.answers` | Not located in the retrieved tracked migration sources | Initial DDL provenance OPEN; absence is not proof of non-existence in an external archive |
| `public.assessment_assets` | Not located in the retrieved tracked migration sources | Initial DDL provenance OPEN; absence is not proof of non-existence in an external archive |
| `public.assessment_config_release_settings` | `supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql` | Initial DDL located; full object evolution/ledger parity remains OPEN |
| `public.assessment_config_releases` | `supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql` | Initial DDL located; full object evolution/ledger parity remains OPEN |
| `public.assessment_families` | `supabase/migrations/20261001100633_p2_assessment_family_versions.sql` | Initial DDL located; full object evolution/ledger parity remains OPEN |
| `public.assessment_results` | `supabase/migrations/20261002161455_p3_production_implementation.sql` | Initial DDL located; full object evolution/ledger parity remains OPEN |
| `public.assessment_session_access` | `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql` | Initial DDL located; full object evolution/ledger parity remains OPEN |
| `public.assessment_settings` | Not located in the retrieved tracked migration sources | Initial DDL provenance OPEN; absence is not proof of non-existence in an external archive |
| `public.assessment_types` | Not located in the retrieved tracked migration sources | Initial DDL provenance OPEN; absence is not proof of non-existence in an external archive |
| `public.assessment_users` | Not located in the retrieved tracked migration sources | Initial DDL provenance OPEN; absence is not proof of non-existence in an external archive |
| `public.axes` | Not located in the retrieved tracked migration sources | Initial DDL provenance OPEN; absence is not proof of non-existence in an external archive |
| `public.experience_multipliers` | Not located in the retrieved tracked migration sources | Initial DDL provenance OPEN; absence is not proof of non-existence in an external archive |
| `public.historical_snapshots` | Not located in the retrieved tracked migration sources | Initial DDL provenance OPEN; absence is not proof of non-existence in an external archive |
| `public.insights_mapping` | Not located in the retrieved tracked migration sources | Initial DDL provenance OPEN; absence is not proof of non-existence in an external archive |
| `public.leads` | Not located in the retrieved tracked migration sources | Initial DDL provenance OPEN; absence is not proof of non-existence in an external archive |
| `public.options` | Not located in the retrieved tracked migration sources | Initial DDL provenance OPEN; absence is not proof of non-existence in an external archive |
| `public.questions` | Not located in the retrieved tracked migration sources | Initial DDL provenance OPEN; absence is not proof of non-existence in an external archive |
| `public.scores` | Not located in the retrieved tracked migration sources | Initial DDL provenance OPEN; absence is not proof of non-existence in an external archive |
| `public.sessions` | Not located in the retrieved tracked migration sources | Initial DDL provenance OPEN; absence is not proof of non-existence in an external archive |
| `public.specialty_profiles` | Not located in the retrieved tracked migration sources | Initial DDL provenance OPEN; absence is not proof of non-existence in an external archive |
| `public.team_capacity_factors` | Not located in the retrieved tracked migration sources | Initial DDL provenance OPEN; absence is not proof of non-existence in an external archive |
| `public.traps` | Not located in the retrieved tracked migration sources | Initial DDL provenance OPEN; absence is not proof of non-existence in an external archive |

The seven located definitions are `admin_audit_log`, `admin_capabilities`, `assessment_families`, `assessment_results`, `assessment_session_access`, `assessment_config_releases`, and `assessment_config_release_settings`. The other 18 names match the candidate list enumerated in `20261001190000_p0_security_closure.sql`.

**Retrieval verified:** `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql` returns 97,267 Unicode characters encoding to exactly 130,416 UTF-8 bytes, matching the Git tree blob size, and ends with its expected `commit;`. Its complete 142-line content was inspected. The file contains trigger toggles and two temporary working tables, but no persistent `CREATE TABLE` for any of the 25 live tables. The initial-DDL gap is confirmed within the 56 tracked migration files on this `main` tree; existence of an authoritative external/original schema source remains OPEN.

## 3. Per-table migration statement map

This is the current statement-level map from the retrieved migration bodies and targeted source searches. “Mentioned” is not equated with “created”; initial DDL status is separately tracked above.

### `public.admin_audit_log`

20261003170912 (CREATE TABLE, RLS, owner-read policy); 20261003171123 (indexes); 20261003183952 (secure audit-read RPC).

### `public.admin_capabilities`

20261003170912 (CREATE TABLE, RLS, self/owner policy); 20261003171123 (index and privilege hardening); 20261003170948 / 20261003175429 (capability RPCs/dedup).

### `public.admin_users`

No initial CREATE TABLE located in fully retrieved migration contents; 20261001061605 (admin guard function); 20261003170912 (identity helpers/policies); 20261003174838 (assistant profile columns and RPCs); 20261001190000 (privilege/policy changes).

### `public.answers`

No initial CREATE TABLE located in fully retrieved migration contents; 20261001083056 (unique session/question constraint); 20261001120000 (option fields, value constraint, index); 20261013110000 (allow 70); submission/structured-result functions in 20261003082558, 20261003082603, 20261009164951.

### `public.assessment_assets`

No initial CREATE TABLE located in fully retrieved migration contents; 20261001100633 (immutability trigger); 20261004102003 and 20261009170228 (draft/reconstruction lifecycle and trigger management).

### `public.assessment_config_release_settings`

20261015100000 (CREATE TABLE, RLS and gate function); 20261015120000 (workflow metadata columns).

### `public.assessment_config_releases`

20261015100000 (CREATE TABLE, RLS, indexes, immutable guard and release RPCs); 20261015120000 (actor metadata/check constraint and CI release RPCs); source-only 20261018110000 changes verifier function.

### `public.assessment_families`

20261001100633 (CREATE TABLE, FK/index); 20261003170912 (policy and admin access); 20261015100000 (current release pointer/FK and guard/pin triggers).

### `public.assessment_results`

20261002161455 (CREATE TABLE, RLS/index); 20261003175353 (admin result-read RPC); 20261009164951 (structured result authority).

### `public.assessment_session_access`

20261001120000 (CREATE TABLE, RLS/index); 20261003082558 / 20261003082603 / 20261003084304 (start/save/prepare/finalize RPCs).

### `public.assessment_settings`

No initial CREATE TABLE located in fully retrieved migration contents; 20261001190000 (authenticated read policy/grant handling); referenced by active Edge runtime.

### `public.assessment_types`

No initial CREATE TABLE located in fully retrieved migration contents; 20261001100633 (family/version FK and indexes); 20261003170912 and later P5 lifecycle migrations (version lifecycle RPCs); 20261015100000 (release relation).

### `public.assessment_users`

No initial CREATE TABLE located in fully retrieved migration contents; 20261001120000 (session relation use); 20261002161455 and admin migrations (protected assessment and identity flows).

### `public.axes`

No initial CREATE TABLE located in fully retrieved migration contents; 20261001100633 (immutability trigger); 20261009164918 (canonical axis weights); 20261009170228 (reconstruction migration).

### `public.experience_multipliers`

No initial CREATE TABLE located in fully retrieved migration contents; referenced by P0 privilege-revocation list; initial DDL provenance OPEN.

### `public.historical_snapshots`

No initial CREATE TABLE located in fully retrieved migration contents; referenced in reconstruction/test/cleanup paths; initial DDL provenance OPEN.

### `public.insights_mapping`

No initial CREATE TABLE located in fully retrieved migration contents; 20261001100633 (immutability trigger); 20261009170228 (reconstruction migration).

### `public.leads`

No initial CREATE TABLE located in fully retrieved migration contents; 20261001190000 (grant/policy handling); used by protected session and result paths.

### `public.options`

No initial CREATE TABLE located in fully retrieved migration contents; 20261001100633 (immutability trigger); 20261005143243 (public option projection RPC); 20261009170228 (reconstruction migration).

### `public.questions`

No initial CREATE TABLE located in fully retrieved migration contents; 20261001100633 (immutability trigger); 20261005143243 (public option projection RPC); 20261009170228 (reconstruction migration).

### `public.scores`

No initial CREATE TABLE located in fully retrieved migration contents; 20261001104008 (numeric precision); 20261001190000 (privilege/policy handling); 20261009164951 (structured-result persistence).

### `public.sessions`

No initial CREATE TABLE located in fully retrieved migration contents; 20261001120000 (assessment_user and usage columns); 20261002161455 (snapshot columns); P4 submission migrations; 20261015100000 (release pointer).

### `public.specialty_profiles`

No initial CREATE TABLE located in fully retrieved migration contents; listed in P0 privilege-revocation loop; initial DDL provenance OPEN.

### `public.team_capacity_factors`

No initial CREATE TABLE located in fully retrieved migration contents; listed in P0 privilege-revocation loop; initial DDL provenance OPEN.

### `public.traps`

No initial CREATE TABLE located in fully retrieved migration contents; 20261001100633 (immutability trigger); 20261009170228 (reconstruction migration).

## 4. Historical marker files

The five earliest tracked files (`20260930233955`, `20260930234340`, `20260930234428`, `20260930234953`, `20260930235404`) share the same blob SHA and are 182-byte marker files stating that the corresponding Production change is already present and the file preserves provenance and **must not be replayed**. They are not executable migration definitions and do not establish empty-database replayability.

## 5. Current conclusions and required next actions

1. **Migration ledger/source discrepancy: OPEN.** Resolve exact provenance for applied versions `20261018075528` and `20261018075855` and source-only `20261018110000`. Preserve existing applied history; do not rename/delete applied migrations or change Production ledger records as part of this inspection.
2. **Initial DDL gap: OPEN.** Verify the full content of the large reconstruction migration through a non-truncated retrieval path and inspect any authoritative historical schema archive. Do not build a speculative baseline from live Production metadata.
3. **Table evolution mapping: OPEN.** The statement map above records key DDL/RPC paths, but full per-object line-level mapping of every ALTER, constraint, index, policy, grant, trigger and function must be completed and cross-checked against live catalog definitions.
4. **Caller and privilege analysis: OPEN.** Use the wrapper-aware caller inventory and live effective-privilege evidence in the current handoff/worksheet; complete the remaining function body, indirect dependency, dynamic SQL, and effective-role review.
5. No deletion, recreation, baseline synthesis, migration application, grants/RLS/policy changes, deployment, or WP-12 transition. D-05 remains OPEN and WP-11 remains IN PROGRESS.


## PR #120 source-body comparison — read-only, not a merge

PR #120 is currently OPEN, unmerged, base `main`, head `wp-11/least-privilege-reconciliation`, SHA `47c0a79dbee108149f9431ff4e86ac120c420f7a`.

The candidate branch's `20261018075528_c03_service_role_api_key_compatibility.sql` and main's `20261018100000_c03_service_role_api_key_compatibility.sql` have SQL bodies identical after normalizing whitespace/comments/final newline. The candidate branch's `20261018075855_c03_verifier_api_key_compatibility.sql` and main's source-only `20261018110000_c03_verifier_api_key_compatibility.sql` also have SQL bodies identical after removing comment lines and normalizing whitespace; one explanatory comment differs. These comparisons show the candidate source bodies are represented on main under different version filenames, but do **not** prove which exact SQL bytes were executed for the applied Production IDs because the live migration ledger exposes version/name, not historical SQL bodies.

Do not merge PR #120, rewrite migration history, or apply a migration as part of this scan. Keep the source/ledger provenance discrepancy OPEN until the approved review path resolves the exact identity/history relationship.


## Line-referenced DDL index

The complete per-file line-reference inventory for all 56 tracked migrations is in `documentation/governance/D-05-MIGRATION-DDL-STATEMENT-INDEX-2026-10-20.md`. Current main has the same migration file paths and blob SHAs as the pinned scan tree. This completes the tracked-file DDL search; it does not close external schema provenance or prove historical applied SQL bodies. D-05 remains OPEN.
