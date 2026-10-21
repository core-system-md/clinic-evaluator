# D-05 / WP-11 — Live public-schema reconciliation worksheet

**Evidence date:** 2026-10-19  
**Repository:** `core-system-md/clinic-evaluator`, branch `main`  
**Supabase project:** `oaqpzaarppccbnepffxx`  
**Mode:** read-only metadata and source inspection. No schema, data, grants, policies, migrations, branches, or deployments were changed by the database investigation.

## Scope and evidence rules

This is an auditable reconciliation worksheet, not a declaration that WP-11 is complete. Live catalog values describe the schema observed at query time; they do not prove intended semantics or historical provenance. Repository search hits show references, not necessarily reachable runtime callers. PL/pgSQL function-name matches were obtained by searching stored function definitions for table-name text; dynamic SQL and external callers may be missed. Migration filenames below are source files found by repository search, not proof that a given migration was applied successfully unless separately supported by the live migration ledger.

**No-drop rules:** no delete/recreate, no production-derived baseline, no rewriting applied migration history, no changes to privileges/RLS, and no WP-12 start. Any unproven claim stays OPEN.

## Live catalog totals

The read-only catalog snapshot returned **25** tables. All had RLS enabled; none had FORCE RLS enabled. The prior closeout catalog totals were 38 foreign keys, 71 policies, 15 non-internal triggers, 87 public functions/procedures, 0 public views/materialized views, and 0 invalid indexes. These structural counts are not a security or functional PASS.

## Per-table evidence register

### `public.admin_audit_log`

- **Exact live row count (2026-10-20, read-only):** 126.
- **Live columns (12):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `actor_user_id uuid`; `action text NOT NULL`; `entity_type text NOT NULL`; `entity_id uuid`; `family_id uuid`; `before_data jsonb`; `after_data jsonb`; `created_at timestamp with time zone NOT NULL DEFAULT now()`; `correlation_id uuid NOT NULL DEFAULT gen_random_uuid()`; `success boolean NOT NULL DEFAULT true`; `failure_reason text`
- **Constraints / relationships:** `admin_audit_log_actor_user_id_fkey: FOREIGN KEY (actor_user_id) REFERENCES auth.users(id)`; `admin_audit_log_family_id_fkey: FOREIGN KEY (family_id) REFERENCES assessment_families(id)`; `admin_audit_log_pkey: PRIMARY KEY (id)`
- **Indexes:** `admin_audit_log_actor_idx: CREATE INDEX admin_audit_log_actor_idx ON public.admin_audit_log USING btree (actor_user_id)`; `admin_audit_log_family_idx: CREATE INDEX admin_audit_log_family_idx ON public.admin_audit_log USING btree (family_id)`; `admin_audit_log_pkey: CREATE UNIQUE INDEX admin_audit_log_pkey ON public.admin_audit_log USING btree (id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (1):** `owner audit read [SELECT TO authenticated] USING=is_owner() CHECK=-`
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** `get_owner_admin_audit_secure(p_limit integer, p_offset integer, p_action text, p_actor_user_id uuid, p_family_id uuid, p_from timestamp with time zone, p_to timestamp with time zone)`, `write_admin_audit(p_action text, p_entity_type text, p_entity_id uuid, p_family_id uuid, p_before jsonb, p_after jsonb, p_success boolean, p_failure_reason text)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** No match in sampled files. This is not proof of no caller.
- **Initial CREATE TABLE provenance:** `supabase/migrations/20261003170912_p5_admin_architecture.sql` — tracked migration contains a CREATE TABLE declaration found by repository search.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261003170912_p5_admin_architecture.sql`
- **Disposition:** Initial DDL was located; complete column-by-column migration evolution and applied-ledger parity remain OPEN.

### `public.admin_capabilities`

- **Exact live row count (2026-10-20, read-only):** 7.
- **Live columns (4):** `user_id uuid NOT NULL`; `capability text NOT NULL`; `granted_by uuid NOT NULL`; `created_at timestamp with time zone NOT NULL DEFAULT now()`
- **Constraints / relationships:** `admin_capabilities_granted_by_fkey: FOREIGN KEY (granted_by) REFERENCES auth.users(id)`; `admin_capabilities_pkey: PRIMARY KEY (user_id, capability)`; `admin_capabilities_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`
- **Indexes:** `admin_capabilities_granted_by_idx: CREATE INDEX admin_capabilities_granted_by_idx ON public.admin_capabilities USING btree (granted_by)`; `admin_capabilities_pkey: CREATE UNIQUE INDEX admin_capabilities_pkey ON public.admin_capabilities USING btree (user_id, capability)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (1):** `admin capabilities self read [SELECT TO authenticated] USING=((user_id = ( SELECT auth.uid() AS uid)) OR is_owner()) CHECK=-`
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** `grant_admin_capability_secure(p_user_id uuid, p_capability text)`, `has_admin_capability(p_capability text)`, `register_admin_assistant_secure(p_user_id uuid, p_display_name text, p_capabilities text[])`, `revoke_admin_capability_secure(p_user_id uuid, p_capability text)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `admin/assessment-manager.js`
- **Initial CREATE TABLE provenance:** `supabase/migrations/20261003170912_p5_admin_architecture.sql` — tracked migration contains a CREATE TABLE declaration found by repository search.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261003170912_p5_admin_architecture.sql`, `supabase/migrations/20261003174838_p5_admin_assistant_management.sql`, `supabase/migrations/20261003171050_p5_admin_canonical_import_and_audit.sql`
- **Disposition:** Initial DDL was located; complete column-by-column migration evolution and applied-ledger parity remain OPEN.

### `public.admin_users`

- **Exact live row count (2026-10-20, read-only):** 2.
- **Live columns (6):** `user_id uuid NOT NULL`; `role text NOT NULL DEFAULT 'admin'::text`; `active boolean NOT NULL DEFAULT true`; `created_at timestamp with time zone NOT NULL DEFAULT now()`; `created_by uuid`; `display_name text`
- **Constraints / relationships:** `admin_users_created_by_fkey: FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL`; `admin_users_pkey: PRIMARY KEY (user_id)`; `admin_users_role_check: CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text])))`; `admin_users_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`
- **Indexes:** `admin_users_pkey: CREATE UNIQUE INDEX admin_users_pkey ON public.admin_users USING btree (user_id)`; `admin_users_single_owner_uidx: CREATE UNIQUE INDEX admin_users_single_owner_uidx ON public.admin_users USING btree (role) WHERE (role = 'owner'::text)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (5):** `admin_users_delete_owner_admins [DELETE TO authenticated] USING=((role = 'admin'::text) AND is_owner(( SELECT auth.uid() AS uid))) CHECK=-`; `admin_users_insert_owner [INSERT TO authenticated] USING=- CHECK=((role = 'admin'::text) AND is_owner(( SELECT auth.uid() AS uid)))`; `admin_users_select_self_or_admin [SELECT TO authenticated] USING=((user_id = ( SELECT auth.uid() AS uid)) OR is_active_admin(( SELECT auth.uid() AS uid))) CHECK=-`; `admin_users_update_owner [UPDATE TO authenticated] USING=is_owner(( SELECT auth.uid() AS uid)) CHECK=((role = 'admin'::text) AND (user_id <> ( SELECT auth.uid() AS uid)) AND is_owner(( SELECT auth.uid() AS uid)))`; `p0_admin_select_admin_users [SELECT TO authenticated] USING=is_active_admin(( SELECT auth.uid() AS uid)) CHECK=-`
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** `get_owner_admin_audit_secure(p_limit integer, p_offset integer, p_action text, p_actor_user_id uuid, p_family_id uuid, p_from timestamp with time zone, p_to timestamp with time zone)`, `grant_admin_capability_secure(p_user_id uuid, p_capability text)`, `has_admin_capability(p_capability text)`, `is_active_admin()`, `is_active_admin(p_user_id uuid)`, `is_owner(p_user_id uuid)`, `is_owner()`, `register_admin_assistant_secure(p_user_id uuid, p_display_name text, p_capabilities text[])`, `require_admin()`, `revoke_admin_capability_secure(p_user_id uuid, p_capability text)`, `set_admin_active_secure(p_user_id uuid, p_active boolean)`, `update_admin_assistant_profile_secure(p_user_id uuid, p_display_name text)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `admin/assessment-manager.js`
- **Initial CREATE TABLE provenance:** no initial persistent `CREATE TABLE` found after inspecting all 56 tracked migration files on the pinned `main` tree. The gap within tracked repository history is confirmed; an authoritative external/original schema source remains unverified.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261003170912_p5_admin_architecture.sql`, `supabase/migrations/20261003174838_p5_admin_assistant_management.sql`, `supabase/migrations/20261003171050_p5_admin_canonical_import_and_audit.sql`, `supabase/migrations/20261001190000_p0_security_closure.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.answers`

- **Exact live row count (2026-10-20, read-only):** 0.
- **Live columns (13):** `id uuid NOT NULL DEFAULT uuid_generate_v4()`; `session_id uuid`; `lead_id uuid`; `question_id text NOT NULL`; `axis_id text NOT NULL`; `question_text text`; `answer_value integer NOT NULL`; `is_trap boolean DEFAULT false`; `trap_triggered boolean DEFAULT false`; `answered_at timestamp with time zone DEFAULT now()`; `option_index integer`; `option_value integer`; `chosen_option_label text`
- **Constraints / relationships:** `answers_answer_value_compat_check: CHECK ((answer_value = ANY (ARRAY[0, 1, 2, 3, 4, 5, 40, 70, 100])))`; `answers_lead_id_fkey: FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE`; `answers_pkey: PRIMARY KEY (id)`; `answers_session_id_fkey: FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE`; `answers_session_question_unique: UNIQUE (session_id, question_id)`
- **Indexes:** `answers_pkey: CREATE UNIQUE INDEX answers_pkey ON public.answers USING btree (id)`; `answers_session_question_uidx: CREATE UNIQUE INDEX answers_session_question_uidx ON public.answers USING btree (session_id, question_id) WHERE (session_id IS NOT NULL)`; `answers_session_question_unique: CREATE UNIQUE INDEX answers_session_question_unique ON public.answers USING btree (session_id, question_id)`; `idx_answers_session: CREATE INDEX idx_answers_session ON public.answers USING btree (session_id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (7):** `Allow anon insert answers [INSERT TO anon] USING=- CHECK=true`; `Service role full access answers [ALL TO service_role] USING=true CHECK=true`; `anon_insert_answers [INSERT TO anon] USING=- CHECK=true`; `answers_public_insert [INSERT TO public] USING=- CHECK=true`; `answers_public_select [SELECT TO public] USING=true CHECK=-`; `p0_admin_select_answers [SELECT TO authenticated] USING=is_active_admin(( SELECT auth.uid() AS uid)) CHECK=-`; `service_all_answers [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** `calculate_session_score(p_session_id uuid)`, `prepare_assessment_submission(p_session_id uuid, p_access_token_hash text)`, `prepare_assessment_submission(p_session_id uuid, p_access_token_hash text, p_economic_input jsonb)`, `save_assessment_answer(p_access_token_hash text, p_question_id text, p_option_index integer, p_current_question integer)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `assets/js/app.js`, `supabase/functions/assessment-access/index.ts`, `supabase/functions/assessment-access/engine.ts`
- **Initial CREATE TABLE provenance:** no initial persistent `CREATE TABLE` found after inspecting all 56 tracked migration files on the pinned `main` tree. The gap within tracked repository history is confirmed; an authoritative external/original schema source remains unverified.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql`, `supabase/migrations/20261001190000_p0_security_closure.sql`, `supabase/migrations/20261003084304_20261003103000_p4_submission_context_lock.sql`, `supabase/migrations/20261003082603_20261003093000_p4_submission_prepare_finalize.sql`, `supabase/migrations/20261009164951_structured_result_authority.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.assessment_assets`

- **Exact live row count (2026-10-20, read-only):** 0.
- **Live columns (13):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `assessment_type_id uuid NOT NULL`; `asset_type character varying(50) NOT NULL`; `file_url text NOT NULL`; `file_name character varying(255)`; `file_size integer`; `mime_type character varying(100)`; `alt_text character varying(255)`; `alt_text_ar character varying(255)`; `display_order integer DEFAULT 0`; `is_active boolean DEFAULT true`; `created_at timestamp with time zone DEFAULT now()`; `updated_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `assessment_assets_assessment_type_id_fkey: FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id) ON DELETE CASCADE`; `assessment_assets_pkey: PRIMARY KEY (id)`
- **Indexes:** `assessment_assets_pkey: CREATE UNIQUE INDEX assessment_assets_pkey ON public.assessment_assets USING btree (id)`; `idx_assets_assessment: CREATE INDEX idx_assets_assessment ON public.assessment_assets USING btree (assessment_type_id)`; `idx_assets_type: CREATE INDEX idx_assets_type ON public.assessment_assets USING btree (assessment_type_id, asset_type)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (2):** `anon_select_assets [SELECT TO anon] USING=(assessment_type_id IN ( SELECT assessment_types.id    FROM assessment_types   WHERE ((assessment_types.status)::text = 'published'::text))) CHECK=-`; `service_all_assets [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** `p2_assessment_assets_immutable: CREATE TRIGGER p2_assessment_assets_immutable BEFORE INSERT OR DELETE OR UPDATE ON public.assessment_assets FOR EACH ROW EXECUTE FUNCTION p2_assert_draft_version('direct')`; `update_assets_updated_at: CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assessment_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
- **Stored functions with table-name text match:** `create_assessment_version_secure(p_source_version_id uuid)`, `delete_assessment_draft_secure(p_id uuid)`, `duplicate_assessment(source_id uuid)`, `p2_assert_draft_version()`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** No match in sampled files. This is not proof of no caller.
- **Initial CREATE TABLE provenance:** no initial persistent `CREATE TABLE` found after inspecting all 56 tracked migration files on the pinned `main` tree. The gap within tracked repository history is confirmed; an authoritative external/original schema source remains unverified.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`, `supabase/migrations/20261004102003_p5_delete_draft_cascade_fix_2026_10_04.sql`, `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.assessment_config_release_settings`

- **Exact live row count (2026-10-20, read-only):** 1.
- **Live columns (7):** `singleton boolean NOT NULL DEFAULT true`; `enabled boolean NOT NULL DEFAULT false`; `enabled_at timestamp with time zone`; `enabled_by uuid`; `updated_at timestamp with time zone NOT NULL DEFAULT now()`; `enabled_by_workflow_run_id text`; `enabled_by_workflow_sha text`
- **Constraints / relationships:** `assessment_config_release_settings_enabled_by_fkey: FOREIGN KEY (enabled_by) REFERENCES auth.users(id)`; `assessment_config_release_settings_pkey: PRIMARY KEY (singleton)`; `assessment_config_release_settings_singleton_check: CHECK (singleton)`
- **Indexes:** `assessment_config_release_settings_pkey: CREATE UNIQUE INDEX assessment_config_release_settings_pkey ON public.assessment_config_release_settings USING btree (singleton)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (0):** No policy row returned for this table.
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** `c03_assessment_release_gate_enabled()`, `enable_assessment_config_release_gate_ci_secure(p_workflow_run_id text, p_workflow_run_attempt text, p_workflow_sha text, p_confirmation text)`, `enable_assessment_config_release_gate_secure()`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `supabase/functions/assessment-access/engine.ts`, `supabase/functions/assessment-config-release/index.ts`
- **Initial CREATE TABLE provenance:** `supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql` — tracked migration contains a CREATE TABLE declaration found by repository search.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql`, `supabase/migrations/20261015120000_c03_github_oidc_release_authorization.sql`
- **Disposition:** Initial DDL was located; complete column-by-column migration evolution and applied-ledger parity remain OPEN.

### `public.assessment_config_releases`

- **Exact live row count (2026-10-20, read-only):** 15.
- **Live columns (34):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `family_id uuid NOT NULL`; `assessment_type_id uuid NOT NULL`; `assessment_version integer NOT NULL`; `git_commit_sha text NOT NULL`; `config_digest text NOT NULL`; `canonicalizer_version text NOT NULL`; `interpretation_version integer NOT NULL`; `interpretation_registry_digest text NOT NULL`; `scoring_engine_version text NOT NULL`; `scoring_contract_version text NOT NULL`; `report_model_version text NOT NULL`; `fixture_set_version text NOT NULL`; `migration_contract_version text NOT NULL`; `edge_release_ref text NOT NULL`; `state text NOT NULL DEFAULT 'PREPARED'::text`; `created_by uuid`; `created_at timestamp with time zone NOT NULL DEFAULT now()`; `verified_at timestamp with time zone`; `verified_config_digest text`; `verified_registry_digest text`; `verified_git_commit_sha text`; `verified_edge_release_ref text`; `verified_interpretation_version integer`; `verified_scoring_engine_version text`; `verified_scoring_contract_version text`; `verified_report_model_version text`; `verified_fixture_set_version text`; `verified_migration_contract_version text`; `validation_report jsonb NOT NULL DEFAULT '{}'::jsonb`; `failure_reason text`; `published_at timestamp with time zone`; `release_actor jsonb NOT NULL DEFAULT '{}'::jsonb`; `activation_actor jsonb NOT NULL DEFAULT '{}'::jsonb`
- **Constraints / relationships:** `assessment_config_releases_assessment_type_id_fkey: FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id) ON DELETE RESTRICT`; `assessment_config_releases_assessment_type_id_git_commit_sh_key: UNIQUE (assessment_type_id, git_commit_sha, config_digest)`; `assessment_config_releases_assessment_version_check: CHECK ((assessment_version > 0))`; `assessment_config_releases_canonicalizer_version_check: CHECK ((length(TRIM(BOTH FROM canonicalizer_version)) > 0))`; `assessment_config_releases_ci_actor_object_check: CHECK (((jsonb_typeof(release_actor) = 'object'::text) AND (jsonb_typeof(activation_actor) = 'object'::text)))`; `assessment_config_releases_config_digest_check: CHECK ((config_digest ~ '^[0-9a-f]{64}$'::text))`; `assessment_config_releases_created_by_fkey: FOREIGN KEY (created_by) REFERENCES auth.users(id)`; `assessment_config_releases_edge_release_ref_check: CHECK ((length(TRIM(BOTH FROM edge_release_ref)) > 0))`; `assessment_config_releases_family_id_fkey: FOREIGN KEY (family_id) REFERENCES assessment_families(id) ON DELETE RESTRICT`; `assessment_config_releases_fixture_set_version_check: CHECK ((length(TRIM(BOTH FROM fixture_set_version)) > 0))`; `assessment_config_releases_git_commit_sha_check: CHECK ((git_commit_sha ~ '^[0-9a-f]{40}([0-9a-f]{24})?$'::text))`; `assessment_config_releases_interpretation_registry_digest_check: CHECK ((interpretation_registry_digest ~ '^[0-9a-f]{64}$'::text))`; `assessment_config_releases_interpretation_version_check: CHECK ((interpretation_version > 0))`; `assessment_config_releases_migration_contract_version_check: CHECK ((length(TRIM(BOTH FROM migration_contract_version)) > 0))`; `assessment_config_releases_pkey: PRIMARY KEY (id)`; `assessment_config_releases_report_model_version_check: CHECK ((length(TRIM(BOTH FROM report_model_version)) > 0))`; `assessment_config_releases_scoring_contract_version_check: CHECK ((length(TRIM(BOTH FROM scoring_contract_version)) > 0))`; `assessment_config_releases_scoring_engine_version_check: CHECK ((length(TRIM(BOTH FROM scoring_engine_version)) > 0))`; `assessment_config_releases_state_check: CHECK ((state = ANY (ARRAY['PREPARED'::text, 'VERIFIED'::text, 'PUBLISHED'::text, 'REJECTED'::text, 'DEGRADED'::text])))`; `assessment_config_releases_verified_config_digest_check: CHECK (((verified_config_digest IS NULL) OR (verified_config_digest ~ '^[0-9a-f]{64}$'::text)))`; `assessment_config_releases_verified_registry_digest_check: CHECK (((verified_registry_digest IS NULL) OR (verified_registry_digest ~ '^[0-9a-f]{64}$'::text)))`
- **Indexes:** `assessment_config_releases_assessment_type_id_git_commit_sh_key: CREATE UNIQUE INDEX assessment_config_releases_assessment_type_id_git_commit_sh_key ON public.assessment_config_releases USING btree (assessment_type_id, git_commit_sha, config_digest)`; `assessment_config_releases_pkey: CREATE UNIQUE INDEX assessment_config_releases_pkey ON public.assessment_config_releases USING btree (id)`; `assessment_config_releases_version_state_idx: CREATE INDEX assessment_config_releases_version_state_idx ON public.assessment_config_releases USING btree (family_id, assessment_type_id, state, verified_at DESC)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (0):** No policy row returned for this table.
- **Triggers:** `c03_release_immutable_guard: CREATE TRIGGER c03_release_immutable_guard BEFORE DELETE OR UPDATE ON public.assessment_config_releases FOR EACH ROW EXECUTE FUNCTION c03_release_immutable_guard()`
- **Stored functions with table-name text match:** `activate_existing_assessment_release_ci_secure(p_release_id uuid, p_expected_published_version_id uuid, p_workflow_run_id text, p_workflow_run_attempt text, p_workflow_sha text, p_confirmation text)`, `activate_existing_assessment_release_secure(p_release_id uuid, p_expected_published_version_id uuid)`, `c03_guard_family_release_pointer()`, `c03_pin_session_release()`, `enable_assessment_config_release_gate_ci_secure(p_workflow_run_id text, p_workflow_run_attempt text, p_workflow_sha text, p_confirmation text)`, `enable_assessment_config_release_gate_secure()`, `publish_assessment_config_release_secure(p_release_id uuid, p_expected_published_version_id uuid)`, `register_assessment_config_release_ci_secure(p_assessment_type_id uuid, p_git_commit_sha text, p_config_digest text, p_canonicalizer_version text, p_interpretation_version integer, p_interpretation_registry_digest text, p_scoring_engine_version text, p_scoring_contract_version text, p_report_model_version text, p_fixture_set_version text, p_migration_contract_version text, p_edge_release_ref text, p_workflow_run_id text, p_workflow_run_attempt text, p_workflow_sha text, p_confirmation text)`, `register_assessment_config_release_secure(p_assessment_type_id uuid, p_git_commit_sha text, p_config_digest text, p_canonicalizer_version text, p_interpretation_version integer, p_interpretation_registry_digest text, p_scoring_engine_version text, p_scoring_contract_version text, p_report_model_version text, p_fixture_set_version text, p_migration_contract_version text, p_edge_release_ref text)`, `verify_assessment_config_release_secure(p_release_id uuid, p_actual_family_id uuid, p_actual_assessment_type_id uuid, p_actual_assessment_version integer, p_actual_config_digest text, p_actual_canonicalizer_version text, p_actual_registry_digest text, p_actual_git_commit_sha text, p_actual_edge_release_ref text, p_actual_interpretation_version integer, p_actual_scoring_engine_version text, p_actual_scoring_contract_version text, p_actual_report_model_version text, p_actual_fixture_set_version text, p_actual_migration_contract_version text, p_validation_report jsonb)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `supabase/functions/assessment-access/engine.ts`, `supabase/functions/assessment-config-release/index.ts`
- **Initial CREATE TABLE provenance:** `supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql` — tracked migration contains a CREATE TABLE declaration found by repository search.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql`, `supabase/migrations/20261015120000_c03_github_oidc_release_authorization.sql`
- **Disposition:** Initial DDL was located; complete column-by-column migration evolution and applied-ledger parity remain OPEN.

### `public.assessment_families`

- **Exact live row count (2026-10-20, read-only):** 5.
- **Live columns (7):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `slug text NOT NULL`; `current_published_version_id uuid`; `created_at timestamp with time zone NOT NULL DEFAULT now()`; `updated_at timestamp with time zone NOT NULL DEFAULT now()`; `created_by uuid`; `current_release_id uuid`
- **Constraints / relationships:** `assessment_families_created_by_fkey: FOREIGN KEY (created_by) REFERENCES auth.users(id)`; `assessment_families_current_published_version_fkey: FOREIGN KEY (current_published_version_id) REFERENCES assessment_types(id) ON DELETE RESTRICT`; `assessment_families_current_release_id_fkey: FOREIGN KEY (current_release_id) REFERENCES assessment_config_releases(id) ON DELETE RESTRICT`; `assessment_families_pkey: PRIMARY KEY (id)`; `assessment_families_slug_key: UNIQUE (slug)`
- **Indexes:** `assessment_families_current_published_idx: CREATE INDEX assessment_families_current_published_idx ON public.assessment_families USING btree (current_published_version_id)`; `assessment_families_pkey: CREATE UNIQUE INDEX assessment_families_pkey ON public.assessment_families USING btree (id)`; `assessment_families_slug_key: CREATE UNIQUE INDEX assessment_families_slug_key ON public.assessment_families USING btree (slug)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (1):** `active admin family read [SELECT TO authenticated] USING=has_admin_capability('assessment.view'::text) CHECK=-`
- **Triggers:** `c03_guard_family_release_pointer: CREATE TRIGGER c03_guard_family_release_pointer BEFORE UPDATE OF current_published_version_id, current_release_id ON public.assessment_families FOR EACH ROW EXECUTE FUNCTION c03_guard_family_release_pointer()`
- **Stored functions with table-name text match:** `activate_existing_assessment_release_ci_secure(p_release_id uuid, p_expected_published_version_id uuid, p_workflow_run_id text, p_workflow_run_attempt text, p_workflow_sha text, p_confirmation text)`, `activate_existing_assessment_release_secure(p_release_id uuid, p_expected_published_version_id uuid)`, `archive_assessment_secure(p_version_id uuid)`, `c03_pin_session_release()`, `create_assessment_secure(p_slug text, p_title_ar text, p_title_en text, p_description text, p_has_traps boolean, p_has_ev_simulator boolean)`, `create_assessment_version_secure(p_source_version_id uuid)`, `delete_assessment_draft_secure(p_id uuid)`, `enable_assessment_config_release_gate_ci_secure(p_workflow_run_id text, p_workflow_run_attempt text, p_workflow_sha text, p_confirmation text)`, `enable_assessment_config_release_gate_secure()`, `generate_assessment_user_secure(p_slug text, p_username text, p_password_hash text, p_max_uses integer, p_expiry_days integer)`, `get_owner_admin_audit_secure(p_limit integer, p_offset integer, p_action text, p_actor_user_id uuid, p_family_id uuid, p_from timestamp with time zone, p_to timestamp with time zone)`, `import_assessment_secure(p_data jsonb)`, `publish_assessment_config_release_secure(p_release_id uuid, p_expected_published_version_id uuid)`, `publish_assessment_version_secure(p_version_id uuid)`, `restore_public_assessment_secure(p_version_id uuid)`, `resume_public_assessment_secure(p_version_id uuid)`, `stop_public_assessment_secure(p_family_id uuid)`, `toggle_assessment_auth_secure(p_slug text, p_enabled boolean)`, `validate_assessment_version_secure(p_version_id uuid)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `admin/assessment-manager.js`, `admin/assessment-editor-workspace.js`, `supabase/functions/assessment-access/index.ts`, `supabase/functions/assessment-access/engine.ts`, `supabase/functions/assessment-config-release/index.ts`
- **Initial CREATE TABLE provenance:** `supabase/migrations/20261001100633_p2_assessment_family_versions.sql` — tracked migration contains a CREATE TABLE declaration found by repository search.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`, `supabase/migrations/20261003170912_p5_admin_architecture.sql`, `supabase/migrations/20261003171050_p5_admin_canonical_import_and_audit.sql`, `supabase/migrations/20261003175220_p5_working_copy_deep_copy_and_legacy_write_lock.sql`, `supabase/migrations/20261003175601_p5_working_copy_stable_family_slug.sql`, `supabase/migrations/20261003224353_p5_published_content_edit_lifecycle.sql`
- **Disposition:** Initial DDL was located; complete column-by-column migration evolution and applied-ledger parity remain OPEN.

### `public.assessment_results`

- **Exact live row count (2026-10-20, read-only):** 0.
- **Live columns (12):** `id uuid NOT NULL`; `session_id uuid NOT NULL`; `assessment_type_id uuid NOT NULL`; `assessment_version integer NOT NULL`; `interpretation_version integer NOT NULL`; `scoring_engine_version text NOT NULL`; `scoring_contract_version text NOT NULL`; `assessment_config_digest text NOT NULL`; `calculated_at timestamp with time zone NOT NULL`; `result_status text NOT NULL DEFAULT 'PRODUCTION'::text`; `result jsonb NOT NULL`; `created_at timestamp with time zone NOT NULL DEFAULT now()`
- **Constraints / relationships:** `assessment_results_assessment_type_id_fkey: FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id)`; `assessment_results_pkey: PRIMARY KEY (id)`; `assessment_results_result_status_check: CHECK ((result_status = ANY (ARRAY['SHADOW'::text, 'PRODUCTION'::text, 'LEGACY'::text])))`; `assessment_results_session_id_fkey: FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE`; `assessment_results_session_id_key: UNIQUE (session_id)`
- **Indexes:** `assessment_results_assessment_type_created_idx: CREATE INDEX assessment_results_assessment_type_created_idx ON public.assessment_results USING btree (assessment_type_id, calculated_at DESC)`; `assessment_results_pkey: CREATE UNIQUE INDEX assessment_results_pkey ON public.assessment_results USING btree (id)`; `assessment_results_session_id_key: CREATE UNIQUE INDEX assessment_results_session_id_key ON public.assessment_results USING btree (session_id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (0):** No policy row returned for this table.
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** `complete_p3_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p3_public_assessment_session(p_session_id uuid, p_access_token_hash text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p4_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p4_public_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_public_assessment_session(p_session_id uuid, p_access_token_hash text, p_submission_fingerprint text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `delete_assessment_draft_secure(p_id uuid)`, `get_admin_assessment_result_secure(p_session_id uuid)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `admin/assessment-manager.js`, `supabase/functions/assessment-access/index.ts`
- **Initial CREATE TABLE provenance:** `supabase/migrations/20261002161455_p3_production_implementation.sql` — tracked migration contains a CREATE TABLE declaration found by repository search.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261002161455_p3_production_implementation.sql`, `supabase/migrations/20261009164951_structured_result_authority.sql`, `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`
- **Disposition:** Initial DDL was located; complete column-by-column migration evolution and applied-ledger parity remain OPEN.

### `public.assessment_session_access`

- **Exact live row count (2026-10-20, read-only):** 0.
- **Live columns (9):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `session_id uuid`; `assessment_user_id uuid`; `token_hash text NOT NULL`; `created_at timestamp with time zone NOT NULL DEFAULT now()`; `last_seen_at timestamp with time zone NOT NULL DEFAULT now()`; `expires_at timestamp with time zone NOT NULL`; `revoked_at timestamp with time zone`; `assessment_type_id uuid`
- **Constraints / relationships:** `assessment_session_access_assessment_type_id_fkey: FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id) ON DELETE CASCADE`; `assessment_session_access_assessment_user_id_fkey: FOREIGN KEY (assessment_user_id) REFERENCES assessment_users(id) ON DELETE CASCADE`; `assessment_session_access_pkey: PRIMARY KEY (id)`; `assessment_session_access_session_id_fkey: FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE`; `assessment_session_access_token_hash_key: UNIQUE (token_hash)`
- **Indexes:** `assessment_session_access_pkey: CREATE UNIQUE INDEX assessment_session_access_pkey ON public.assessment_session_access USING btree (id)`; `assessment_session_access_token_hash_key: CREATE UNIQUE INDEX assessment_session_access_token_hash_key ON public.assessment_session_access USING btree (token_hash)`; `assessment_session_access_type_idx: CREATE INDEX assessment_session_access_type_idx ON public.assessment_session_access USING btree (assessment_type_id, created_at DESC)`; `assessment_session_access_user_idx: CREATE INDEX assessment_session_access_user_idx ON public.assessment_session_access USING btree (assessment_user_id, expires_at)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (0):** No policy row returned for this table.
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** `complete_p3_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p3_public_assessment_session(p_session_id uuid, p_access_token_hash text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p4_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p4_public_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_public_assessment_session(p_session_id uuid, p_access_token_hash text, p_submission_fingerprint text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `delete_assessment_draft_secure(p_id uuid)`, `prepare_assessment_submission(p_session_id uuid, p_access_token_hash text)`, `prepare_assessment_submission(p_session_id uuid, p_access_token_hash text, p_economic_input jsonb)`, `save_assessment_answer(p_access_token_hash text, p_question_id text, p_option_index integer, p_current_question integer)`, `start_assessment_session(p_access_token_hash text, p_assessment_user_id uuid, p_assessment_type_id uuid, p_lead_id uuid)`, `start_public_assessment_session(p_access_token_hash text, p_assessment_type_id uuid, p_lead_id uuid)`, `start_public_assessment_session(p_access_token_hash text, p_assessment_type_id uuid, p_lead_id uuid, p_attempt_key_hash text)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `supabase/functions/assessment-access/index.ts`
- **Initial CREATE TABLE provenance:** `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql` — tracked migration contains a CREATE TABLE declaration found by repository search.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql`, `supabase/migrations/20261001190000_p0_security_closure.sql`, `supabase/migrations/20261003082603_20261003093000_p4_submission_prepare_finalize.sql`, `supabase/migrations/20261004102003_p5_delete_draft_cascade_fix_2026_10_04.sql`, `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`
- **Disposition:** Initial DDL was located; complete column-by-column migration evolution and applied-ledger parity remain OPEN.

### `public.assessment_settings`

- **Exact live row count (2026-10-20, read-only):** 3.
- **Live columns (3):** `assessment_key text NOT NULL`; `auth_enabled boolean DEFAULT false`; `created_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `assessment_settings_pkey: PRIMARY KEY (assessment_key)`
- **Indexes:** `assessment_settings_pkey: CREATE UNIQUE INDEX assessment_settings_pkey ON public.assessment_settings USING btree (assessment_key)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (5):** `Service role full access assessment_settings [ALL TO service_role] USING=true CHECK=true`; `anon_read_assessment_settings [SELECT TO anon] USING=true CHECK=-`; `anon_select_assessment_settings [SELECT TO anon] USING=true CHECK=-`; `p0_admin_select_assessment_settings [SELECT TO authenticated] USING=is_active_admin(( SELECT auth.uid() AS uid)) CHECK=-`; `service_all_assessment_settings [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** `toggle_assessment_auth_secure(p_slug text, p_enabled boolean)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `admin/assessment-manager.js`, `supabase/functions/assessment-access/index.ts`
- **Initial CREATE TABLE provenance:** no initial persistent `CREATE TABLE` found after inspecting all 56 tracked migration files on the pinned `main` tree. The gap within tracked repository history is confirmed; an authoritative external/original schema source remains unverified.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001190000_p0_security_closure.sql`, `supabase/migrations/20261003170912_p5_admin_architecture.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.assessment_types`

- **Exact live row count (2026-10-20, read-only):** 5.
- **Live columns (23):** `id uuid NOT NULL DEFAULT uuid_generate_v4()`; `slug text NOT NULL`; `title_ar text NOT NULL`; `title_en text`; `description text`; `question_count integer NOT NULL DEFAULT 0`; `axis_count integer NOT NULL DEFAULT 0`; `has_traps boolean DEFAULT false`; `has_ev_simulator boolean DEFAULT false`; `config_version integer DEFAULT 1`; `is_active boolean DEFAULT true`; `created_at timestamp with time zone DEFAULT now()`; `status character varying(20) DEFAULT 'published'::character varying`; `version integer DEFAULT 1`; `updated_at timestamp with time zone DEFAULT now()`; `published_at timestamp with time zone`; `archived_at timestamp with time zone`; `created_by uuid`; `parent_id uuid`; `kpi_mappings jsonb`; `ev_mappings jsonb`; `axis_roles jsonb`; `family_id uuid NOT NULL`
- **Constraints / relationships:** `assessment_types_family_id_fkey: FOREIGN KEY (family_id) REFERENCES assessment_families(id)`; `assessment_types_parent_id_fkey: FOREIGN KEY (parent_id) REFERENCES assessment_types(id)`; `assessment_types_pkey: PRIMARY KEY (id)`; `assessment_types_slug_key: UNIQUE (slug)`; `chk_assessment_status: CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying])::text[])))`
- **Indexes:** `assessment_types_family_version_uidx: CREATE UNIQUE INDEX assessment_types_family_version_uidx ON public.assessment_types USING btree (family_id, version)`; `assessment_types_one_published_per_family_uidx: CREATE UNIQUE INDEX assessment_types_one_published_per_family_uidx ON public.assessment_types USING btree (family_id) WHERE ((status)::text = 'published'::text)`; `assessment_types_pkey: CREATE UNIQUE INDEX assessment_types_pkey ON public.assessment_types USING btree (id)`; `assessment_types_slug_key: CREATE UNIQUE INDEX assessment_types_slug_key ON public.assessment_types USING btree (slug)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (7):** `Allow anon read assessment_types [SELECT TO anon] USING=true CHECK=-`; `Allow public read access [SELECT TO public] USING=true CHECK=-`; `Service role full access assessment_types [ALL TO service_role] USING=true CHECK=true`; `anon_select_assessment_types [SELECT TO anon] USING=((status)::text = 'published'::text) CHECK=-`; `assessment_types_public_read [SELECT TO public] USING=(is_active = true) CHECK=-`; `p0_admin_select_assessment_types [SELECT TO authenticated] USING=is_active_admin(( SELECT auth.uid() AS uid)) CHECK=-`; `service_all_assessment_types [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** `p2_assessment_type_immutability: CREATE TRIGGER p2_assessment_type_immutability BEFORE DELETE OR UPDATE ON public.assessment_types FOR EACH ROW EXECUTE FUNCTION p2_assessment_type_immutability()`; `update_assessment_types_updated_at: CREATE TRIGGER update_assessment_types_updated_at BEFORE UPDATE ON public.assessment_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
- **Stored functions with table-name text match:** `activate_existing_assessment_release_ci_secure(p_release_id uuid, p_expected_published_version_id uuid, p_workflow_run_id text, p_workflow_run_attempt text, p_workflow_sha text, p_confirmation text)`, `activate_existing_assessment_release_secure(p_release_id uuid, p_expected_published_version_id uuid)`, `add_option_secure(p_question_id uuid, p_label_ar text, p_label text, p_option_value integer, p_option_index integer, p_display_order integer, p_is_trap boolean)`, `archive_assessment_secure(p_version_id uuid)`, `create_assessment_secure(p_slug text, p_title_ar text, p_title_en text, p_description text, p_has_traps boolean, p_has_ev_simulator boolean)`, `create_assessment_version_secure(p_source_version_id uuid)`, `delete_assessment_draft_secure(p_id uuid)`, `delete_draft_axis_secure(p_axis_id uuid)`, `delete_draft_question_secure(p_question_id uuid)`, `delete_option_secure(p_option_id uuid)`, `duplicate_assessment(source_id uuid)`, `duplicate_assessment_secure(p_id uuid, p_clone_slug text)`, `get_public_assessment_options_secure(p_assessment_type_id uuid)`, `import_assessment_secure(p_data jsonb)`, `p2_assert_draft_version()`, `publish_assessment_config_release_secure(p_release_id uuid, p_expected_published_version_id uuid)`, `publish_assessment_version_secure(p_version_id uuid)`, `register_assessment_config_release_ci_secure(p_assessment_type_id uuid, p_git_commit_sha text, p_config_digest text, p_canonicalizer_version text, p_interpretation_version integer, p_interpretation_registry_digest text, p_scoring_engine_version text, p_scoring_contract_version text, p_report_model_version text, p_fixture_set_version text, p_migration_contract_version text, p_edge_release_ref text, p_workflow_run_id text, p_workflow_run_attempt text, p_workflow_sha text, p_confirmation text)`, `register_assessment_config_release_secure(p_assessment_type_id uuid, p_git_commit_sha text, p_config_digest text, p_canonicalizer_version text, p_interpretation_version integer, p_interpretation_registry_digest text, p_scoring_engine_version text, p_scoring_contract_version text, p_report_model_version text, p_fixture_set_version text, p_migration_contract_version text, p_edge_release_ref text)`, `restore_public_assessment_secure(p_version_id uuid)`, `resume_public_assessment_secure(p_version_id uuid)`, `save_assessment_secure(p_id uuid, p_title_ar text, p_title_en text, p_slug text, p_description text, p_status text, p_has_traps boolean, p_has_ev_simulator boolean)`, `save_axis_secure(p_assessment_type_id uuid, p_title text, p_title_ar text, p_code character varying, p_weight numeric, p_display_order integer)`, `save_question_secure(p_assessment_type_id uuid, p_axis_id uuid, p_question_text text, p_question_text_ar text, p_code character varying, p_question_type character varying, p_display_order integer, p_is_required boolean, p_trap_index integer)`, `start_assessment_session(p_access_token_hash text, p_assessment_user_id uuid, p_assessment_type_id uuid, p_lead_id uuid)`, `start_public_assessment_session(p_access_token_hash text, p_assessment_type_id uuid, p_lead_id uuid, p_attempt_key_hash text)`, `start_public_assessment_session(p_access_token_hash text, p_assessment_type_id uuid, p_lead_id uuid)`, `stop_public_assessment_secure(p_family_id uuid)`, `update_assessment_status_secure(p_id uuid, p_status text, p_is_active boolean)`, `update_assessment_working_copy_secure(p_id uuid, p_title_ar text, p_title_en text, p_description text, p_has_traps boolean, p_has_ev_simulator boolean)`, `update_draft_axis_content_secure(p_axis_id uuid, p_title text, p_title_ar text, p_description text)`, `update_draft_axis_secure(p_axis_id uuid, p_title text, p_title_ar text, p_description text, p_weight numeric, p_display_order integer)`, `update_draft_calculation_config_secure(p_id uuid, p_axis_roles jsonb, p_kpi_mappings jsonb, p_ev_mappings jsonb)`, `update_draft_option_secure(p_option_id uuid, p_label text, p_label_ar text, p_option_value numeric, p_option_index integer, p_display_order integer, p_is_trap boolean, p_display_text text, p_display_text_ar text)`, `update_draft_question_secure(p_question_id uuid, p_question_text text, p_question_text_ar text, p_axis_id uuid, p_display_order integer, p_is_required boolean, p_trap_index integer)`, `update_draft_question_text_secure(p_question_id uuid, p_question_text text, p_question_text_ar text)`, `update_option_secure(p_option_id uuid, p_label_ar text, p_option_value integer)`, `update_published_assessment_content_secure(p_id uuid, p_title_ar text, p_title_en text, p_description text)`, `update_published_axis_content_secure(p_axis_id uuid, p_title text, p_title_ar text, p_description text)`, `update_published_option_text_secure(p_option_id uuid, p_label text, p_label_ar text, p_display_text text, p_display_text_ar text)`, `update_published_question_text_secure(p_question_id uuid, p_question_text text, p_question_text_ar text)`, `validate_assessment_version_secure(p_version_id uuid)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `assets/js/app.js`, `admin/assessment-manager.js`, `admin/assessment-editor-workspace.js`, `supabase/functions/assessment-access/index.ts`, `supabase/functions/assessment-access/engine.ts`
- **Initial CREATE TABLE provenance:** no initial persistent `CREATE TABLE` found after inspecting all 56 tracked migration files on the pinned `main` tree. The gap within tracked repository history is confirmed; an authoritative external/original schema source remains unverified.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`, `supabase/migrations/20261001100833_p2_admin_status_guard.sql`, `supabase/migrations/20261002161455_p3_production_implementation.sql`, `supabase/migrations/20261003175601_p5_working_copy_stable_family_slug.sql`, `supabase/migrations/20261003174838_p5_admin_assistant_management.sql`, `supabase/migrations/20261004115737_p5_lifecycle_immutability_compat.sql`, `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.assessment_users`

- **Exact live row count (2026-10-20, read-only):** 0.
- **Live columns (9):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `assessment_key text`; `username text NOT NULL`; `password_hash text NOT NULL`; `max_uses integer DEFAULT 1`; `used_count integer DEFAULT 0`; `expires_at timestamp with time zone`; `active boolean DEFAULT true`; `created_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `assessment_users_assessment_key_fkey: FOREIGN KEY (assessment_key) REFERENCES assessment_settings(assessment_key) ON DELETE CASCADE`; `assessment_users_pkey: PRIMARY KEY (id)`
- **Indexes:** `assessment_users_pkey: CREATE UNIQUE INDEX assessment_users_pkey ON public.assessment_users USING btree (id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (4):** `Service role full access assessment_users [ALL TO service_role] USING=true CHECK=true`; `anon_read_assessment_users [SELECT TO anon] USING=true CHECK=-`; `anon_update_assessment_users [UPDATE TO anon] USING=true CHECK=true`; `service_all_assessment_users [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** `complete_assessment_session(p_session_id uuid, p_assessment_user_id uuid, p_overall_score numeric, p_classification text, p_score_rows jsonb)`, `complete_p3_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p4_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `generate_assessment_user_secure(p_slug text, p_username text, p_password_hash text, p_max_uses integer, p_expiry_days integer)`, `start_assessment_session(p_access_token_hash text, p_assessment_user_id uuid, p_assessment_type_id uuid, p_lead_id uuid)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `supabase/functions/assessment-access/index.ts`
- **Initial CREATE TABLE provenance:** no initial persistent `CREATE TABLE` found after inspecting all 56 tracked migration files on the pinned `main` tree. The gap within tracked repository history is confirmed; an authoritative external/original schema source remains unverified.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql`, `supabase/migrations/20261003170912_p5_admin_architecture.sql`, `supabase/migrations/20261002161455_p3_production_implementation.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.axes`

- **Exact live row count (2026-10-20, read-only):** 22.
- **Live columns (11):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `assessment_type_id uuid NOT NULL`; `code character varying(10) NOT NULL`; `title character varying(255) NOT NULL`; `title_ar character varying(255)`; `description text`; `weight numeric(5,2) NOT NULL DEFAULT 0.00`; `display_order integer NOT NULL DEFAULT 0`; `status character varying(20) DEFAULT 'active'::character varying`; `created_at timestamp with time zone DEFAULT now()`; `updated_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `axes_assessment_type_id_code_key: UNIQUE (assessment_type_id, code)`; `axes_assessment_type_id_fkey: FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id) ON DELETE CASCADE`; `axes_pkey: PRIMARY KEY (id)`
- **Indexes:** `axes_assessment_type_id_code_key: CREATE UNIQUE INDEX axes_assessment_type_id_code_key ON public.axes USING btree (assessment_type_id, code)`; `axes_pkey: CREATE UNIQUE INDEX axes_pkey ON public.axes USING btree (id)`; `idx_axes_assessment: CREATE INDEX idx_axes_assessment ON public.axes USING btree (assessment_type_id)`; `idx_axes_code: CREATE INDEX idx_axes_code ON public.axes USING btree (code)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (5):** `Allow all on axes [ALL TO anon,authenticated] USING=true CHECK=true`; `Allow public read access [SELECT TO public] USING=true CHECK=-`; `anon_select_axes [SELECT TO anon] USING=(assessment_type_id IN ( SELECT assessment_types.id    FROM assessment_types   WHERE ((assessment_types.status)::text = 'published'::text))) CHECK=-`; `p0_admin_select_axes [SELECT TO authenticated] USING=is_active_admin(( SELECT auth.uid() AS uid)) CHECK=-`; `service_all_axes [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** `p2_axes_immutable: CREATE TRIGGER p2_axes_immutable BEFORE INSERT OR DELETE OR UPDATE ON public.axes FOR EACH ROW EXECUTE FUNCTION p2_assert_draft_version('direct')`; `update_axes_updated_at: CREATE TRIGGER update_axes_updated_at BEFORE UPDATE ON public.axes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
- **Stored functions with table-name text match:** `complete_p4_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_public_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_submission_fingerprint text, p_result jsonb)`, `create_assessment_version_secure(p_source_version_id uuid)`, `delete_assessment_draft_secure(p_id uuid)`, `delete_draft_axis_secure(p_axis_id uuid)`, `duplicate_assessment(source_id uuid)`, `duplicate_assessment_secure(p_id uuid, p_clone_slug text)`, `import_assessment_secure(p_data jsonb)`, `p2_assert_draft_version()`, `save_axis_secure(p_assessment_type_id uuid, p_title text, p_title_ar text, p_code character varying, p_weight numeric, p_display_order integer)`, `save_question_secure(p_assessment_type_id uuid, p_axis_id uuid, p_question_text text, p_question_text_ar text, p_code character varying, p_question_type character varying, p_display_order integer, p_is_required boolean, p_trap_index integer)`, `update_draft_axis_content_secure(p_axis_id uuid, p_title text, p_title_ar text, p_description text)`, `update_draft_axis_secure(p_axis_id uuid, p_title text, p_title_ar text, p_description text, p_weight numeric, p_display_order integer)`, `update_draft_calculation_config_secure(p_id uuid, p_axis_roles jsonb, p_kpi_mappings jsonb, p_ev_mappings jsonb)`, `update_draft_question_secure(p_question_id uuid, p_question_text text, p_question_text_ar text, p_axis_id uuid, p_display_order integer, p_is_required boolean, p_trap_index integer)`, `update_published_axis_content_secure(p_axis_id uuid, p_title text, p_title_ar text, p_description text)`, `validate_assessment_version_secure(p_version_id uuid)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `assets/js/app.js`, `admin/assessment-manager.js`, `admin/assessment-editor-workspace.js`, `supabase/functions/assessment-access/index.ts`, `supabase/functions/assessment-access/engine.ts`, `assets/js/report-interpretation.js`, `assets/js/report-validation.js`
- **Initial CREATE TABLE provenance:** no initial persistent `CREATE TABLE` found after inspecting all 56 tracked migration files on the pinned `main` tree. The gap within tracked repository history is confirmed; an authoritative external/original schema source remains unverified.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`, `supabase/migrations/20261001101014_p2_immutability_trigger_fix.sql`, `supabase/migrations/20261003175220_p5_working_copy_deep_copy_and_legacy_write_lock.sql`, `supabase/migrations/20261009164918_canonical_axis_weights.sql`, `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.experience_multipliers`

- **Exact live row count (2026-10-20, read-only):** 4.
- **Live columns (7):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `years_range text NOT NULL`; `years_min integer`; `years_max integer`; `multiplier real NOT NULL DEFAULT 1.0`; `label_ar text NOT NULL`; `label_en text NOT NULL`
- **Constraints / relationships:** `experience_multipliers_pkey: PRIMARY KEY (id)`; `experience_multipliers_years_range_key: UNIQUE (years_range)`
- **Indexes:** `experience_multipliers_pkey: CREATE UNIQUE INDEX experience_multipliers_pkey ON public.experience_multipliers USING btree (id)`; `experience_multipliers_years_range_key: CREATE UNIQUE INDEX experience_multipliers_years_range_key ON public.experience_multipliers USING btree (years_range)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (0):** No policy row returned for this table.
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** No text match in public function bodies found by this query; this is not proof of no dependency.
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** No match in sampled files. This is not proof of no caller.
- **Initial CREATE TABLE provenance:** no initial persistent `CREATE TABLE` found after inspecting all 56 tracked migration files on the pinned `main` tree. The gap within tracked repository history is confirmed; an authoritative external/original schema source remains unverified.
- **Migration files with known references / changes found in targeted searches:** No specific migration path identified by targeted search; requires exhaustive migration-file scan.
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.historical_snapshots`

- **Exact live row count (2026-10-20, read-only):** 0.
- **Live columns (5):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `session_id uuid NOT NULL`; `assessment_type_id uuid NOT NULL`; `snapshot_data jsonb NOT NULL`; `created_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `historical_snapshots_pkey: PRIMARY KEY (id)`; `historical_snapshots_session_id_fkey: FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE`
- **Indexes:** `historical_snapshots_pkey: CREATE UNIQUE INDEX historical_snapshots_pkey ON public.historical_snapshots USING btree (id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (1):** `service_all_snapshots [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** No text match in public function bodies found by this query; this is not proof of no dependency.
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** No match in sampled files. This is not proof of no caller.
- **Initial CREATE TABLE provenance:** no initial persistent `CREATE TABLE` found after inspecting all 56 tracked migration files on the pinned `main` tree. The gap within tracked repository history is confirmed; an authoritative external/original schema source remains unverified.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.insights_mapping`

- **Exact live row count (2026-10-20, read-only):** 0.
- **Live columns (15):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `assessment_type_id uuid`; `insight_code character varying(50) NOT NULL`; `severity character varying(20) DEFAULT 'info'::character varying`; `title character varying(255) NOT NULL`; `title_ar character varying(255)`; `message text NOT NULL`; `message_ar text`; `recommendation text`; `recommendation_ar text`; `category character varying(50)`; `display_order integer DEFAULT 0`; `is_active boolean DEFAULT true`; `created_at timestamp with time zone DEFAULT now()`; `updated_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `insights_mapping_assessment_type_id_fkey: FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id) ON DELETE CASCADE`; `insights_mapping_assessment_type_id_insight_code_key: UNIQUE (assessment_type_id, insight_code)`; `insights_mapping_pkey: PRIMARY KEY (id)`
- **Indexes:** `idx_insights_assessment: CREATE INDEX idx_insights_assessment ON public.insights_mapping USING btree (assessment_type_id)`; `idx_insights_code: CREATE INDEX idx_insights_code ON public.insights_mapping USING btree (insight_code)`; `insights_mapping_assessment_type_id_insight_code_key: CREATE UNIQUE INDEX insights_mapping_assessment_type_id_insight_code_key ON public.insights_mapping USING btree (assessment_type_id, insight_code)`; `insights_mapping_pkey: CREATE UNIQUE INDEX insights_mapping_pkey ON public.insights_mapping USING btree (id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (2):** `anon_select_insights [SELECT TO anon] USING=((assessment_type_id IN ( SELECT assessment_types.id    FROM assessment_types   WHERE ((assessment_types.status)::text = 'published'::text))) OR (assessment_type_id IS NULL)) CHECK=-`; `service_all_insights [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** `p2_insights_mapping_immutable: CREATE TRIGGER p2_insights_mapping_immutable BEFORE INSERT OR DELETE OR UPDATE ON public.insights_mapping FOR EACH ROW EXECUTE FUNCTION p2_assert_draft_version('direct')`; `update_insights_updated_at: CREATE TRIGGER update_insights_updated_at BEFORE UPDATE ON public.insights_mapping FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
- **Stored functions with table-name text match:** `create_assessment_version_secure(p_source_version_id uuid)`, `delete_assessment_draft_secure(p_id uuid)`, `duplicate_assessment(source_id uuid)`, `p2_assert_draft_version()`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** No match in sampled files. This is not proof of no caller.
- **Initial CREATE TABLE provenance:** no initial persistent `CREATE TABLE` found after inspecting all 56 tracked migration files on the pinned `main` tree. The gap within tracked repository history is confirmed; an authoritative external/original schema source remains unverified.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`, `supabase/migrations/20261003175220_p5_working_copy_deep_copy_and_legacy_write_lock.sql`, `supabase/migrations/20261004102003_p5_delete_draft_cascade_fix_2026_10_04.sql`, `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.leads`

- **Exact live row count (2026-10-20, read-only):** 0.
- **Live columns (20):** `id uuid NOT NULL DEFAULT uuid_generate_v4()`; `assessment_type_id uuid`; `full_name text NOT NULL`; `email text`; `phone text`; `clinic_name text`; `country text DEFAULT 'JO'::text`; `source text DEFAULT 'website'::text`; `utm_campaign text`; `completed boolean DEFAULT false`; `score_total integer DEFAULT 0`; `score_percentage numeric(5,2) DEFAULT 0`; `created_at timestamp with time zone DEFAULT now()`; `completed_at timestamp with time zone`; `specialty text`; `years text`; `team text`; `ev_current integer`; `ev_potential integer`; `ev_gap integer`
- **Constraints / relationships:** `leads_assessment_type_id_fkey: FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id)`; `leads_pkey: PRIMARY KEY (id)`
- **Indexes:** `idx_leads_assessment: CREATE INDEX idx_leads_assessment ON public.leads USING btree (assessment_type_id)`; `idx_leads_email: CREATE INDEX idx_leads_email ON public.leads USING btree (email)`; `leads_pkey: CREATE UNIQUE INDEX leads_pkey ON public.leads USING btree (id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (8):** `Allow anon insert leads [INSERT TO anon] USING=- CHECK=true`; `Allow anon update leads [UPDATE TO anon] USING=true CHECK=true`; `Service role full access leads [ALL TO service_role] USING=true CHECK=true`; `anon_insert_leads [INSERT TO anon] USING=- CHECK=true`; `leads_owner_read [SELECT TO public] USING=true CHECK=-`; `leads_public_insert [INSERT TO public] USING=- CHECK=true`; `p0_admin_select_leads [SELECT TO authenticated] USING=is_active_admin(( SELECT auth.uid() AS uid)) CHECK=-`; `service_all_leads [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** `check_assessment_leads_secure(p_assessment_id uuid)`, `complete_assessment_session(p_session_id uuid, p_assessment_user_id uuid, p_overall_score numeric, p_classification text, p_score_rows jsonb)`, `complete_p3_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p3_public_assessment_session(p_session_id uuid, p_access_token_hash text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p4_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p4_public_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_public_assessment_session(p_session_id uuid, p_access_token_hash text, p_submission_fingerprint text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_public_assessment_session(p_session_id uuid, p_score_rows jsonb, p_overall_score numeric, p_classification text)`, `delete_assessment_draft_secure(p_id uuid)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `assets/js/app.js`, `admin/assessment-manager.js`, `supabase/functions/assessment-access/index.ts`
- **Initial CREATE TABLE provenance:** no initial persistent `CREATE TABLE` found after inspecting all 56 tracked migration files on the pinned `main` tree. The gap within tracked repository history is confirmed; an authoritative external/original schema source remains unverified.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql`, `supabase/migrations/20261001190000_p0_security_closure.sql`, `supabase/migrations/20261002161455_p3_production_implementation.sql`, `supabase/migrations/20261003082603_20261003093000_p4_submission_prepare_finalize.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.options`

- **Exact live row count (2026-10-20, read-only):** 370.
- **Live columns (11):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `question_id uuid NOT NULL`; `option_index integer NOT NULL`; `option_value integer NOT NULL`; `label character varying(255) NOT NULL`; `label_ar character varying(255)`; `display_text text`; `display_text_ar text`; `is_trap boolean DEFAULT false`; `display_order integer NOT NULL DEFAULT 0`; `created_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `options_pkey: PRIMARY KEY (id)`; `options_question_id_fkey: FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE`; `options_question_id_option_index_key: UNIQUE (question_id, option_index)`
- **Indexes:** `idx_options_index: CREATE INDEX idx_options_index ON public.options USING btree (question_id, option_index)`; `idx_options_question: CREATE INDEX idx_options_question ON public.options USING btree (question_id)`; `options_pkey: CREATE UNIQUE INDEX options_pkey ON public.options USING btree (id)`; `options_question_id_option_index_key: CREATE UNIQUE INDEX options_question_id_option_index_key ON public.options USING btree (question_id, option_index)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (4):** `Allow public read access [SELECT TO public] USING=true CHECK=-`; `anon_select_options [SELECT TO anon] USING=(question_id IN ( SELECT questions.id    FROM questions   WHERE (questions.assessment_type_id IN ( SELECT assessment_types.id            FROM assessment_types           WHERE ((assessment_types.status)::text = 'published'::text))))) CHECK=-`; `p0_admin_select_options [SELECT TO authenticated] USING=is_active_admin(( SELECT auth.uid() AS uid)) CHECK=-`; `service_all_options [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** `p2_options_immutable: CREATE TRIGGER p2_options_immutable BEFORE INSERT OR DELETE OR UPDATE ON public.options FOR EACH ROW EXECUTE FUNCTION p2_assert_draft_version('option')`
- **Stored functions with table-name text match:** `add_option_secure(p_question_id uuid, p_label_ar text, p_label text, p_option_value integer, p_option_index integer, p_display_order integer, p_is_trap boolean)`, `create_assessment_version_secure(p_source_version_id uuid)`, `delete_option_secure(p_option_id uuid)`, `duplicate_assessment(source_id uuid)`, `duplicate_assessment_secure(p_id uuid, p_clone_slug text)`, `get_public_assessment_options_secure(p_assessment_type_id uuid)`, `import_assessment_secure(p_data jsonb)`, `p2_assert_draft_version()`, `save_assessment_answer(p_access_token_hash text, p_question_id text, p_option_index integer, p_current_question integer)`, `save_option_secure(p_question_id uuid, p_option_index integer, p_option_value integer, p_label text, p_label_ar text, p_display_text text, p_display_text_ar text, p_is_trap boolean, p_display_order integer)`, `update_draft_option_secure(p_option_id uuid, p_label text, p_label_ar text, p_option_value numeric, p_option_index integer, p_display_order integer, p_is_trap boolean, p_display_text text, p_display_text_ar text)`, `update_option_secure(p_option_id uuid, p_label_ar text, p_option_value integer)`, `update_option_secure(p_id uuid, p_label text, p_label_ar text, p_option_value integer, p_is_trap boolean, p_display_order integer)`, `update_published_option_text_secure(p_option_id uuid, p_label text, p_label_ar text, p_display_text text, p_display_text_ar text)`, `validate_assessment_version_secure(p_version_id uuid)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `assets/js/app.js`, `admin/assessment-manager.js`, `admin/assessment-editor-workspace.js`, `supabase/functions/assessment-access/index.ts`, `supabase/functions/assessment-access/engine.ts`, `supabase/functions/assessment-config-release/index.ts`, `supabase/functions/admin-management/index.ts`
- **Initial CREATE TABLE provenance:** no initial persistent `CREATE TABLE` found after inspecting all 56 tracked migration files on the pinned `main` tree. The gap within tracked repository history is confirmed; an authoritative external/original schema source remains unverified.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`, `supabase/migrations/20261001190000_p0_security_closure.sql`, `supabase/migrations/20261003171050_p5_admin_canonical_import_and_audit.sql`, `supabase/migrations/20261003224353_p5_published_content_edit_lifecycle.sql`, `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.questions`

- **Exact live row count (2026-10-20, read-only):** 93.
- **Live columns (16):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `axis_id uuid NOT NULL`; `assessment_type_id uuid NOT NULL`; `code character varying(20) NOT NULL`; `question_text text NOT NULL`; `question_text_ar text`; `question_type character varying(50) DEFAULT 'likert'::character varying`; `display_order integer NOT NULL DEFAULT 0`; `is_required boolean DEFAULT true`; `trap_index integer`; `status character varying(20) DEFAULT 'active'::character varying`; `created_at timestamp with time zone DEFAULT now()`; `updated_at timestamp with time zone DEFAULT now()`; `impact text DEFAULT 'medium'::text`; `layer text DEFAULT 'A'::text`; `trap_for jsonb DEFAULT '[]'::jsonb`
- **Constraints / relationships:** `questions_assessment_type_id_fkey: FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id) ON DELETE CASCADE`; `questions_axis_id_code_key: UNIQUE (axis_id, code)`; `questions_axis_id_fkey: FOREIGN KEY (axis_id) REFERENCES axes(id) ON DELETE CASCADE`; `questions_pkey: PRIMARY KEY (id)`
- **Indexes:** `idx_questions_assessment: CREATE INDEX idx_questions_assessment ON public.questions USING btree (assessment_type_id)`; `idx_questions_axis: CREATE INDEX idx_questions_axis ON public.questions USING btree (axis_id)`; `questions_axis_id_code_key: CREATE UNIQUE INDEX questions_axis_id_code_key ON public.questions USING btree (axis_id, code)`; `questions_pkey: CREATE UNIQUE INDEX questions_pkey ON public.questions USING btree (id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (4):** `Allow public read access [SELECT TO public] USING=true CHECK=-`; `anon_select_questions [SELECT TO anon] USING=(assessment_type_id IN ( SELECT assessment_types.id    FROM assessment_types   WHERE ((assessment_types.status)::text = 'published'::text))) CHECK=-`; `p0_admin_select_questions [SELECT TO authenticated] USING=is_active_admin(( SELECT auth.uid() AS uid)) CHECK=-`; `service_all_questions [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** `p2_questions_immutable: CREATE TRIGGER p2_questions_immutable BEFORE INSERT OR DELETE OR UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION p2_assert_draft_version('direct')`; `update_questions_updated_at: CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
- **Stored functions with table-name text match:** `add_option_secure(p_question_id uuid, p_label_ar text, p_label text, p_option_value integer, p_option_index integer, p_display_order integer, p_is_trap boolean)`, `create_assessment_version_secure(p_source_version_id uuid)`, `delete_assessment_draft_secure(p_id uuid)`, `delete_draft_axis_secure(p_axis_id uuid)`, `delete_draft_question_secure(p_question_id uuid)`, `delete_option_secure(p_option_id uuid)`, `duplicate_assessment(source_id uuid)`, `duplicate_assessment_secure(p_id uuid, p_clone_slug text)`, `get_public_assessment_options_secure(p_assessment_type_id uuid)`, `import_assessment_secure(p_data jsonb)`, `p2_assert_draft_version()`, `prepare_assessment_submission(p_session_id uuid, p_access_token_hash text)`, `prepare_assessment_submission(p_session_id uuid, p_access_token_hash text, p_economic_input jsonb)`, `save_assessment_answer(p_access_token_hash text, p_question_id text, p_option_index integer, p_current_question integer)`, `save_question_secure(p_assessment_type_id uuid, p_axis_id uuid, p_question_text text, p_question_text_ar text, p_code character varying, p_question_type character varying, p_display_order integer, p_is_required boolean, p_trap_index integer)`, `update_draft_option_secure(p_option_id uuid, p_label text, p_label_ar text, p_option_value numeric, p_option_index integer, p_display_order integer, p_is_trap boolean, p_display_text text, p_display_text_ar text)`, `update_draft_question_secure(p_question_id uuid, p_question_text text, p_question_text_ar text, p_axis_id uuid, p_display_order integer, p_is_required boolean, p_trap_index integer)`, `update_draft_question_text_secure(p_question_id uuid, p_question_text text, p_question_text_ar text)`, `update_option_secure(p_option_id uuid, p_label_ar text, p_option_value integer)`, `update_published_option_text_secure(p_option_id uuid, p_label text, p_label_ar text, p_display_text text, p_display_text_ar text)`, `update_published_question_text_secure(p_question_id uuid, p_question_text text, p_question_text_ar text)`, `validate_assessment_version_secure(p_version_id uuid)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `assets/js/app.js`, `admin/assessment-manager.js`, `admin/assessment-editor-workspace.js`, `supabase/functions/assessment-access/index.ts`, `supabase/functions/assessment-access/engine.ts`
- **Initial CREATE TABLE provenance:** no initial persistent `CREATE TABLE` found after inspecting all 56 tracked migration files on the pinned `main` tree. The gap within tracked repository history is confirmed; an authoritative external/original schema source remains unverified.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`, `supabase/migrations/20261001190000_p0_security_closure.sql`, `supabase/migrations/20261003171050_p5_admin_canonical_import_and_audit.sql`, `supabase/migrations/20261003175220_p5_working_copy_deep_copy_and_legacy_write_lock.sql`, `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.scores`

- **Exact live row count (2026-10-20, read-only):** 0.
- **Live columns (13):** `id uuid NOT NULL DEFAULT uuid_generate_v4()`; `session_id uuid`; `lead_id uuid`; `axis_id text NOT NULL`; `axis_name_ar text`; `axis_name_en text`; `raw_score integer DEFAULT 0`; `max_possible integer DEFAULT 0`; `percentage numeric(5,2) DEFAULT 0`; `weight numeric(5,2) DEFAULT 1.00`; `weighted_score numeric(10,2) DEFAULT 0`; `grade text`; `created_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `scores_lead_id_fkey: FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE`; `scores_pkey: PRIMARY KEY (id)`; `scores_session_id_fkey: FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE`
- **Indexes:** `idx_scores_session: CREATE INDEX idx_scores_session ON public.scores USING btree (session_id)`; `scores_pkey: CREATE UNIQUE INDEX scores_pkey ON public.scores USING btree (id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (7):** `Allow anon insert scores [INSERT TO anon] USING=- CHECK=true`; `Service role full access scores [ALL TO service_role] USING=true CHECK=true`; `anon_insert_scores [INSERT TO anon] USING=- CHECK=true`; `p0_admin_select_scores [SELECT TO authenticated] USING=is_active_admin(( SELECT auth.uid() AS uid)) CHECK=-`; `scores_public_insert [INSERT TO public] USING=- CHECK=true`; `scores_public_select [SELECT TO public] USING=true CHECK=-`; `service_all_scores [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** `complete_assessment_session(p_session_id uuid, p_assessment_user_id uuid, p_overall_score numeric, p_classification text, p_score_rows jsonb)`, `complete_p3_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p3_public_assessment_session(p_session_id uuid, p_access_token_hash text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p4_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p4_public_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_public_assessment_session(p_session_id uuid, p_access_token_hash text, p_submission_fingerprint text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_public_assessment_session(p_session_id uuid, p_score_rows jsonb, p_overall_score numeric, p_classification text)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `assets/js/app.js`, `admin/assessment-manager.js`, `supabase/functions/assessment-access/index.ts`, `assets/js/report-interpretation.js`, `assets/js/report-validation.js`
- **Initial CREATE TABLE provenance:** no initial persistent `CREATE TABLE` found after inspecting all 56 tracked migration files on the pinned `main` tree. The gap within tracked repository history is confirmed; an authoritative external/original schema source remains unverified.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001190000_p0_security_closure.sql`, `supabase/migrations/20261002161455_p3_production_implementation.sql`, `supabase/migrations/20261002161945_p3_preserve_completion_access_v2.sql`, `supabase/migrations/20261003082603_20261003093000_p4_submission_prepare_finalize.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.sessions`

- **Exact live row count (2026-10-20, read-only):** 0.
- **Live columns (25):** `id uuid NOT NULL DEFAULT uuid_generate_v4()`; `lead_id uuid`; `assessment_type_id uuid`; `status text DEFAULT 'in_progress'::text`; `current_question integer DEFAULT 1`; `started_at timestamp with time zone DEFAULT now()`; `completed_at timestamp with time zone`; `duration_seconds integer DEFAULT 0`; `ip_address inet`; `user_agent text`; `assessment_user_id uuid`; `usage_consumed_at timestamp with time zone`; `assessment_version integer`; `scoring_engine_version text`; `interpretation_version integer`; `scoring_contract_version text`; `assessment_config_digest text`; `submission_state text NOT NULL DEFAULT 'draft'::text`; `submission_snapshot jsonb`; `submission_fingerprint text`; `submission_started_at timestamp with time zone`; `last_activity_at timestamp with time zone`; `attempt_key_hash text`; `submission_economic_input jsonb`; `assessment_release_id uuid`
- **Constraints / relationships:** `sessions_assessment_release_id_fkey: FOREIGN KEY (assessment_release_id) REFERENCES assessment_config_releases(id) ON DELETE RESTRICT`; `sessions_assessment_type_id_fkey: FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id)`; `sessions_assessment_user_id_fkey: FOREIGN KEY (assessment_user_id) REFERENCES assessment_users(id) ON DELETE SET NULL`; `sessions_lead_id_fkey: FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE`; `sessions_pkey: PRIMARY KEY (id)`; `sessions_submission_state_check: CHECK ((submission_state = ANY (ARRAY['draft'::text, 'processing'::text, 'completed'::text])))`
- **Indexes:** `idx_sessions_assessment: CREATE INDEX idx_sessions_assessment ON public.sessions USING btree (assessment_type_id)`; `idx_sessions_lead: CREATE INDEX idx_sessions_lead ON public.sessions USING btree (lead_id)`; `sessions_active_attempt_key_uidx: CREATE UNIQUE INDEX sessions_active_attempt_key_uidx ON public.sessions USING btree (assessment_type_id, attempt_key_hash) WHERE ((attempt_key_hash IS NOT NULL) AND (status = 'in_progress'::text))`; `sessions_assessment_release_id_idx: CREATE INDEX sessions_assessment_release_id_idx ON public.sessions USING btree (assessment_release_id) WHERE (assessment_release_id IS NOT NULL)`; `sessions_assessment_user_id_idx: CREATE INDEX sessions_assessment_user_id_idx ON public.sessions USING btree (assessment_user_id)`; `sessions_assessment_user_status_idx: CREATE INDEX sessions_assessment_user_status_idx ON public.sessions USING btree (assessment_user_id, assessment_type_id, status, started_at DESC)`; `sessions_assessment_version_idx: CREATE INDEX sessions_assessment_version_idx ON public.sessions USING btree (assessment_type_id, assessment_version)`; `sessions_attempt_lookup_idx: CREATE INDEX sessions_attempt_lookup_idx ON public.sessions USING btree (assessment_type_id, attempt_key_hash) WHERE (attempt_key_hash IS NOT NULL)`; `sessions_pkey: CREATE UNIQUE INDEX sessions_pkey ON public.sessions USING btree (id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (7):** `Allow anon insert sessions [INSERT TO anon] USING=- CHECK=true`; `Allow anon update sessions [UPDATE TO anon] USING=true CHECK=true`; `Service role full access sessions [ALL TO service_role] USING=true CHECK=true`; `anon_insert_sessions [INSERT TO anon] USING=- CHECK=true`; `service_all_sessions [ALL TO service_role] USING=true CHECK=true`; `sessions_public_insert [INSERT TO public] USING=- CHECK=true`; `sessions_public_select [SELECT TO public] USING=true CHECK=-`
- **Triggers:** `c03_pin_session_release: CREATE TRIGGER c03_pin_session_release BEFORE INSERT ON public.sessions FOR EACH ROW EXECUTE FUNCTION c03_pin_session_release()`
- **Stored functions with table-name text match:** `complete_assessment_session(p_session_id uuid, p_assessment_user_id uuid, p_overall_score numeric, p_classification text, p_score_rows jsonb)`, `complete_p3_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p3_public_assessment_session(p_session_id uuid, p_access_token_hash text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p4_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p4_public_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_public_assessment_session(p_session_id uuid, p_access_token_hash text, p_submission_fingerprint text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_public_assessment_session(p_session_id uuid, p_score_rows jsonb, p_overall_score numeric, p_classification text)`, `delete_assessment_draft_secure(p_id uuid)`, `get_admin_assessment_session_counts_secure()`, `get_admin_report_sessions_secure(p_lead_id uuid)`, `prepare_assessment_submission(p_session_id uuid, p_access_token_hash text)`, `prepare_assessment_submission(p_session_id uuid, p_access_token_hash text, p_economic_input jsonb)`, `save_assessment_answer(p_access_token_hash text, p_question_id text, p_option_index integer, p_current_question integer)`, `start_assessment_session(p_access_token_hash text, p_assessment_user_id uuid, p_assessment_type_id uuid, p_lead_id uuid)`, `start_public_assessment_session(p_access_token_hash text, p_assessment_type_id uuid, p_lead_id uuid)`, `start_public_assessment_session(p_access_token_hash text, p_assessment_type_id uuid, p_lead_id uuid, p_attempt_key_hash text)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `assets/js/app.js`, `admin/assessment-manager.js`, `supabase/functions/assessment-access/index.ts`, `supabase/functions/assessment-access/engine.ts`
- **Initial CREATE TABLE provenance:** no initial persistent `CREATE TABLE` found after inspecting all 56 tracked migration files on the pinned `main` tree. The gap within tracked repository history is confirmed; an authoritative external/original schema source remains unverified.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql`, `supabase/migrations/20261001190000_p0_security_closure.sql`, `supabase/migrations/20261002161455_p3_production_implementation.sql`, `supabase/migrations/20261003082558_20261003090000_p4_submission_foundation.sql`, `supabase/migrations/20261003084304_20261003103000_p4_submission_context_lock.sql`, `supabase/migrations/20261015120000_c03_github_oidc_release_authorization.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.specialty_profiles`

- **Exact live row count (2026-10-20, read-only):** 7.
- **Live columns (13):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `specialty_key text NOT NULL`; `specialty_name_ar text NOT NULL`; `specialty_name_en text NOT NULL`; `default_avg_visit real NOT NULL DEFAULT 50`; `default_visits_per_year real NOT NULL DEFAULT 4`; `default_years_relationship real NOT NULL DEFAULT 5`; `default_referral_rate real NOT NULL DEFAULT 10`; `specialty_multiplier real NOT NULL DEFAULT 1.0`; `team_capacity_factor real NOT NULL DEFAULT 1.0`; `description_ar text`; `created_at timestamp with time zone DEFAULT now()`; `updated_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `specialty_profiles_pkey: PRIMARY KEY (id)`; `specialty_profiles_specialty_key_key: UNIQUE (specialty_key)`
- **Indexes:** `specialty_profiles_pkey: CREATE UNIQUE INDEX specialty_profiles_pkey ON public.specialty_profiles USING btree (id)`; `specialty_profiles_specialty_key_key: CREATE UNIQUE INDEX specialty_profiles_specialty_key_key ON public.specialty_profiles USING btree (specialty_key)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (0):** No policy row returned for this table.
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** No text match in public function bodies found by this query; this is not proof of no dependency.
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** No match in sampled files. This is not proof of no caller.
- **Initial CREATE TABLE provenance:** no initial persistent `CREATE TABLE` found after inspecting all 56 tracked migration files on the pinned `main` tree. The gap within tracked repository history is confirmed; an authoritative external/original schema source remains unverified.
- **Migration files with known references / changes found in targeted searches:** No specific migration path identified by targeted search; requires exhaustive migration-file scan.
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.team_capacity_factors`

- **Exact live row count (2026-10-20, read-only):** 4.
- **Live columns (7):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `team_range text NOT NULL`; `team_min integer`; `team_max integer`; `capacity_factor real NOT NULL DEFAULT 1.0`; `label_ar text NOT NULL`; `label_en text NOT NULL`
- **Constraints / relationships:** `team_capacity_factors_pkey: PRIMARY KEY (id)`; `team_capacity_factors_team_range_key: UNIQUE (team_range)`
- **Indexes:** `team_capacity_factors_pkey: CREATE UNIQUE INDEX team_capacity_factors_pkey ON public.team_capacity_factors USING btree (id)`; `team_capacity_factors_team_range_key: CREATE UNIQUE INDEX team_capacity_factors_team_range_key ON public.team_capacity_factors USING btree (team_range)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (0):** No policy row returned for this table.
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** No text match in public function bodies found by this query; this is not proof of no dependency.
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** No match in sampled files. This is not proof of no caller.
- **Initial CREATE TABLE provenance:** no initial persistent `CREATE TABLE` found after inspecting all 56 tracked migration files on the pinned `main` tree. The gap within tracked repository history is confirmed; an authoritative external/original schema source remains unverified.
- **Migration files with known references / changes found in targeted searches:** No specific migration path identified by targeted search; requires exhaustive migration-file scan.
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.traps`

- **Exact live row count (2026-10-20, read-only):** 1.
- **Live columns (11):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `assessment_type_id uuid`; `name text`; `question_id text`; `validates text`; `target_axis text`; `penalty_base numeric`; `penalty_max numeric`; `message text`; `message_ar text`; `created_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `traps_assessment_type_id_fkey: FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id)`; `traps_pkey: PRIMARY KEY (id)`
- **Indexes:** `traps_pkey: CREATE UNIQUE INDEX traps_pkey ON public.traps USING btree (id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (0):** No policy row returned for this table.
- **Triggers:** `p2_traps_immutable: CREATE TRIGGER p2_traps_immutable BEFORE INSERT OR DELETE OR UPDATE ON public.traps FOR EACH ROW EXECUTE FUNCTION p2_assert_draft_version('direct')`
- **Stored functions with table-name text match:** `create_assessment_secure(p_slug text, p_title_ar text, p_title_en text, p_description text, p_has_traps boolean, p_has_ev_simulator boolean)`, `create_assessment_version_secure(p_source_version_id uuid)`, `delete_assessment_draft_secure(p_id uuid)`, `delete_draft_axis_secure(p_axis_id uuid)`, `delete_draft_question_secure(p_question_id uuid)`, `duplicate_assessment_secure(p_id uuid, p_clone_slug text)`, `import_assessment_secure(p_data jsonb)`, `p2_assert_draft_version()`, `p2_assessment_type_immutability()`, `save_assessment_secure(p_id uuid, p_title_ar text, p_title_en text, p_slug text, p_description text, p_status text, p_has_traps boolean, p_has_ev_simulator boolean)`, `update_assessment_working_copy_secure(p_id uuid, p_title_ar text, p_title_en text, p_description text, p_has_traps boolean, p_has_ev_simulator boolean)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `admin/assessment-manager.js`, `admin/assessment-editor-workspace.js`, `supabase/functions/assessment-access/index.ts`, `supabase/functions/assessment-access/engine.ts`, `assets/js/report-validation.js`
- **Initial CREATE TABLE provenance:** no initial persistent `CREATE TABLE` found after inspecting all 56 tracked migration files on the pinned `main` tree. The gap within tracked repository history is confirmed; an authoritative external/original schema source remains unverified.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`, `supabase/migrations/20261004102003_p5_delete_draft_cascade_fix_2026_10_04.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

## Review of the “18 tables” claim

### Candidate list from current tracked-migration search

The broad repository search for table-creation declarations located CREATE TABLE statements for the following seven live tables:

- `public.admin_audit_log` — `supabase/migrations/20261003170912_p5_admin_architecture.sql`
- `public.admin_capabilities` — `supabase/migrations/20261003170912_p5_admin_architecture.sql`
- `public.assessment_families` — `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`
- `public.assessment_results` — `supabase/migrations/20261002161455_p3_production_implementation.sql`
- `public.assessment_session_access` — `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql`
- `public.assessment_config_releases` — `supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql`
- `public.assessment_config_release_settings` — `supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql`

The remaining 18 live tables are therefore **candidates whose initial CREATE TABLE was not located in the search evidence**, not a final proof that no authoritative source exists:

- `public.admin_users` — no initial CREATE TABLE located by the targeted/broad tracked-migration searches used for this worksheet; live schema and later references exist where listed above; **OPEN** pending exhaustive file-level validation.
- `public.answers` — no initial CREATE TABLE located by the targeted/broad tracked-migration searches used for this worksheet; live schema and later references exist where listed above; **OPEN** pending exhaustive file-level validation.
- `public.assessment_assets` — no initial CREATE TABLE located by the targeted/broad tracked-migration searches used for this worksheet; live schema and later references exist where listed above; **OPEN** pending exhaustive file-level validation.
- `public.assessment_settings` — no initial CREATE TABLE located by the targeted/broad tracked-migration searches used for this worksheet; live schema and later references exist where listed above; **OPEN** pending exhaustive file-level validation.
- `public.assessment_types` — no initial CREATE TABLE located by the targeted/broad tracked-migration searches used for this worksheet; live schema and later references exist where listed above; **OPEN** pending exhaustive file-level validation.
- `public.assessment_users` — no initial CREATE TABLE located by the targeted/broad tracked-migration searches used for this worksheet; live schema and later references exist where listed above; **OPEN** pending exhaustive file-level validation.
- `public.axes` — no initial CREATE TABLE located by the targeted/broad tracked-migration searches used for this worksheet; live schema and later references exist where listed above; **OPEN** pending exhaustive file-level validation.
- `public.experience_multipliers` — no initial CREATE TABLE located by the targeted/broad tracked-migration searches used for this worksheet; live schema and later references exist where listed above; **OPEN** pending exhaustive file-level validation.
- `public.historical_snapshots` — no initial CREATE TABLE located by the targeted/broad tracked-migration searches used for this worksheet; live schema and later references exist where listed above; **OPEN** pending exhaustive file-level validation.
- `public.insights_mapping` — no initial CREATE TABLE located by the targeted/broad tracked-migration searches used for this worksheet; live schema and later references exist where listed above; **OPEN** pending exhaustive file-level validation.
- `public.leads` — no initial CREATE TABLE located by the targeted/broad tracked-migration searches used for this worksheet; live schema and later references exist where listed above; **OPEN** pending exhaustive file-level validation.
- `public.options` — no initial CREATE TABLE located by the targeted/broad tracked-migration searches used for this worksheet; live schema and later references exist where listed above; **OPEN** pending exhaustive file-level validation.
- `public.questions` — no initial CREATE TABLE located by the targeted/broad tracked-migration searches used for this worksheet; live schema and later references exist where listed above; **OPEN** pending exhaustive file-level validation.
- `public.scores` — no initial CREATE TABLE located by the targeted/broad tracked-migration searches used for this worksheet; live schema and later references exist where listed above; **OPEN** pending exhaustive file-level validation.
- `public.sessions` — no initial CREATE TABLE located by the targeted/broad tracked-migration searches used for this worksheet; live schema and later references exist where listed above; **OPEN** pending exhaustive file-level validation.
- `public.specialty_profiles` — no initial CREATE TABLE located by the targeted/broad tracked-migration searches used for this worksheet; live schema and later references exist where listed above; **OPEN** pending exhaustive file-level validation.
- `public.team_capacity_factors` — no initial CREATE TABLE located by the targeted/broad tracked-migration searches used for this worksheet; live schema and later references exist where listed above; **OPEN** pending exhaustive file-level validation.
- `public.traps` — no initial CREATE TABLE located by the targeted/broad tracked-migration searches used for this worksheet; live schema and later references exist where listed above; **OPEN** pending exhaustive file-level validation.

**Conclusion:** the number 18 is consistent with 25 live tables minus 7 table-creation declarations located by repository search. That arithmetic alone is not enough to close D-05. The list must be independently validated against every tracked migration file and any authoritative historical schema/source archive. A migration that alters or references a table is not its initial creation source, and an absent search hit is not conclusive proof of absence.

## Acceptance work still open

1. Exhaustively enumerate all tracked SQL migration files at the current `main` SHA and scan their full contents (not only indexed search excerpts) for CREATE TABLE, ALTER TABLE, DROP/RENAME, constraints, indexes, policies, grants, triggers, and function definitions for each of the 25 tables.
2. Reconcile each repository migration identity and SQL checksum/order with the live Supabase migration ledger; preserve the reported repository/live identity mismatch until exact rows and file content are reconciled.
3. Resolve each table's code callers through exact query sites/RPC calls and reachable Edge/admin/browser entrypoints; distinguish active code from tests, comments, historical docs, and dead paths.
4. Review function bodies and EXECUTE grants, trigger call graph, table grants, RLS policy semantics, and effective-role behavior. Current table-level RLS presence does not prove safe access.
5. Run read-only integrity checks for FK orphans, uniqueness/semantic mismatches, and exact row counts only where justified. Do not use planner estimates as row counts.
6. Locate the authoritative pre-migration schema/source archive, if one exists, and record provenance. Do not manufacture a baseline from production catalog output.
7. Keep D-05 and WP-11 OPEN until the evidence above is complete and reviewed. WP-12 is not started by this worksheet.

## Reproducibility notes

- Source file paths and current `main` source SHA values were fetched during this session; see the updated handoff for the exact commit and any remaining limitations.
- Function references in this worksheet are catalog text matches, not dependency-graph proof. PostgreSQL dependency metadata does not reliably capture all PL/pgSQL/dynamic SQL dependencies.
- Source references are sampled core files and should be expanded to all tracked source, test, workflow, and SQL files before calling the caller inventory exhaustive.


## Indexed repository-wide reference lists — 2026-10-19

The lists below preserve the results of per-table GitHub code-search queries. A migration hit means the table name appears in that migration file; it does **not** automatically mean the file creates or alters the table. Exact DDL effects still require reading the full file. A code hit means the indexed search found the name in the file; it does not alone prove a reachable runtime call. These lists make the source trail auditable and are intentionally not labelled exhaustive.

### Migration-file search hits by live table

#### `public.admin_audit_log`

- `supabase/migrations/20261003183952_p5_owner_audit_read_secure.sql`
- `supabase/migrations/20261003170912_p5_admin_architecture.sql`
- `supabase/migrations/20261003171123_p5_admin_security_hardening.sql`

#### `public.admin_capabilities`

- `supabase/migrations/20261003175429_p5_assistant_capability_dedup.sql`
- `supabase/migrations/20261003170948_p5_admin_capability_management.sql`
- `supabase/migrations/20261003174838_p5_admin_assistant_management.sql`
- `supabase/migrations/20261003170912_p5_admin_architecture.sql`
- `supabase/migrations/20261003200444_p5_fix_assistant_create_capability_alias.sql`
- `supabase/migrations/20261003171123_p5_admin_security_hardening.sql`

#### `public.admin_users`

- `supabase/migrations/20261001190000_p0_security_closure.sql`
- `supabase/migrations/20261003174838_p5_admin_assistant_management.sql`
- `supabase/migrations/20261003175429_p5_assistant_capability_dedup.sql`
- `supabase/migrations/20261003170948_p5_admin_capability_management.sql`
- `supabase/migrations/20261003183952_p5_owner_audit_read_secure.sql`
- `supabase/migrations/20261001061605_admin_dashboard_auth_hardening.sql`
- `supabase/migrations/20261003200444_p5_fix_assistant_create_capability_alias.sql`
- `supabase/migrations/20261003170912_p5_admin_architecture.sql`

#### `public.answers`

- `supabase/migrations/20261001083056_p1_e_fix_answers_upsert_conflict.sql`
- `supabase/migrations/20261001190000_p0_security_closure.sql`
- `supabase/migrations/20261013110000_c02_allow_answer_value_70.sql`
- `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql`
- `supabase/migrations/20261003084304_20261003103000_p4_submission_context_lock.sql`
- `supabase/migrations/20261003082558_20261003090000_p4_submission_foundation.sql`
- `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`
- `supabase/migrations/20261003082603_20261003093000_p4_submission_prepare_finalize.sql`

#### `public.assessment_assets`

- `supabase/migrations/20261001190000_p0_security_closure.sql`
- `supabase/migrations/20261001101014_p2_immutability_trigger_fix.sql`
- `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`
- `supabase/migrations/20261003175601_p5_working_copy_stable_family_slug.sql`
- `supabase/migrations/20261009164918_canonical_axis_weights.sql`
- `supabase/migrations/20261003175220_p5_working_copy_deep_copy_and_legacy_write_lock.sql`
- `supabase/migrations/20261004102003_p5_delete_draft_cascade_fix_2026_10_04.sql`
- `supabase/migrations/20261004074428_p5_draft_cascade_delete_trigger_fix_2026_10_04.sql`
- `supabase/migrations/20261003224353_p5_published_content_edit_lifecycle.sql`
- `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`

#### `public.assessment_config_release_settings`

- `supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql`
- `supabase/migrations/20261015120000_c03_github_oidc_release_authorization.sql`

#### `public.assessment_config_releases`

- `supabase/migrations/20261018110000_c03_verifier_api_key_compatibility.sql`
- `supabase/migrations/20261015120000_c03_github_oidc_release_authorization.sql`
- `supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql`

#### `public.assessment_families`

- `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`
- `supabase/migrations/20261003183952_p5_owner_audit_read_secure.sql`
- `supabase/migrations/20261003175645_p5_p2_immutability_lifecycle_compat.sql`
- `supabase/migrations/20261004115546_p5_public_visibility_option_allocation.sql`
- `supabase/migrations/20261003170912_p5_admin_architecture.sql`
- `supabase/migrations/20261003175601_p5_working_copy_stable_family_slug.sql`
- `supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql`
- `supabase/migrations/20261004102003_p5_delete_draft_cascade_fix_2026_10_04.sql`
- `supabase/migrations/20261015120000_c03_github_oidc_release_authorization.sql`
- `supabase/migrations/20261003175220_p5_working_copy_deep_copy_and_legacy_write_lock.sql`
- `supabase/migrations/20261003171050_p5_admin_canonical_import_and_audit.sql`
- `supabase/migrations/20261004074332_p5_admin_editor_completeness_2026_10_04.sql`
- `supabase/migrations/20261003224353_p5_published_content_edit_lifecycle.sql`
- `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`

#### `public.assessment_results`

- `supabase/migrations/20261003175353_p5_admin_result_read_rpc.sql`
- `supabase/migrations/20261002161455_p3_production_implementation.sql`
- `supabase/migrations/20261002161945_p3_preserve_completion_access_v2.sql`
- `supabase/migrations/20261009164951_structured_result_authority.sql`
- `supabase/migrations/20261004102003_p5_delete_draft_cascade_fix_2026_10_04.sql`
- `supabase/migrations/20261003082603_20261003093000_p4_submission_prepare_finalize.sql`
- `supabase/migrations/20261004074332_p5_admin_editor_completeness_2026_10_04.sql`
- `supabase/migrations/20261003224353_p5_published_content_edit_lifecycle.sql`
- `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`

#### `public.assessment_session_access`

- `supabase/migrations/20261001190000_p0_security_closure.sql`
- `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql`
- `supabase/migrations/20261003082558_20261003090000_p4_submission_foundation.sql`
- `supabase/migrations/20261003084304_20261003103000_p4_submission_context_lock.sql`
- `supabase/migrations/20261002161945_p3_preserve_completion_access_v2.sql`
- `supabase/migrations/20261002161455_p3_production_implementation.sql`
- `supabase/migrations/20261009164951_structured_result_authority.sql`
- `supabase/migrations/20261003082603_20261003093000_p4_submission_prepare_finalize.sql`
- `supabase/migrations/20261004102003_p5_delete_draft_cascade_fix_2026_10_04.sql`
- `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`

#### `public.assessment_settings`

- `supabase/migrations/20261001190000_p0_security_closure.sql`
- `supabase/migrations/20261003170912_p5_admin_architecture.sql`

#### `public.assessment_types`

- `supabase/migrations/20261001190000_p0_security_closure.sql`
- `supabase/migrations/20261001100833_p2_admin_status_guard.sql`
- `supabase/migrations/20261009164918_canonical_axis_weights.sql`
- `supabase/migrations/20261004102305_p5_ev_mapping_shape_fix.sql`
- `supabase/migrations/20261001101014_p2_immutability_trigger_fix.sql`
- `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`
- `supabase/migrations/20261003175601_p5_working_copy_stable_family_slug.sql`
- `supabase/migrations/20261003175645_p5_p2_immutability_lifecycle_compat.sql`
- `supabase/migrations/20261003171050_p5_admin_canonical_import_and_audit.sql`
- `supabase/migrations/20261004115546_p5_public_visibility_option_allocation.sql`
- `supabase/migrations/20261004102003_p5_delete_draft_cascade_fix_2026_10_04.sql`
- `supabase/migrations/20261004074332_p5_admin_editor_completeness_2026_10_04.sql`
- `supabase/migrations/20261003170912_p5_admin_architecture.sql`
- `supabase/migrations/20261004074428_p5_draft_cascade_delete_trigger_fix_2026_10_04.sql`
- `supabase/migrations/20261003175220_p5_working_copy_deep_copy_and_legacy_write_lock.sql`
- `supabase/migrations/20261003224353_p5_published_content_edit_lifecycle.sql`
- `supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql`
- `supabase/migrations/20261003082558_20261003090000_p4_submission_foundation.sql`
- `supabase/migrations/20261015120000_c03_github_oidc_release_authorization.sql`
- `supabase/migrations/20261002161455_p3_production_implementation.sql`
- `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql`
- `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`
- `supabase/migrations/20261005143243_p5_public_options_projection_recovery.sql`

#### `public.assessment_users`

- `supabase/migrations/20261001190000_p0_security_closure.sql`
- `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql`
- `supabase/migrations/20261009164951_structured_result_authority.sql`
- `supabase/migrations/20261002161455_p3_production_implementation.sql`
- `supabase/migrations/20261002161945_p3_preserve_completion_access_v2.sql`
- `supabase/migrations/20261003170912_p5_admin_architecture.sql`
- `supabase/migrations/20261003082558_20261003090000_p4_submission_foundation.sql`
- `supabase/migrations/20261003082603_20261003093000_p4_submission_prepare_finalize.sql`

#### `public.axes`

- `supabase/migrations/20261001190000_p0_security_closure.sql`
- `supabase/migrations/20261009164918_canonical_axis_weights.sql`
- `supabase/migrations/20261001101014_p2_immutability_trigger_fix.sql`
- `supabase/migrations/20261009164951_structured_result_authority.sql`
- `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`
- `supabase/migrations/20261003175601_p5_working_copy_stable_family_slug.sql`
- `supabase/migrations/20261003171050_p5_admin_canonical_import_and_audit.sql`
- `supabase/migrations/20261004074332_p5_admin_editor_completeness_2026_10_04.sql`
- `supabase/migrations/20261003170912_p5_admin_architecture.sql`
- `supabase/migrations/20261004074428_p5_draft_cascade_delete_trigger_fix_2026_10_04.sql`
- `supabase/migrations/20261003175220_p5_working_copy_deep_copy_and_legacy_write_lock.sql`
- `supabase/migrations/20261003224353_p5_published_content_edit_lifecycle.sql`
- `supabase/migrations/20261004102305_p5_ev_mapping_shape_fix.sql`
- `supabase/migrations/20261004102003_p5_delete_draft_cascade_fix_2026_10_04.sql`
- `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`

#### `public.experience_multipliers`

- `supabase/migrations/20261001190000_p0_security_closure.sql`

#### `public.historical_snapshots`

- `supabase/migrations/20261001190000_p0_security_closure.sql`
- `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`

#### `public.insights_mapping`

- `supabase/migrations/20261001190000_p0_security_closure.sql`
- `supabase/migrations/20261001101014_p2_immutability_trigger_fix.sql`
- `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`
- `supabase/migrations/20261003175601_p5_working_copy_stable_family_slug.sql`
- `supabase/migrations/20261009164918_canonical_axis_weights.sql`
- `supabase/migrations/20261003175220_p5_working_copy_deep_copy_and_legacy_write_lock.sql`
- `supabase/migrations/20261004102003_p5_delete_draft_cascade_fix_2026_10_04.sql`
- `supabase/migrations/20261004074428_p5_draft_cascade_delete_trigger_fix_2026_10_04.sql`
- `supabase/migrations/20261003224353_p5_published_content_edit_lifecycle.sql`
- `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`

#### `public.leads`

- `supabase/migrations/20261001190000_p0_security_closure.sql`
- `supabase/migrations/20261001061605_admin_dashboard_auth_hardening.sql`
- `supabase/migrations/20261002161455_p3_production_implementation.sql`
- `supabase/migrations/20261009164951_structured_result_authority.sql`
- `supabase/migrations/20261002161945_p3_preserve_completion_access_v2.sql`
- `supabase/migrations/20261004102003_p5_delete_draft_cascade_fix_2026_10_04.sql`
- `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql`
- `supabase/migrations/20261003082603_20261003093000_p4_submission_prepare_finalize.sql`
- `supabase/migrations/20261004074332_p5_admin_editor_completeness_2026_10_04.sql`
- `supabase/migrations/20261003224353_p5_published_content_edit_lifecycle.sql`
- `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`

#### `public.options`

- `supabase/migrations/20261005143243_p5_public_options_projection_recovery.sql`
- `supabase/migrations/20261001190000_p0_security_closure.sql`
- `supabase/migrations/20261003171050_p5_admin_canonical_import_and_audit.sql`
- `supabase/migrations/20261009164918_canonical_axis_weights.sql`
- `supabase/migrations/20261004115546_p5_public_visibility_option_allocation.sql`
- `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`
- `supabase/migrations/20261003175601_p5_working_copy_stable_family_slug.sql`
- `supabase/migrations/20261004074428_p5_draft_cascade_delete_trigger_fix_2026_10_04.sql`
- `supabase/migrations/20261003224353_p5_published_content_edit_lifecycle.sql`
- `supabase/migrations/20261003170912_p5_admin_architecture.sql`
- `supabase/migrations/20261004074332_p5_admin_editor_completeness_2026_10_04.sql`
- `supabase/migrations/20261003175220_p5_working_copy_deep_copy_and_legacy_write_lock.sql`
- `supabase/migrations/20261003082558_20261003090000_p4_submission_foundation.sql`
- `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`

#### `public.questions`

- `supabase/migrations/20261001190000_p0_security_closure.sql`
- `supabase/migrations/20261009164918_canonical_axis_weights.sql`
- `supabase/migrations/20261001101014_p2_immutability_trigger_fix.sql`
- `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`
- `supabase/migrations/20261003175601_p5_working_copy_stable_family_slug.sql`
- `supabase/migrations/20261003171050_p5_admin_canonical_import_and_audit.sql`
- `supabase/migrations/20261004074332_p5_admin_editor_completeness_2026_10_04.sql`
- `supabase/migrations/20261003170912_p5_admin_architecture.sql`
- `supabase/migrations/20261004074428_p5_draft_cascade_delete_trigger_fix_2026_10_04.sql`
- `supabase/migrations/20261003175220_p5_working_copy_deep_copy_and_legacy_write_lock.sql`
- `supabase/migrations/20261003224353_p5_published_content_edit_lifecycle.sql`
- `supabase/migrations/20261003084304_20261003103000_p4_submission_context_lock.sql`
- `supabase/migrations/20261004102003_p5_delete_draft_cascade_fix_2026_10_04.sql`
- `supabase/migrations/20261003082558_20261003090000_p4_submission_foundation.sql`
- `supabase/migrations/20261004115546_p5_public_visibility_option_allocation.sql`
- `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`
- `supabase/migrations/20261003082603_20261003093000_p4_submission_prepare_finalize.sql`
- `supabase/migrations/20261005143243_p5_public_options_projection_recovery.sql`

#### `public.scores`

- `supabase/migrations/20261001190000_p0_security_closure.sql`
- `supabase/migrations/20261009164951_structured_result_authority.sql`
- `supabase/migrations/20261002161455_p3_production_implementation.sql`
- `supabase/migrations/20261002161945_p3_preserve_completion_access_v2.sql`
- `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql`
- `supabase/migrations/20261003082603_20261003093000_p4_submission_prepare_finalize.sql`
- `supabase/migrations/20261001104008_20261001104100_p2_score_weight_precision.sql`

#### `public.sessions`

- `supabase/migrations/20261001190000_p0_security_closure.sql`
- `supabase/migrations/20261003181243_p5_secure_report_session_read.sql`
- `supabase/migrations/20261004071919_p5_secure_admin_session_counts.sql`
- `supabase/migrations/20261002161455_p3_production_implementation.sql`
- `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql`
- `supabase/migrations/20261003082558_20261003090000_p4_submission_foundation.sql`
- `supabase/migrations/20261003084304_20261003103000_p4_submission_context_lock.sql`
- `supabase/migrations/20261003181305_p5_secure_report_session_read_fix_started_at.sql`
- `supabase/migrations/20261002161945_p3_preserve_completion_access_v2.sql`
- `supabase/migrations/20261009164951_structured_result_authority.sql`
- `supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql`
- `supabase/migrations/20261003082603_20261003093000_p4_submission_prepare_finalize.sql`
- `supabase/migrations/20261004102003_p5_delete_draft_cascade_fix_2026_10_04.sql`
- `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`
- `supabase/migrations/20261004074332_p5_admin_editor_completeness_2026_10_04.sql`
- `supabase/migrations/20261003224353_p5_published_content_edit_lifecycle.sql`
- `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`

#### `public.specialty_profiles`

- `supabase/migrations/20261001190000_p0_security_closure.sql`

#### `public.team_capacity_factors`

- `supabase/migrations/20261001190000_p0_security_closure.sql`

#### `public.traps`

- `supabase/migrations/20261001190000_p0_security_closure.sql`
- `supabase/migrations/20261001101014_p2_immutability_trigger_fix.sql`
- `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`
- `supabase/migrations/20261004145553_p5_lifecycle_trigger_final_fix.sql`
- `supabase/migrations/20261004115737_p5_lifecycle_immutability_compat.sql`
- `supabase/migrations/20261003175724_p5_p2_archival_metadata_exception.sql`
- `supabase/migrations/20261003175601_p5_working_copy_stable_family_slug.sql`
- `supabase/migrations/20261003170912_p5_admin_architecture.sql`
- `supabase/migrations/20261003175220_p5_working_copy_deep_copy_and_legacy_write_lock.sql`
- `supabase/migrations/20261003175807_p5_restore_archived_version_immutability_compat.sql`
- `supabase/migrations/20261009164918_canonical_axis_weights.sql`
- `supabase/migrations/20261004102003_p5_delete_draft_cascade_fix_2026_10_04.sql`
- `supabase/migrations/20261003224353_p5_published_content_edit_lifecycle.sql`
- `supabase/migrations/20261004074428_p5_draft_cascade_delete_trigger_fix_2026_10_04.sql`
- `supabase/migrations/20261004074332_p5_admin_editor_completeness_2026_10_04.sql`
- `supabase/migrations/20261003171050_p5_admin_canonical_import_and_audit.sql`
- `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`

### Repository source/test/workflow search hits by live table

#### `public.admin_audit_log`

- `tests/c03-hybrid-config-release-harness.sql`

#### `public.admin_capabilities`

- `admin/assessment-manager.js`
- `tests/c03-hybrid-config-release-harness.sql`

#### `public.admin_users`

- `admin/admin-session.js`
- `admin/admin.js`
- `admin/assessment-manager.js`
- `tests/c03-hybrid-config-release-harness.sql`

#### `public.answers`

- `assets/js/app.js`
- `supabase/functions/assessment-access/engine.ts`

#### `public.assessment_assets`

- `tests/wp-08-v1-assessment-reconstruction-harness.sql`
- `tests/p5-editor-workspace.test.js`
- `tests/wp-08-v1-assessment-reconstruction.test.mjs`
- `tests/wp-08-v1-assessment-reconstruction-harness-safe.sql`

#### `public.assessment_config_release_settings`

- `supabase/functions/assessment-access/engine.ts`
- `supabase/functions/assessment-config-release/index.ts`
- `tests/c03-hybrid-config-release-harness.sql`
- `.github/scripts/c03-production-e2e-cleanup.mjs`
- `.github/workflows/c03-credential-preflight.yml`

#### `public.assessment_config_releases`

- `supabase/functions/assessment-config-release/index.ts`
- `supabase/functions/assessment-access/engine.ts`
- `tests/c03-hybrid-config-release-harness.sql`
- `tests/c03-release-verifier-handler.test.ts`

#### `public.assessment_families`

- `admin/assessment-manager.js`
- `supabase/functions/assessment-access/index.ts`
- `admin/assessment-editor-workspace.js`
- `supabase/functions/assessment-access/engine.ts`
- `supabase/functions/assessment-config-release/index.ts`

#### `public.assessment_results`

- `admin/assessment-manager.js`
- `supabase/functions/assessment-access/index.ts`

#### `public.assessment_session_access`

- `supabase/functions/assessment-access/index.ts`

#### `public.assessment_settings`

- `admin/assessment-manager.js`
- `supabase/functions/assessment-access/index.ts`

#### `public.assessment_types`

- `assets/js/app.js`
- `supabase/functions/assessment-access/report-interpretation.mjs`
- `admin/assessment-manager.js`

#### `public.assessment_users`

- `supabase/functions/assessment-access/index.ts`
- `tests/p4-protected-local-fixture.sql`
- `tests/p4-protected-function-harness.sql`

#### `public.axes`

- `assets/js/report-validation.js`
- `assets/js/report-interpretation.js`
- `assets/js/app.js`
- `supabase/functions/assessment-access/engine.ts`
- `supabase/functions/assessment-access/report-interpretation.mjs`
- `admin/assessment-editor-workspace.js`
- `supabase/functions/assessment-access/structured-result.mts`

#### `public.experience_multipliers`

- No indexed hit returned in the sampled search.

#### `public.historical_snapshots`

- `tests/wp-08-v1-assessment-reconstruction-harness.sql`
- `tests/wp-08-v1-assessment-reconstruction-harness-safe.sql`
- `.github/scripts/c03-production-e2e-cleanup.mjs`

#### `public.insights_mapping`

- `tests/wp-08-v1-assessment-reconstruction-harness.sql`
- `tests/wp-08-v1-assessment-reconstruction.test.mjs`
- `tests/p5-editor-workspace.test.js`
- `tests/wp-08-v1-assessment-reconstruction-harness-safe.sql`

#### `public.leads`

- `assets/js/app.js`
- `admin/assessment-manager.js`
- `admin/admin.html`
- `supabase/functions/assessment-access/index.ts`

#### `public.options`

- `_headers`
- `functions/_middleware.js`
- `assets/js/supabase-client.js`
- `supabase/functions/admin-management/index.ts`
- `supabase/functions/assessment-access/engine.ts`
- `assets/js/app.js`

#### `public.questions`

- `assets/js/app.js`
- `supabase/functions/assessment-access/engine.ts`
- `supabase/functions/assessment-access/response-scorer.mts`
- `admin/assessment-editor-workspace.js`

#### `public.scores`

- `assets/js/report-interpretation.js`
- `assets/js/app.js`
- `supabase/functions/assessment-access/structured-result.mts`
- `supabase/functions/assessment-access/report-interpretation.mjs`
- `assets/js/report-validation.js`

#### `public.sessions`

- `assets/js/app.js`

#### `public.specialty_profiles`

- No indexed hit returned in the sampled search.

#### `public.team_capacity_factors`

- No indexed hit returned in the sampled search.

#### `public.traps`

- `supabase/functions/assessment-access/engine.ts`
- `supabase/functions/assessment-access/assessment-config-digest.mjs`
- `assets/js/report-validation.js`
- `supabase/functions/assessment-access/index.ts`
- `admin/assessment-editor-workspace.js`
- `admin/assessment-manager.js`
- `patient-journey.html`
- `clinic-performance.html`

## Independent evidence for the named 18-table candidate set

The current tracked file `supabase/migrations/20261001190000_p0_security_closure.sql` explicitly enumerates these 18 pre-existing public tables in its privilege-revocation loop: `admin_users`, `answers`, `assessment_assets`, `assessment_settings`, `assessment_types`, `assessment_users`, `axes`, `experience_multipliers`, `historical_snapshots`, `insights_mapping`, `leads`, `options`, `questions`, `scores`, `sessions`, `specialty_profiles`, `team_capacity_factors`, and `traps`. This is strong evidence that the candidate names were known and present by the P0 migration, and it matches the 18 candidates listed above. **It is not proof by itself that their initial CREATE TABLE statements never existed in another tracked file or an authoritative external source.** Initial-creation absence remains OPEN until the complete migration file contents and historical source archive are checked.


## Cross-branch provenance note — PR #120 is not main

A separate read-only inspection of PR #120 (`wp-11/least-privilege-reconciliation`) found that its description claims the earlier migration identity/source/order discrepancy has been reconciled on that branch: source was restored for applied IDs `20261018075528` and `20261018075855`, applied ID `20261018100000` remains distinct, and source-only/unapplied `20261018110000` is removed on the candidate branch. The branch proposes `20261018120000_wp11_security_database_reconciliation.sql` as a new, unapplied migration. PR #120 remains **OPEN / READY FOR REVIEW / UNMERGED**; none of those branch changes are part of `main` or Production as a result of this inspection.

Therefore the status must be stated per reference: **main** still needs its migration source/ledger discrepancy reconciled against live migration records; **PR #120 branch** claims to have corrected that migration identity/source/order issue but still has not closed the separate empty-database baseline gap. This worksheet does not merge the PR, apply its proposed migration, or authorize any Production mutation. The branch's isolated CI results are not Production evidence.
## Full migration-file scan — batch 1 of 5

Pinned `main` tree: `d9cd749ffffa358409b11e11cf405d5ae1be7d53`. Files scanned in full: 12/56. The blob SHA values are from the Git tree; all text was retrieved from the raw URL for the pinned commit. This batch appends exact line-reference categories per table; no file was modified.

### `supabase/migrations/20260930233955_add_server_scoring_rpc.sql`

- Git blob SHA: `e2e332e9ea3ad385ae4437eede5305d8df84f673`; 4 lines; 182 characters; historical marker file.
- No direct table DDL/reference statements for the 25 live tables were found in this file.

### `supabase/migrations/20260930234340_unify_public_and_protected_assessment_access.sql`

- Git blob SHA: `e2e332e9ea3ad385ae4437eede5305d8df84f673`; 4 lines; 182 characters; historical marker file.
- No direct table DDL/reference statements for the 25 live tables were found in this file.

### `supabase/migrations/20260930234428_preserve_access_for_idempotent_completion.sql`

- Git blob SHA: `e2e332e9ea3ad385ae4437eede5305d8df84f673`; 4 lines; 182 characters; historical marker file.
- No direct table DDL/reference statements for the 25 live tables were found in this file.

### `supabase/migrations/20260930234953_pin_assessment_version_on_session.sql`

- Git blob SHA: `e2e332e9ea3ad385ae4437eede5305d8df84f673`; 4 lines; 182 characters; historical marker file.
- No direct table DDL/reference statements for the 25 live tables were found in this file.

### `supabase/migrations/20260930235404_admin_identity_foundation.sql`

- Git blob SHA: `e2e332e9ea3ad385ae4437eede5305d8df84f673`; 4 lines; 182 characters; historical marker file.
- No direct table DDL/reference statements for the 25 live tables were found in this file.

### `supabase/migrations/20261001061605_admin_dashboard_auth_hardening.sql`

- Git blob SHA: `1b703cd7cf71437cebbacfac35ffb8d0c239c6b2`; 72 lines; 2207 characters; content scanned.
- `public.admin_users`: SQL_REF line 14.

### `supabase/migrations/20261001080710_p1_pg_net_client_execute_revoke.sql`

- Git blob SHA: `78ec66b61baed7998fb9bef4ba64f76f59a10739`; 18 lines; 605 characters; content scanned.
- No direct table DDL/reference statements for the 25 live tables were found in this file.

### `supabase/migrations/20261001080714_p1_revoke_client_trigger_helper.sql`

- Git blob SHA: `105059bf6e02a465691a41c6a69fadd3fd1cb971`; 3 lines; 164 characters; content scanned.
- No direct table DDL/reference statements for the 25 live tables were found in this file.

### `supabase/migrations/20261001080806_p1_relocate_pg_net_to_extensions.sql`

- Git blob SHA: `0255f8b80332a1cd06887f4e1f94974b27687574`; 6 lines; 224 characters; content scanned.
- No direct table DDL/reference statements for the 25 live tables were found in this file.

### `supabase/migrations/20261001083056_p1_e_fix_answers_upsert_conflict.sql`

- Git blob SHA: `837394d11f94420e14433936fbcabe7e1979636e`; 7 lines; 270 characters; content scanned.
- `public.answers`: ALTER_TABLE line 4.

### `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`

- Git blob SHA: `12d04ecf5f414df2a76381635b78cbdcf1dbcb80`; 442 lines; 15465 characters; content scanned.
- `public.assessment_assets`: TRIGGER line 146; SQL_REF lines 336,344.
- `public.assessment_families`: CREATE_TABLE line 7; SQL_REF lines 20,29,68,387,420; FK_REFERENCE line 50; ALTER_TABLE lines 59,62,438; GRANT line 439.
- `public.assessment_types`: ALTER_TABLE lines 16,42,45,48; SQL_REF lines 22,27,36,71,80,98,230,245,250,373,405,412; FK_REFERENCE line 65; TRIGGER line 207.
- `public.axes`: TRIGGER line 121; SQL_REF lines 270,273,279.
- `public.insights_mapping`: TRIGGER line 141; SQL_REF lines 324,333.
- `public.options`: TRIGGER line 131; SQL_REF lines 299,306.
- `public.questions`: SQL_REF lines 109,284,287,295,393; TRIGGER line 126.
- `public.sessions`: SQL_REF line 77.
- `public.traps`: TRIGGER line 136; SQL_REF lines 309,321.

### `supabase/migrations/20261001100833_p2_admin_status_guard.sql`

- Git blob SHA: `58c25faeea482279e9cd1ddd85ee8be51e8c77f9`; 58 lines; 1532 characters; content scanned.
- `public.assessment_types`: SQL_REF lines 20,43.

## Full migration-file scan — batch 2 of 5

Pinned `main` tree: `d9cd749ffffa358409b11e11cf405d5ae1be7d53`. Files scanned in full: 12/56 (repository files 13–24).

### `supabase/migrations/20261001101014_p2_immutability_trigger_fix.sql`

- Git blob SHA: `1c3931d7b98c7487f5438cfdfa0813190f37ab3c`; 48 lines; 1399 characters; content scanned.
- `public.assessment_types`: SQL_REF line 35.
- `public.questions`: SQL_REF line 28.

### `supabase/migrations/20261001104008_20261001104100_p2_score_weight_precision.sql`

- Git blob SHA: `1b65af7f16390822fd5e74e1817ee20a129abf8d`; 10 lines; 451 characters; content scanned.
- `public.scores`: ALTER_TABLE lines 4,8.

### `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql`

- Git blob SHA: `67c061783bf2eb158226930f693afd8fc3bd5429`; 370 lines; 10688 characters; content scanned.
- `public.answers`: ALTER_TABLE lines 44,49,51.
- `public.assessment_session_access`: CREATE_TABLE line 21; ALTER_TABLE line 39; GRANT lines 41,42; SQL_REF lines 79,155,167,175,178,348.
- `public.assessment_types`: SQL_REF line 106.
- `public.assessment_users`: FK_REFERENCE lines 12,24; SQL_REF lines 92,275,338.
- `public.leads`: SQL_REF lines 236,331.
- `public.scores`: SQL_REF lines 291,294.
- `public.sessions`: ALTER_TABLE line 10; FK_REFERENCE line 23; SQL_REF lines 114,127,146,217,342.

### `supabase/migrations/20261001190000_p0_security_closure.sql`

- Git blob SHA: `a11255bd74b52e98944900a8b4f829976907b4e3`; 61 lines; 2169 characters; content scanned.
- `public.admin_users`: POLICY line 29.
- `public.assessment_session_access`: GRANT line 50.

### `supabase/migrations/20261002161455_p3_production_implementation.sql`

- Git blob SHA: `245c37acdd2611e839a56fa370043c9cffb3f1c0`; 529 lines; 18305 characters; content scanned.
- `public.assessment_results`: CREATE_TABLE line 10; ALTER_TABLE line 29; GRANT lines 30,31; SQL_REF lines 87,98,235,345,356,476.
- `public.assessment_session_access`: SQL_REF lines 73,268,331,504.
- `public.assessment_types`: FK_REFERENCE line 13.
- `public.assessment_users`: SQL_REF lines 198,254.
- `public.leads`: SQL_REF lines 95,247,353,488.
- `public.scores`: SQL_REF lines 214,216,455,457.
- `public.sessions`: ALTER_TABLE line 5; FK_REFERENCE line 12; SQL_REF lines 60,258,318,495.

### `supabase/migrations/20261002161945_p3_preserve_completion_access_v2.sql`

- Git blob SHA: `268d292a8c3e1f52aad51f111a076197d68649e1`; 454 lines; 16157 characters; content scanned.
- `public.assessment_results`: SQL_REF lines 42,53,190,279,290,410.
- `public.assessment_session_access`: SQL_REF lines 28,223,265,438.
- `public.assessment_users`: SQL_REF lines 153,209.
- `public.leads`: SQL_REF lines 50,202,287,422.
- `public.scores`: SQL_REF lines 169,171,389,391.
- `public.sessions`: SQL_REF lines 15,213,252,429.

### `supabase/migrations/20261003082558_20261003090000_p4_submission_foundation.sql`

- Git blob SHA: `53f0259deca7502523c563f5487a43dd2e44a2f4`; 460 lines; 13963 characters; content scanned.
- `public.answers`: SQL_REF line 107.
- `public.assessment_session_access`: SQL_REF lines 58,154,208,244,293,331,422.
- `public.assessment_types`: SQL_REF lines 198,345,368,411.
- `public.assessment_users`: SQL_REF line 355.
- `public.options`: SQL_REF line 99.
- `public.questions`: SQL_REF line 89.
- `public.sessions`: ALTER_TABLE lines 4,20,23; SQL_REF lines 12,17,70,149,221,231,250,265,375,390,428.

### `supabase/migrations/20261003082603_20261003093000_p4_submission_prepare_finalize.sql`

- Git blob SHA: `516678ba20014f8f8713c5f7583a7a9325baec6a`; 649 lines; 21832 characters; content scanned.
- `public.answers`: SQL_REF lines 79,108.
- `public.assessment_results`: SQL_REF lines 204,330,437,448,591.
- `public.assessment_session_access`: SQL_REF lines 21,127,183,360,423,626.
- `public.assessment_users`: SQL_REF lines 554,610.
- `public.leads`: SQL_REF lines 201,342,445,603.
- `public.questions`: SQL_REF lines 72,78.
- `public.scores`: SQL_REF lines 309,311,570,572.
- `public.sessions`: SQL_REF lines 34,119,170,349,410,614.

### `supabase/migrations/20261003084304_20261003103000_p4_submission_context_lock.sql`

- Git blob SHA: `26c4b3ec475aaa676fbdacf0b94ec7f7cc8db1f4`; 161 lines; 4892 characters; content scanned.
- `public.answers`: SQL_REF lines 89,118.
- `public.assessment_session_access`: SQL_REF lines 29,143.
- `public.questions`: SQL_REF lines 82,88.
- `public.sessions`: ALTER_TABLE line 2; SQL_REF lines 42,134.

### `supabase/migrations/20261003170912_p5_admin_architecture.sql`

- Git blob SHA: `123793c3c580327df1da1c3c917287d84d8517d5`; 765 lines; 33309 characters; content scanned.
- `public.admin_audit_log`: CREATE_TABLE line 12; ALTER_TABLE line 28; GRANT lines 31,737,739; SQL_REF line 111; POLICY line 132.
- `public.admin_capabilities`: CREATE_TABLE line 4; ALTER_TABLE line 27; GRANT lines 30,736,738; SQL_REF lines 72,675,697; POLICY line 124.
- `public.admin_users`: SQL_REF lines 41,56,73,668,718,721.
- `public.assessment_families`: FK_REFERENCE line 18; POLICY line 138; GRANT line 144; SQL_REF lines 169,283,355,406,423,446,451,470,485,609,625.
- `public.assessment_settings`: SQL_REF line 627.
- `public.assessment_types`: SQL_REF lines 173,214,220,229,276,285,289,352,402,416,419,450,468,480,483,502,511,528,541,556,578,592,643,648.
- `public.assessment_users`: SQL_REF line 611.
- `public.axes`: SQL_REF lines 305,307,309,359,366,506,511,531.
- `public.options`: SQL_REF lines 324,328,362,559,577,581,591,595.
- `public.questions`: SQL_REF lines 312,314,320,357,359,363,535,541,556,577,591.

### `supabase/migrations/20261003170948_p5_admin_capability_management.sql`

- Git blob SHA: `f68f9098e8dd23743a32ebdaac2c748b075b5c84`; 43 lines; 2953 characters; content scanned.
- `public.admin_capabilities`: SQL_REF lines 9,21.
- `public.admin_users`: SQL_REF lines 6,32,35.

### `supabase/migrations/20261003171050_p5_admin_canonical_import_and_audit.sql`

- Git blob SHA: `f978ff537ac381a7a065921aafa2fb833e146643`; 204 lines; 12242 characters; content scanned.
- `public.assessment_families`: SQL_REF line 18.
- `public.assessment_types`: SQL_REF lines 21,75,94,101,116,129,144,162,177,192,197,199.
- `public.axes`: SQL_REF lines 35,97,101,104,119.
- `public.options`: SQL_REF lines 60,147,152,162,166,168,177,181.
- `public.questions`: SQL_REF lines 46,124,129,132,144,162,177.

## Full migration-file scan — batch 3 of 5

Pinned `main` tree: `d9cd749ffffa358409b11e11cf405d5ae1be7d53`. Files scanned in full: 12/56 (repository files 25–36).

### `supabase/migrations/20261003171123_p5_admin_security_hardening.sql`

- Git blob SHA: `03673cf1fbe6a03e32ff92dd43c59696d084df1f`; 22 lines; 1806 characters; content scanned.
- `public.admin_audit_log`: INDEX lines 1,2.
- `public.admin_capabilities`: INDEX line 3.

### `supabase/migrations/20261003174838_p5_admin_assistant_management.sql`

- Git blob SHA: `9e3aaadf7ccf5e23b321422cd027e07444523f04`; 213 lines; 6590 characters; content scanned.
- `public.admin_capabilities`: SQL_REF lines 60,139,164.
- `public.admin_users`: ALTER_TABLE line 2; SQL_REF lines 42,56,94,100,106,134,189,196.

### `supabase/migrations/20261003175220_p5_working_copy_deep_copy_and_legacy_write_lock.sql`

- Git blob SHA: `ffdcb82c8f598852f8936a83ab6177bbee8a7948`; 108 lines; 5205 characters; content scanned.
- `public.assessment_assets`: SQL_REF lines 91,97.
- `public.assessment_families`: SQL_REF line 25.
- `public.assessment_types`: SQL_REF lines 16,27,31.
- `public.axes`: SQL_REF lines 47,48,50.
- `public.insights_mapping`: SQL_REF lines 83,89.
- `public.options`: SQL_REF lines 64,68.
- `public.questions`: SQL_REF lines 53,54,60.
- `public.traps`: SQL_REF lines 70,80.

### `supabase/migrations/20261003175353_p5_admin_result_read_rpc.sql`

- Git blob SHA: `c2313a5b1fc0beec6aefd5751ecceb48d04b5401`; 27 lines; 943 characters; content scanned.
- `public.assessment_results`: SQL_REF line 12.

### `supabase/migrations/20261003175429_p5_assistant_capability_dedup.sql`

- Git blob SHA: `6b0919e1de17c2a4ca9f58b0431af6db296189c2`; 59 lines; 2007 characters; content scanned.
- `public.admin_capabilities`: SQL_REF line 47.
- `public.admin_users`: SQL_REF lines 26,43.

### `supabase/migrations/20261003175601_p5_working_copy_stable_family_slug.sql`

- Git blob SHA: `a126aa97ad7115d9fa16520c1a45c5ba125283f1`; 113 lines; 5232 characters; content scanned.
- `public.assessment_assets`: SQL_REF lines 99,105.
- `public.assessment_families`: SQL_REF line 23.
- `public.assessment_types`: SQL_REF lines 17,34,39.
- `public.axes`: SQL_REF lines 55,56,58.
- `public.insights_mapping`: SQL_REF lines 91,97.
- `public.options`: SQL_REF lines 72,76.
- `public.questions`: SQL_REF lines 61,62,68.
- `public.traps`: SQL_REF lines 78,88.

### `supabase/migrations/20261003175645_p5_p2_immutability_lifecycle_compat.sql`

- Git blob SHA: `bfe6ffb1b0893c7e7d86c6889515b2fac02df1c5`; 148 lines; 5252 characters; content scanned.
- `public.assessment_families`: SQL_REF lines 19,45,69,81,110,135.
- `public.assessment_types`: SQL_REF lines 15,31,37,76,107,121,127.

### `supabase/migrations/20261003175724_p5_p2_archival_metadata_exception.sql`

- Git blob SHA: `d39241ab0c9087ba6d3738cec7a9c6a26c0b7406`; 51 lines; 1923 characters; content scanned.
- No direct table DDL/reference statements for the 25 live tables were found in this file.

### `supabase/migrations/20261003175807_p5_restore_archived_version_immutability_compat.sql`

- Git blob SHA: `4eac766875dd4c47b4bbd769936b9e4dc57f6b94`; 74 lines; 3208 characters; content scanned.
- No direct table DDL/reference statements for the 25 live tables were found in this file.

### `supabase/migrations/20261003181243_p5_secure_report_session_read.sql`

- Git blob SHA: `1858547bf67f36b1bf28550481d8fd4c88099e57`; 34 lines; 869 characters; content scanned.
- `public.sessions`: SQL_REF line 26.

### `supabase/migrations/20261003181305_p5_secure_report_session_read_fix_started_at.sql`

- Git blob SHA: `ffb56b51a99fa1286f796528009ceb4edde21865`; 34 lines; 869 characters; content scanned.
- `public.sessions`: SQL_REF line 26.

### `supabase/migrations/20261003183952_p5_owner_audit_read_secure.sql`

- Git blob SHA: `d55ba07f0ebcc0097732d354a7a572085f472f05`; 56 lines; 2271 characters; content scanned.
- `public.admin_audit_log`: SQL_REF lines 22,38.
- `public.admin_users`: SQL_REF line 39.
- `public.assessment_families`: SQL_REF line 40.

## Full migration-file scan — batch 4 of 5

Pinned `main` tree: `d9cd749ffffa358409b11e11cf405d5ae1be7d53`. Files scanned in full: 12/56 (repository files 37–48).

### `supabase/migrations/20261003195802_p5_revoke_anonymous_assistant_rpcs.sql`

- Git blob SHA: `7f4b1312bcfc96934da5fba838789a0bb4ada652`; 8 lines; 605 characters; content scanned.
- No direct table DDL/reference statements for the 25 live tables were found in this file.

### `supabase/migrations/20261003200444_p5_fix_assistant_create_capability_alias.sql`

- Git blob SHA: `1f39f213dd095c70dd7b089d48abf62a0e6fd579`; 65 lines; 2333 characters; content scanned.
- `public.admin_capabilities`: SQL_REF line 48.
- `public.admin_users`: SQL_REF lines 27,44.

### `supabase/migrations/20261003224353_p5_published_content_edit_lifecycle.sql`

- Git blob SHA: `18ef36c84c936e90707af27af46f7aadd993d0c8`; 751 lines; 26388 characters; content scanned.
- `public.assessment_families`: SQL_REF line 516.
- `public.assessment_results`: SQL_REF line 522.
- `public.assessment_types`: SQL_REF lines 29,56,58,184,195,204,232,279,328,374,419,473,506,520,540,577,624,679,721.
- `public.axes`: SQL_REF lines 231,243,252,577,582,593,631,720,729,738.
- `public.leads`: SQL_REF line 523.
- `public.options`: SQL_REF lines 326,339,348,417,432,438,447,454.
- `public.questions`: SQL_REF lines 27,50,52,278,290,298,327,418,624,636,648,678,687,695.
- `public.sessions`: SQL_REF line 521.

### `supabase/migrations/20261004071919_p5_secure_admin_session_counts.sql`

- Git blob SHA: `2a92d6728c69de2e25301af6d155aca6d8e6c7ff`; 22 lines; 753 characters; content scanned.
- `public.sessions`: SQL_REF line 13.

### `supabase/migrations/20261004074332_p5_admin_editor_completeness_2026_10_04.sql`

- Git blob SHA: `e6f6141f8be110bb737c479dfa93ca84ab40205b`; 362 lines; 12354 characters; content scanned.
- `public.assessment_families`: SQL_REF line 319.
- `public.assessment_results`: SQL_REF line 324.
- `public.assessment_types`: SQL_REF lines 30,88,105,138,164,205,275,284,309,341.
- `public.axes`: SQL_REF lines 137,162,165,225.
- `public.leads`: SQL_REF line 325.
- `public.options`: SQL_REF lines 28,50,63.
- `public.questions`: SQL_REF lines 29,87,103,106,151,166.
- `public.sessions`: SQL_REF line 323.
- `public.traps`: SQL_REF lines 99,154,333.

### `supabase/migrations/20261004074428_p5_draft_cascade_delete_trigger_fix_2026_10_04.sql`

- Git blob SHA: `3b9f4b5589ea8adfae51de4a003838bccee527af`; 138 lines; 5524 characters; content scanned.
- `public.assessment_types`: SQL_REF lines 41,76,80.
- `public.questions`: SQL_REF lines 26,31,68,71.

### `supabase/migrations/20261004102003_p5_delete_draft_cascade_fix_2026_10_04.sql`

- Git blob SHA: `7a077fce398ee99008e433148fbe808047706f54`; 115 lines; 3406 characters; content scanned.
- `public.assessment_assets`: SQL_REF line 71.
- `public.assessment_families`: SQL_REF line 38.
- `public.assessment_results`: SQL_REF line 48.
- `public.assessment_session_access`: SQL_REF line 77.
- `public.assessment_types`: SQL_REF lines 25,58,98.
- `public.axes`: SQL_REF line 83.
- `public.insights_mapping`: SQL_REF line 74.
- `public.leads`: SQL_REF line 51.
- `public.questions`: SQL_REF line 80.
- `public.sessions`: SQL_REF line 45.
- `public.traps`: SQL_REF line 68.

### `supabase/migrations/20261004102305_p5_ev_mapping_shape_fix.sql`

- Git blob SHA: `9202b9211cd03a0984d6633bd5f82cb3ec9c31db`; 119 lines; 4053 characters; content scanned.
- `public.assessment_types`: SQL_REF lines 33,99,108.
- `public.axes`: SQL_REF line 54.

### `supabase/migrations/20261004115546_p5_public_visibility_option_allocation.sql`

- Git blob SHA: `2e01f82a7824b56e9495695a4347802dc1bc7070`; 281 lines; 7911 characters; content scanned.
- `public.assessment_families`: SQL_REF lines 97,175,192,244,260.
- `public.assessment_types`: SQL_REF lines 33,110,126,162,187,227,252.
- `public.options`: SQL_REF lines 46,56,59,73.
- `public.questions`: SQL_REF line 32.

### `supabase/migrations/20261004115737_p5_lifecycle_immutability_compat.sql`

- Git blob SHA: `ac5cb1fcc0af2126da64e89df9efe7ae6fd4f588`; 51 lines; 2123 characters; content scanned.
- No direct table DDL/reference statements for the 25 live tables were found in this file.

### `supabase/migrations/20261004145553_p5_lifecycle_trigger_final_fix.sql`

- Git blob SHA: `7334be7fc1093bd3858829bc075dfbf119b55ee4`; 97 lines; 4260 characters; content scanned.
- No direct table DDL/reference statements for the 25 live tables were found in this file.

### `supabase/migrations/20261005143243_p5_public_options_projection_recovery.sql`

- Git blob SHA: `2b965619f38f28ea0751bcdc578c7eea3729a64b`; 44 lines; 1478 characters; content scanned.
- `public.assessment_types`: SQL_REF line 34.
- `public.options`: SQL_REF line 32.
- `public.questions`: SQL_REF line 33.

## Full migration-file scan — batch 5 of 5

Pinned `main` tree: `d9cd749ffffa358409b11e11cf405d5ae1be7d53`. Files scanned in full: 8/56 (repository files 49–56).

### `supabase/migrations/20261009164918_canonical_axis_weights.sql`

- Git blob SHA: `6715d7cedf8293ebf1686a4f1335eddb4502f3ee`; 223 lines; 8470 characters; content scanned.
- `public.assessment_types`: SQL_REF lines 49,84,88,153,171,180,194,209.
- `public.axes`: SQL_REF lines 154,172,177,195,210.
- `public.questions`: SQL_REF lines 34,39,76,79.

### `supabase/migrations/20261009164951_structured_result_authority.sql`

- Git blob SHA: `c5a48db426707f937100b65f620d996061cadb23`; 449 lines; 19259 characters; content scanned.
- `public.assessment_results`: SQL_REF lines 63,209,297,406.
- `public.assessment_session_access`: SQL_REF lines 42,239,287,434.
- `public.assessment_users`: SQL_REF lines 381,388,423.
- `public.leads`: SQL_REF lines 60,221,296,416.
- `public.scores`: SQL_REF lines 178,180,393,395.
- `public.sessions`: SQL_REF lines 30,228,280,427.

### `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`

- Git blob SHA: `a81997122f61e652240829ce2a5173d0daf205eb`; 142 lines; 97267 characters; content scanned.
- `public.answers`: SQL_REF line 10.
- `public.assessment_assets`: SQL_REF lines 16,62,125; ALTER_TABLE lines 43,128.
- `public.assessment_families`: SQL_REF lines 26,74,91,96,114,139.
- `public.assessment_results`: SQL_REF line 11.
- `public.assessment_session_access`: SQL_REF line 13.
- `public.assessment_types`: ALTER_TABLE lines 37,134; SQL_REF lines 66,67,75,97,126,138,139.
- `public.axes`: ALTER_TABLE lines 38,133; SQL_REF lines 53,79,92,101,115,122.
- `public.historical_snapshots`: SQL_REF line 14.
- `public.insights_mapping`: SQL_REF lines 15,59,124; ALTER_TABLE lines 42,129.
- `public.leads`: SQL_REF line 12.
- `public.options`: ALTER_TABLE lines 40,131; SQL_REF lines 45,88,111,120.
- `public.questions`: ALTER_TABLE lines 39,132; SQL_REF lines 46,50,85,107,120,121.
- `public.sessions`: SQL_REF lines 9,10.
- `public.traps`: ALTER_TABLE lines 41,130; SQL_REF lines 56,123.

### `supabase/migrations/20261013110000_c02_allow_answer_value_70.sql`

- Git blob SHA: `106ff5ed6efa580ae9c0fb79a2c518876f54d76e`; 39 lines; 1132 characters; content scanned.
- `public.answers`: SQL_REF line 22; ALTER_TABLE lines 31,34.

### `supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql`

- Git blob SHA: `5b8c65678a14f18fa7c074537d094b34377745a0`; 619 lines; 30481 characters; content scanned.
- `public.assessment_config_release_settings`: CREATE_TABLE line 44; SQL_REF lines 51,332,577,595; ALTER_TABLE line 90; GRANT line 92.
- `public.assessment_config_releases`: CREATE_TABLE line 7; FK_REFERENCE lines 68,78; ALTER_TABLE line 89; GRANT line 91; TRIGGER line 129; SQL_REF lines 183,199,264,293,305,355,362,379,382,393,407,410,442,477,495,520,552,582.
- `public.assessment_families`: FK_REFERENCE line 9; ALTER_TABLE lines 54,66; TRIGGER line 417; SQL_REF lines 436,482,498,525,545,554,558,579.
- `public.assessment_types`: FK_REFERENCE line 10; SQL_REF lines 160,488,530.
- `public.sessions`: ALTER_TABLE lines 56,76; TRIGGER line 457.

### `supabase/migrations/20261015120000_c03_github_oidc_release_authorization.sql`

- Git blob SHA: `77c54d98f3efe559b8a5796f6cc96eca3abb2f5a`; 316 lines; 15261 characters; content scanned.
- `public.assessment_config_release_settings`: ALTER_TABLE line 8; SQL_REF lines 276,296.
- `public.assessment_config_releases`: ALTER_TABLE lines 5,12,14; SQL_REF lines 142,158,214,242,246,281.
- `public.assessment_families`: SQL_REF lines 225,248,278.
- `public.assessment_types`: SQL_REF lines 121,234.

### `supabase/migrations/20261018100000_c03_service_role_api_key_compatibility.sql`

- Git blob SHA: `c20231aad7f239c8ff0b773eb4a16bd0dfd63972`; 41 lines; 2292 characters; content scanned.
- No direct table DDL/reference statements for the 25 live tables were found in this file.

### `supabase/migrations/20261018110000_c03_verifier_api_key_compatibility.sql`

- Git blob SHA: `538ec2ac2bedd1f9886dac45600969c0a1a3c3bb`; 106 lines; 6480 characters; content scanned.
- `public.assessment_config_releases`: SQL_REF lines 40,69,81.


## Consolidated full-scan conclusion and migration-ledger reconciliation — 2026-10-20

### Scope and reproducibility

- The full contents of all **56** tracked `supabase/migrations/*.sql` files on `main` were fetched from the pinned Git tree `d9cd749ffffa358409b11e11cf405d5ae1be7d53` and scanned in five documented batches above. A follow-up comparison of every migration path and Git blob SHA against the later `main` tree `2eb0b6ed7bdc6f1e5416a04f69f0e59836c29dc1` found **no migration path or blob changes**, so the scan applies to the 56 migration files present at that main snapshot.
- The scan classifies table-related DDL and SQL references by file and line. It is a textual source scan: dynamic SQL constructed from variables, identifiers passed from application requests, and dependencies beyond tracked text require separate analysis. It is not proof of effective permission behavior.
- A fresh read-only exact `COUNT(*)` query returned the counts inserted into each table section above. These are counts at the time of that read-only query, not long-term invariants and not a basis to classify a table as unused.

### Result of the full migration-file CREATE TABLE scan

The 56 migration files contain initial `CREATE TABLE` declarations for exactly these seven live public tables (file and source line from the full-content scan):

| Live table | Initial CREATE TABLE source found in tracked migrations |
|---|---|
| `public.assessment_families` | `supabase/migrations/20261001100633_p2_assessment_family_versions.sql:7` |
| `public.assessment_session_access` | `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql:21` |
| `public.assessment_results` | `supabase/migrations/20261002161455_p3_production_implementation.sql:10` |
| `public.admin_capabilities` | `supabase/migrations/20261003170912_p5_admin_architecture.sql:4` |
| `public.admin_audit_log` | `supabase/migrations/20261003170912_p5_admin_architecture.sql:12` |
| `public.assessment_config_releases` | `supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql:7` |
| `public.assessment_config_release_settings` | `supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql:44` |

The exact **18 live tables with no initial CREATE TABLE declaration found in those 56 migration files** are:

`admin_users`, `answers`, `assessment_assets`, `assessment_settings`, `assessment_types`, `assessment_users`, `axes`, `experience_multipliers`, `historical_snapshots`, `insights_mapping`, `leads`, `options`, `questions`, `scores`, `sessions`, `specialty_profiles`, `team_capacity_factors`, `traps`.

The same 18 identifiers appear in the explicit table list in `supabase/migrations/20261001190000_p0_security_closure.sql` (the P0 privilege-revocation loop), which establishes that these objects were already expected to exist by that migration. This corroborates the names and chronology; it does not supply their original definitions.

### SQL files outside the migration directory

A full tree listing found **9** tracked `.sql` files outside `supabase/migrations/`. Full-text inspection found table-creation statements only in the following test harnesses:

- `tests/c03-hybrid-config-release-harness.sql`: isolated fixture definitions for `auth.users`, `assessment_families`, `assessment_types`, `sessions`, `admin_users`, `admin_capabilities`, and `admin_audit_log`.
- `tests/p4-protected-function-harness.sql`: reduced fixture definitions for ten tables in the protected-completion path.
- `tests/wp-04-structured-result-persistence-harness.sql`: reduced fixture definitions for six result/persistence tables.
- `tests/wp-08-v1-assessment-reconstruction-harness.sql` and `tests/wp-08-v1-assessment-reconstruction-harness-safe.sql`: abbreviated test-only schemas for assessment content and execution tables, plus the test sentinel `_wp08_old_content_marker`.

The remaining four non-migration SQL files contain no `CREATE TABLE` declaration. These test fixtures are explicitly harness/test paths and their schemas are reduced or purpose-specific; they are **not** an authoritative full production schema and must not be used as a baseline. The tracked file `documentation/audit/migrations/superseded-unapplied-20261003233000-p5-assessment-lifecycle-correction.sql` defines/replaces a function but creates no table.

### Search for an authoritative original schema/source archive

- `documentation/architecture/ADR-003-database-schema-source-of-truth.md` is an accepted **decision to create and review a baseline later**, not the baseline artifact itself. It explicitly says the live schema must not be converted blindly and requires review of tables, policies, functions and grants before baseline creation.
- `documentation/audit/P2-migration-provenance-reconciliation-2026-10-01.md` records an earlier live/repository history discrepancy and cautions against blindly replaying migrations or inventing a baseline; it contains no full schema dump.
- `documentation/architecture/P3-PRODUCTION-MIGRATION-ROLLBACK-PROVENANCE-V1-2026-10-02.md` is a migration/design/provenance document with a provisional description for `assessment_results`, not a complete DDL snapshot of all 25 tables.
- The current repository tree contains no identified canonical full-schema dump/backup/baseline file. No authoritative original schema DDL was located in the inspected tracked tree. **This conclusion is limited to available repository artifacts; an external archive or backup has not been examined.**

### Exact main-to-production migration identity comparison

The read-only Supabase migration listing contains **57** applied version/name entries. Current `main` contains **56** SQL migration files:

| Comparison | Exact result |
|---|---|
| Source filename version + suffix matches live ledger version + name | **55** |
| Live ledger IDs with no same-version source path on `main` | `20261018075528 / c03_service_role_api_key_compatibility`; `20261018075855 / c03_verifier_api_key_compatibility` |
| Source path on `main` with no same-version live ledger entry | `supabase/migrations/20261018110000_c03_verifier_api_key_compatibility.sql` |
| Existing matching identity `20261018100000 / c03_service_role_api_key_compatibility` | Source path exists on `main` |

No other version/name identity mismatch was found in the current main file list vs the live ledger. The two missing source identities and one source-only file explain the 57-vs-56 count and remain unreconciled on `main`.

### PR #120 branch comparison — evidence only, not merged

PR #120 is still **OPEN / READY FOR REVIEW / UNMERGED** at head `47c0a79dbee108149f9431ff4e86ac120c420f7a`. That branch contains **58** migration files: every one of the 57 live ledger version/name identities has a source path, plus a new source-only proposed migration `20261018120000_wp11_security_database_reconciliation.sql`. It contains `20261018075528_c03_service_role_api_key_compatibility.sql` and `20261018075855_c03_verifier_api_key_compatibility.sql`, retains `20261018100000_c03_service_role_api_key_compatibility.sql`, and omits `20261018110000_c03_verifier_api_key_compatibility.sql`.

Source-file comparisons show:
- main `20261018100000` vs PR-branch `20261018075528`: source text is identical except the trailing final newline.
- main source-only `20261018110000` vs PR-branch `20261018075855`: one comment line differs, and the trailing final newline differs; SQL statements otherwise compare line-for-line identical.

These comparisons establish source text relationships only. The live Supabase migration listing exposes version/name entries, not each original applied SQL body, so this tool evidence cannot independently prove byte-for-byte equality to the SQL executed at the time. PR #120 remains separate from `main` and Production; no merge or migration application occurred during this scan.

### D-05 disposition and exact next action

**D-05 remains OPEN / BLOCKING RECONCILIATION. WP-11 remains IN PROGRESS / NOT CLOSED. WP-12 has NOT STARTED.**

The exhaustive migration file scan now identifies the exact 18 missing initial CREATE TABLE declarations and the exact migration identity discrepancy on main. Remaining evidence gaps are: (1) finding an authoritative external/original schema source, if one exists; (2) independently reviewing original applied SQL/provenance beyond the live version/name ledger; (3) reviewing the full function/RPC/grant/policy dependency graph and effective-role behavior; and (4) completing per-table caller and integrity review beyond text search.

Do not create a baseline from production catalog output, infer missing CREATE TABLE SQL, rewrite migration history, delete/recreate tables, apply any migration, alter grants/RLS/policies, merge PR #120, or start WP-12. Keep all unresolved provenance and dependency items OPEN.

## Application/code caller scan — batch 1 of 4

Pinned main tree de047e94a7ac5552bcbd0ad356e8ec73455adc2a. All 10 files below were fetched in full; the Git blob SHA is included. Only literal direct .from(table) calls are classified as direct Data API callers. RPC calls are listed separately because their table effects are indirect; query construction and dynamic SQL may require further review.

### .github/scripts/c02-value70-live-e2e-contract.test.js

- Blob SHA: ad5e02786504db77cd87126622d5a158868b57af; 70 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

### .github/scripts/c02-value70-live-e2e.mjs

- Blob SHA: 40601077572d4f7e5ec6db1dd090971e7962e7f8; 171 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

### .github/scripts/c03-github-oidc-token.mjs

- Blob SHA: 8cbf044d7debf8c6e76291b7abe130e0b4046c34; 25 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

### .github/scripts/c03-oidc-preflight.ts

- Blob SHA: 8656a409ea903ae9808f7797c8d8e6e8536b8cdc; 30 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

### .github/scripts/c03-production-e2e-cleanup.mjs

- Blob SHA: 3e7b036e6fd4546529f9c4494cdaf485f19af811; 149 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

### .github/scripts/c03-production-release.mjs

- Blob SHA: 4c5ec10f3c76e608e16e35a23c8305e67517ef89; 209 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

### .github/scripts/c03-release-attestation.mjs

- Blob SHA: 61a246f1791e11e959f18efeaded5fe7193f6621; 208 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

### admin-reception-assessment.html

- Blob SHA: 8c05c5d5950fb3062ef0df45d6505844d34e8386; 688 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

### admin/admin-session.js

- Blob SHA: cb7e98a9ef4beed75fafa8756277141f69e6d881; 205 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

### admin/admin.html

- Blob SHA: fec5101c731d3918722ce2494275da8c6c1f355e; 905 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

## Application/code caller scan — batch 2 of 4

Pinned main tree de047e94a7ac5552bcbd0ad356e8ec73455adc2a. All 10 files below were fetched in full; the Git blob SHA is included.

### admin/admin.js

- Blob SHA: a05d0986cee7e72cdf72faea9edbbfb39a3d383d; 191 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

### admin/assessment-editor-workspace.js

- Blob SHA: a32af54389e9a1a38c5f7303b88453e08f7a2c4b; 517 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

### admin/assessment-lifecycle.js

- Blob SHA: 95d4c8a05847ff9e2844f176ce14c7239c76f57a; 474 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

### admin/assessment-manager.js

- Blob SHA: ef196c1e078db867ac9d3d5296567c756ecab394; 1329 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

### assets/js/app.js

- Blob SHA: 5599aea059681931665d840138595dfc3d80cc14; 1095 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

### assets/js/report-interpretation.js

- Blob SHA: 6b3e06eae8f6c2d1eecb61cdeb4e70145fbb48ba; 242 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

### assets/js/report-validation.js

- Blob SHA: 6b63fd388474bd41c06fb614bdb8b2764f29a7c8; 206 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

### assets/js/supabase-client.js

- Blob SHA: bfaaddd4956d1e8b04bfae91ce72ee2b9fbd862c; 158 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

### clinic-performance.html

- Blob SHA: 9f09482fef452d0f14e5edd8720ac27a107069a8; 660 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

### comprehensive-clinic-assessment.html

- Blob SHA: f63fd08f28da683cd82319fb18b20f6cb39501fd; 689 lines.
- No literal direct `.from(table)` call to the 25 public tables found.

## Application/code caller scan — batch 3 of 4 (full-text call syntax)

Pinned main tree de047e94a7ac5552bcbd0ad356e8ec73455adc2a. This pass applies full-text regular expressions across line breaks for .from(), .rpc(), .invoke(), and adminService method calls.

### functions/_middleware.js

- Blob SHA: ff277f23be4f2aeb25926b358d5d8886deb37862; 65 lines.
- No literal direct table/RPC/invoke/adminService calls found by these patterns.

### index.html

- Blob SHA: f51d5d8b20fefea7f8f9acc9b5b559eb57a35a1c; 365 lines.
- No literal direct table/RPC/invoke/adminService calls found by these patterns.

### medical-team-assessment.html

- Blob SHA: e8983db8c9b6d5c4e2acea9ea84d90f6643bfbbf; 688 lines.
- No literal direct table/RPC/invoke/adminService calls found by these patterns.

### patient-journey.html

- Blob SHA: d73b8a3d876c2bb746fb4668d9c1a1eca12653a3; 689 lines.
- No literal direct table/RPC/invoke/adminService calls found by these patterns.

### supabase/functions/_shared/c03-github-oidc.ts

- Blob SHA: 077cb98cdd720a2c6b10ff7b960d6138bd57bc22; 79 lines.
- No literal direct table/RPC/invoke/adminService calls found by these patterns.

### supabase/functions/_shared/c03-runtime-attestation.ts

- Blob SHA: ba11538175124fdde0b615efdabfed2ed824a18d; 10 lines.
- No literal direct table/RPC/invoke/adminService calls found by these patterns.

### supabase/functions/admin-management/index.ts

- Blob SHA: fb62386933abcb3b5a0e8f37eb72ff5ca7dbcff4; 95 lines.
- RPC call: is_owner at line 26.
- RPC call: register_admin_assistant_secure at line 62.

### supabase/functions/assessment-access/assessment-calculation-pipeline.mts

- Blob SHA: 13e389734a60e9cddcc49d004b3f74e8d19908c8; 472 lines.
- No literal direct table/RPC/invoke/adminService calls found by these patterns.

### supabase/functions/assessment-access/assessment-config-digest.mjs

- Blob SHA: b263e42db889cebf8af6f0ce4f5da3ad7c16d4d4; 196 lines.
- No literal direct table/RPC/invoke/adminService calls found by these patterns.

### supabase/functions/assessment-access/component-aggregation-engine.mts

- Blob SHA: efbd8844addf01efca0209355692bed67e14c882; 222 lines.
- No literal direct table/RPC/invoke/adminService calls found by these patterns.

## Application/code caller scan — batch 4 of 4 (full-text call syntax)

Pinned main tree de047e94a7ac5552bcbd0ad356e8ec73455adc2a. This pass applies full-text regular expressions across line breaks for .from(), .rpc(), .invoke(), and adminService method calls.

### supabase/functions/assessment-access/consistency-engine.mts

- Blob SHA: 4ddbaa79693e4d655e1039d5af057ca7fa6b2aa1; 314 lines.
- No literal direct table/RPC/invoke/adminService calls found by these patterns.

### supabase/functions/assessment-access/coverage-criticality-engine.mts

- Blob SHA: 107a08c7c9c2a72a1523fa29a7368208fd796420; 163 lines.
- No literal direct table/RPC/invoke/adminService calls found by these patterns.

### supabase/functions/assessment-access/economic-opportunity-model-v1.mts

- Blob SHA: a9d03af7bba5fcad64416c8c7921c00319dee16d; 97 lines.
- No literal direct table/RPC/invoke/adminService calls found by these patterns.

### supabase/functions/assessment-access/engine.ts

- Blob SHA: a75ea54d8227621fd32823367227d35e8ff9cf0b; 541 lines.
- Direct table call: public.assessment_types at line 221.
- Direct table call: public.axes at line 228.
- Direct table call: public.questions at line 233.
- Direct table call: public.traps at line 240.
- Direct table call: public.assessment_families at line 251.
- Direct table call: public.options at line 261.
- Direct table call: public.sessions at line 360.
- Direct table call: public.answers at line 391.
- Direct table call: public.assessment_config_release_settings at line 439.
- Direct table call: public.assessment_config_releases at line 463.

### supabase/functions/assessment-access/index.ts

- Blob SHA: 76673b46a54cf98b5907fdc7e9f751745eebcd05; 1120 lines.
- Direct table call: public.assessment_session_access at line 74.
- Direct table call: public.assessment_types at line 96.
- Direct table call: public.axes at line 101.
- Direct table call: public.questions at line 106.
- Direct table call: public.options at line 111.
- Direct table call: public.traps at line 115.
- Direct table call: public.assessment_settings at line 216.
- Direct table call: public.leads at line 243.
- Direct table call: public.sessions at line 271.
- Direct table call: public.assessment_results at line 284.
- Direct table call: public.scores at line 301.
- Direct table call: public.assessment_types at line 334.
- Direct table call: public.assessment_families at line 349.
- Direct table call: public.leads at line 366.
- Direct table call: public.assessment_families at line 387.
- Direct table call: public.assessment_types at line 398.
- Direct table call: public.assessment_session_access at line 417.
- Direct table call: public.assessment_families at line 463.
- Direct table call: public.assessment_types at line 472.
- Direct table call: public.assessment_families at line 489.
- Direct table call: public.assessment_types at line 499.
- Direct table call: public.assessment_families at line 542.
- Direct table call: public.assessment_users at line 551.
- Direct table call: public.assessment_session_access at line 576.
- Direct table call: public.assessment_types at line 606.
- Direct table call: public.sessions at line 627.
- Direct table call: public.leads at line 660.
- Direct table call: public.leads at line 706.
- Direct table call: public.assessment_session_access at line 710.
- Direct table call: public.sessions at line 733.
- Direct table call: public.answers at line 741.
- Direct table call: public.assessment_session_access at line 747.
- Direct table call: public.assessment_results at line 752.
- Direct table call: public.sessions at line 807.
- Direct table call: public.assessment_session_access at line 826.
- Direct table call: public.sessions at line 840.
- Direct table call: public.assessment_results at line 851.
- Direct table call: public.leads at line 895.
- Direct table call: public.assessment_results at line 940.
- RPC call: start_assessment_session at line 686.
- RPC call: start_public_assessment_session at line 695.
- RPC call: save_assessment_answer at line 781.
- RPC call: prepare_assessment_submission at line 926.

### supabase/functions/assessment-access/report-interpretation.mjs

- Blob SHA: d50057cb926fd7c73db30081069af22a510c0316; 215 lines.
- No literal direct table/RPC/invoke/adminService calls found by these patterns.

### supabase/functions/assessment-access/response-scorer.mts

- Blob SHA: a46d99780bcdd6d9d4b83bc1950e698a3c224fbd; 206 lines.
- No literal direct table/RPC/invoke/adminService calls found by these patterns.

### supabase/functions/assessment-access/result-persistence-projection.mts

- Blob SHA: 491b0020c91ee2b8356f4bfd50ca77b93d1d7cb5; 38 lines.
- No literal direct table/RPC/invoke/adminService calls found by these patterns.

### supabase/functions/assessment-access/structured-result.mts

- Blob SHA: 28cc2c8f2318a123a00c947be03bd8a39556a529; 260 lines.
- No literal direct table/RPC/invoke/adminService calls found by these patterns.

### supabase/functions/assessment-config-release/index.ts

- Blob SHA: 14c4f3b85a2dcd608bd76bb2a0bb191abf220f39; 314 lines.
- Direct table call: public.assessment_config_release_settings at line 108.
- Direct table call: public.assessment_config_releases at line 112.
- Direct table call: public.assessment_families at line 113.
- Direct table call: public.assessment_config_releases at line 117.
- Direct table call: public.assessment_config_releases at line 261.
- RPC call: is_owner at line 33.
- RPC call: c03_require_ci_release_context at line 126.
- RPC call: register_assessment_config_release_ci_secure at line 196.
- RPC call: register_assessment_config_release_secure at line 203.
- RPC call: activate_existing_assessment_release_ci_secure at line 214.
- RPC call: activate_existing_assessment_release_secure at line 222.
- RPC call: publish_assessment_config_release_secure at line 234.
- RPC call: enable_assessment_config_release_gate_ci_secure at line 245.
- RPC call: enable_assessment_config_release_gate_secure at line 251.
- RPC call: verify_assessment_config_release_secure at line 271.

## Application/code caller scan — batch 1 of 4 (wrapper-aware)

Pinned main tree de047e94a7ac5552bcbd0ad356e8ec73455adc2a. This pass recognizes custom supabase-client methods (select/insert/update/delete/upsert/request), direct Supabase .from/.rpc calls, and REST paths, including multi-line call syntax. Test/workflow scripts are separately identified by path.

### .github/scripts/c02-value70-live-e2e-contract.test.js

- Blob SHA: ad5e02786504db77cd87126622d5a158868b57af; 70 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### .github/scripts/c02-value70-live-e2e.mjs

- Blob SHA: 40601077572d4f7e5ec6db1dd090971e7962e7f8; 171 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### .github/scripts/c03-github-oidc-token.mjs

- Blob SHA: 8cbf044d7debf8c6e76291b7abe130e0b4046c34; 25 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### .github/scripts/c03-oidc-preflight.ts

- Blob SHA: 8656a409ea903ae9808f7797c8d8e6e8536b8cdc; 30 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### .github/scripts/c03-production-e2e-cleanup.mjs

- Blob SHA: 3e7b036e6fd4546529f9c4494cdaf485f19af811; 149 lines.
- TABLE_REST_FETCH assessment_config_release_settings at line 57 (table); expression: /rest/v1/assessment_config_release_settings
- TABLE_REST_FETCH leads at line 62 (table); expression: /rest/v1/leads
- TABLE_REST_FETCH sessions at line 72 (table); expression: /rest/v1/sessions
- TABLE_REST_FETCH leads at line 85 (table); expression: /rest/v1/leads
- TABLE_REST_FETCH assessment_session_access at line 95 (table); expression: /rest/v1/assessment_session_access
- TABLE_REST_FETCH leads at line 106 (table); expression: /rest/v1/leads
- TABLE_REST_FETCH sessions at line 107 (table); expression: /rest/v1/sessions
- TABLE_REST_FETCH assessment_results at line 108 (table); expression: /rest/v1/assessment_results
- TABLE_REST_FETCH answers at line 109 (table); expression: /rest/v1/answers
- TABLE_REST_FETCH scores at line 110 (table); expression: /rest/v1/scores
- TABLE_REST_FETCH historical_snapshots at line 111 (table); expression: /rest/v1/historical_snapshots
- TABLE_REST_FETCH assessment_session_access at line 112 (table); expression: /rest/v1/assessment_session_access
- TABLE_REST_FETCH assessment_session_access at line 113 (table); expression: /rest/v1/assessment_session_access

### .github/scripts/c03-production-release.mjs

- Blob SHA: 4c5ec10f3c76e608e16e35a23c8305e67517ef89; 209 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### .github/scripts/c03-release-attestation.mjs

- Blob SHA: 61a246f1791e11e959f18efeaded5fe7193f6621; 208 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### admin-reception-assessment.html

- Blob SHA: 8c05c5d5950fb3062ef0df45d6505844d34e8386; 688 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### admin/admin-session.js

- Blob SHA: cb7e98a9ef4beed75fafa8756277141f69e6d881; 205 lines.
- TABLE_REST_FETCH admin_users at line 68 (table); expression: /rest/v1/admin_users

### admin/admin.html

- Blob SHA: fec5101c731d3918722ce2494275da8c6c1f355e; 905 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

## Application/code caller scan — batch 2 of 4 (wrapper-aware)

Pinned main tree de047e94a7ac5552bcbd0ad356e8ec73455adc2a. Full-text patterns include the project’s custom Supabase data wrapper.

### admin/admin.js

- Blob SHA: a05d0986cee7e72cdf72faea9edbbfb39a3d383d; 191 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### admin/assessment-editor-workspace.js

- Blob SHA: a32af54389e9a1a38c5f7303b88453e08f7a2c4b; 517 lines.
- TABLE_SELECT assessment_types at line 97 (table); expression: .select('assessment_types'
- TABLE_SELECT axes at line 101 (table); expression: .select('axes'
- TABLE_SELECT questions at line 102 (table); expression: .select('questions'
- TABLE_REQUEST options at line 105 (table); expression: options?select=*&question_id=in.(
- TABLE_SELECT assessment_families at line 107 (table); expression: .select('assessment_families'
- RPC validate_assessment_version_secure at line 430 (RPC function); expression: rpc/validate_assessment_version_secure
- RPC save_assessment_secure at line 464 (RPC function); expression: rpc/save_assessment_secure

### admin/assessment-lifecycle.js

- Blob SHA: 95d4c8a05847ff9e2844f176ce14c7239c76f57a; 474 lines.
- RPC update_draft_axis_secure at line 33 (RPC function); expression: rpc/update_draft_axis_secure
- RPC update_draft_question_secure at line 63 (RPC function); expression: rpc/update_draft_question_secure
- RPC update_draft_option_secure at line 94 (RPC function); expression: rpc/update_draft_option_secure
- RPC update_published_axis_content_secure at line 119 (RPC function); expression: rpc/update_published_axis_content_secure
- RPC update_published_question_text_secure at line 134 (RPC function); expression: rpc/update_published_question_text_secure
- RPC update_published_option_text_secure at line 149 (RPC function); expression: rpc/update_published_option_text_secure
- RPC update_draft_question_text_secure at line 164 (RPC function); expression: rpc/update_draft_question_text_secure
- TABLE_SELECT axes at line 185 (table); expression: .select('axes'
- RPC save_axis_secure at line 187 (RPC function); expression: rpc/save_axis_secure
- TABLE_SELECT questions at line 200 (table); expression: .select('questions'
- RPC save_question_secure at line 202 (RPC function); expression: rpc/save_question_secure
- RPC add_option_secure at line 225 (RPC function); expression: rpc/add_option_secure
- RPC delete_draft_question_secure at line 248 (RPC function); expression: rpc/delete_draft_question_secure
- RPC delete_draft_axis_secure at line 259 (RPC function); expression: rpc/delete_draft_axis_secure
- RPC update_draft_calculation_config_secure at line 294 (RPC function); expression: rpc/update_draft_calculation_config_secure
- RPC delete_option_secure at line 350 (RPC function); expression: rpc/delete_option_secure
- RPC stop_public_assessment_secure at line 365 (RPC function); expression: rpc/stop_public_assessment_secure
- RPC archive_assessment_secure at line 389 (RPC function); expression: rpc/archive_assessment_secure
- RPC resume_public_assessment_secure at line 404 (RPC function); expression: rpc/resume_public_assessment_secure
- RPC restore_public_assessment_secure at line 418 (RPC function); expression: rpc/restore_public_assessment_secure
- RPC delete_assessment_draft_secure at line 443 (RPC function); expression: rpc/delete_assessment_draft_secure

### admin/assessment-manager.js

- Blob SHA: ef196c1e078db867ac9d3d5296567c756ecab394; 1329 lines.
- TABLE_SELECT assessment_types at line 30 (table); expression: .select('assessment_types'
- TABLE_SELECT assessment_families at line 31 (table); expression: .select('assessment_families'
- RPC get_owner_admin_audit_secure at line 85 (RPC function); expression: rpc/get_owner_admin_audit_secure
- TABLE_SELECT assessment_types at line 226 (table); expression: .select('assessment_types'
- TABLE_SELECT assessment_families at line 227 (table); expression: .select('assessment_families'
- TABLE_SELECT assessment_settings at line 230 (table); expression: .select('assessment_settings'
- RPC get_admin_assessment_session_counts_secure at line 231 (RPC function); expression: rpc/get_admin_assessment_session_counts_secure
- RPC toggle_assessment_auth_secure at line 282 (RPC function); expression: rpc/toggle_assessment_auth_secure
- RPC generate_assessment_user_secure at line 315 (RPC function); expression: rpc/generate_assessment_user_secure
- RPC save_assessment_secure at line 355 (RPC function); expression: rpc/save_assessment_secure
- RPC create_assessment_version_secure at line 379 (RPC function); expression: rpc/create_assessment_version_secure
- RPC publish_assessment_version_secure at line 396 (RPC function); expression: rpc/publish_assessment_version_secure
- RPC save_axis_secure at line 514 (RPC function); expression: rpc/save_axis_secure
- RPC save_question_secure at line 533 (RPC function); expression: rpc/save_question_secure
- RPC import_assessment_secure at line 557 (RPC function); expression: rpc/import_assessment_secure
- RPC update_option_secure at line 578 (RPC function); expression: rpc/update_option_secure
- TABLE_SELECT options at line 590 (table); expression: .select('options'
- RPC add_option_secure at line 600 (RPC function); expression: rpc/add_option_secure
- RPC delete_option_secure at line 623 (RPC function); expression: rpc/delete_option_secure
- TABLE_SELECT leads at line 640 (table); expression: .select('leads'
- TABLE_SELECT admin_users at line 804 (table); expression: .select('admin_users'
- TABLE_SELECT admin_capabilities at line 805 (table); expression: .select('admin_capabilities'
- RPC update_admin_assistant_profile_secure at line 892 (RPC function); expression: rpc/update_admin_assistant_profile_secure
- RPC grant_admin_capability_secure at line 901 (RPC function); expression: rpc/grant_admin_capability_secure
- RPC revoke_admin_capability_secure at line 909 (RPC function); expression: rpc/revoke_admin_capability_secure
- RPC set_admin_active_secure at line 933 (RPC function); expression: rpc/set_admin_active_secure
- TABLE_SELECT leads at line 1139 (table); expression: .select('leads'
- RPC get_admin_report_sessions_secure at line 1153 (RPC function); expression: rpc/get_admin_report_sessions_secure
- TABLE_SELECT scores at line 1157 (table); expression: .select('scores'
- TABLE_SELECT axes at line 1158 (table); expression: .select('axes'
- RPC get_admin_assessment_result_secure at line 1173 (RPC function); expression: rpc/get_admin_assessment_result_secure

### assets/js/app.js

- Blob SHA: 5599aea059681931665d840138595dfc3d80cc14; 1095 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### assets/js/report-interpretation.js

- Blob SHA: 6b3e06eae8f6c2d1eecb61cdeb4e70145fbb48ba; 242 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### assets/js/report-validation.js

- Blob SHA: 6b63fd388474bd41c06fb614bdb8b2764f29a7c8; 206 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### assets/js/supabase-client.js

- Blob SHA: bfaaddd4956d1e8b04bfae91ce72ee2b9fbd862c; 158 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### clinic-performance.html

- Blob SHA: 9f09482fef452d0f14e5edd8720ac27a107069a8; 660 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### comprehensive-clinic-assessment.html

- Blob SHA: f63fd08f28da683cd82319fb18b20f6cb39501fd; 689 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

## Application/code caller scan — batch 3 of 4 (wrapper-aware)

Pinned main tree de047e94a7ac5552bcbd0ad356e8ec73455adc2a. Full-text patterns include custom Supabase client wrappers and direct Edge Function SDK calls.

### functions/_middleware.js

- Blob SHA: ff277f23be4f2aeb25926b358d5d8886deb37862; 65 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### index.html

- Blob SHA: f51d5d8b20fefea7f8f9acc9b5b559eb57a35a1c; 365 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### medical-team-assessment.html

- Blob SHA: e8983db8c9b6d5c4e2acea9ea84d90f6643bfbbf; 688 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### patient-journey.html

- Blob SHA: d73b8a3d876c2bb746fb4668d9c1a1eca12653a3; 689 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### supabase/functions/_shared/c03-github-oidc.ts

- Blob SHA: 077cb98cdd720a2c6b10ff7b960d6138bd57bc22; 79 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### supabase/functions/_shared/c03-runtime-attestation.ts

- Blob SHA: ba11538175124fdde0b615efdabfed2ed824a18d; 10 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### supabase/functions/admin-management/index.ts

- Blob SHA: fb62386933abcb3b5a0e8f37eb72ff5ca7dbcff4; 95 lines.
- RPC is_owner at line 26 (RPC function); expression: .rpc("is_owner"
- RPC register_admin_assistant_secure at line 62 (RPC function); expression: .rpc(
        "register_admin_assistant_secure"

### supabase/functions/assessment-access/assessment-calculation-pipeline.mts

- Blob SHA: 13e389734a60e9cddcc49d004b3f74e8d19908c8; 472 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### supabase/functions/assessment-access/assessment-config-digest.mjs

- Blob SHA: b263e42db889cebf8af6f0ce4f5da3ad7c16d4d4; 196 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### supabase/functions/assessment-access/component-aggregation-engine.mts

- Blob SHA: efbd8844addf01efca0209355692bed67e14c882; 222 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

## Application/code caller scan — batch 4 of 4 (wrapper-aware)

Pinned main tree de047e94a7ac5552bcbd0ad356e8ec73455adc2a. Full-text patterns include custom Supabase client wrappers and direct Edge Function SDK calls.

### supabase/functions/assessment-access/consistency-engine.mts

- Blob SHA: 4ddbaa79693e4d655e1039d5af057ca7fa6b2aa1; 314 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### supabase/functions/assessment-access/coverage-criticality-engine.mts

- Blob SHA: 107a08c7c9c2a72a1523fa29a7368208fd796420; 163 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### supabase/functions/assessment-access/economic-opportunity-model-v1.mts

- Blob SHA: a9d03af7bba5fcad64416c8c7921c00319dee16d; 97 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### supabase/functions/assessment-access/engine.ts

- Blob SHA: a75ea54d8227621fd32823367227d35e8ff9cf0b; 541 lines.
- TABLE_FROM assessment_types at line 221 (table); expression: .from("assessment_types"
- TABLE_FROM axes at line 228 (table); expression: .from("axes"
- TABLE_FROM questions at line 233 (table); expression: .from("questions"
- TABLE_FROM traps at line 240 (table); expression: .from("traps"
- TABLE_FROM assessment_families at line 251 (table); expression: .from("assessment_families"
- TABLE_FROM options at line 261 (table); expression: .from("options"
- TABLE_FROM sessions at line 360 (table); expression: .from("sessions"
- TABLE_FROM answers at line 391 (table); expression: .from("answers"
- TABLE_FROM assessment_config_release_settings at line 439 (table); expression: .from("assessment_config_release_settings"
- TABLE_FROM assessment_config_releases at line 463 (table); expression: .from("assessment_config_releases"

### supabase/functions/assessment-access/index.ts

- Blob SHA: 76673b46a54cf98b5907fdc7e9f751745eebcd05; 1120 lines.
- TABLE_FROM assessment_session_access at line 74 (table); expression: .from("assessment_session_access"
- TABLE_FROM assessment_types at line 96 (table); expression: .from("assessment_types"
- TABLE_FROM axes at line 101 (table); expression: .from("axes"
- TABLE_FROM questions at line 106 (table); expression: .from("questions"
- TABLE_FROM options at line 111 (table); expression: .from("options"
- TABLE_FROM traps at line 115 (table); expression: .from("traps"
- TABLE_FROM assessment_settings at line 216 (table); expression: .from("assessment_settings"
- TABLE_FROM leads at line 243 (table); expression: .from("leads"
- TABLE_FROM sessions at line 271 (table); expression: .from("sessions"
- TABLE_FROM assessment_results at line 284 (table); expression: .from("assessment_results"
- TABLE_FROM scores at line 301 (table); expression: .from("scores"
- TABLE_FROM assessment_types at line 334 (table); expression: .from("assessment_types"
- TABLE_FROM assessment_families at line 349 (table); expression: .from("assessment_families"
- TABLE_FROM leads at line 366 (table); expression: .from("leads"
- TABLE_FROM assessment_families at line 387 (table); expression: .from("assessment_families"
- TABLE_FROM assessment_types at line 398 (table); expression: .from("assessment_types"
- TABLE_FROM assessment_session_access at line 417 (table); expression: .from("assessment_session_access"
- TABLE_FROM assessment_families at line 463 (table); expression: .from("assessment_families"
- TABLE_FROM assessment_types at line 472 (table); expression: .from("assessment_types"
- TABLE_FROM assessment_families at line 489 (table); expression: .from("assessment_families"
- TABLE_FROM assessment_types at line 499 (table); expression: .from("assessment_types"
- TABLE_FROM assessment_families at line 542 (table); expression: .from("assessment_families"
- TABLE_FROM assessment_users at line 551 (table); expression: .from("assessment_users"
- TABLE_FROM assessment_session_access at line 576 (table); expression: .from("assessment_session_access"
- TABLE_FROM assessment_types at line 606 (table); expression: .from("assessment_types"
- TABLE_FROM sessions at line 627 (table); expression: .from("sessions"
- TABLE_FROM leads at line 660 (table); expression: .from("leads"
- RPC start_assessment_session at line 686 (RPC function); expression: .rpc("start_assessment_session"
- RPC start_public_assessment_session at line 695 (RPC function); expression: .rpc("start_public_assessment_session"
- TABLE_FROM leads at line 706 (table); expression: .from("leads"
- TABLE_FROM assessment_session_access at line 710 (table); expression: .from("assessment_session_access"
- TABLE_FROM sessions at line 733 (table); expression: .from("sessions"
- TABLE_FROM answers at line 741 (table); expression: .from("answers"
- TABLE_FROM assessment_session_access at line 747 (table); expression: .from("assessment_session_access"
- TABLE_FROM assessment_results at line 752 (table); expression: .from("assessment_results"
- RPC save_assessment_answer at line 781 (RPC function); expression: .rpc("save_assessment_answer"
- TABLE_FROM sessions at line 807 (table); expression: .from("sessions"
- TABLE_FROM assessment_session_access at line 826 (table); expression: .from("assessment_session_access"
- TABLE_FROM sessions at line 840 (table); expression: .from("sessions"
- TABLE_FROM assessment_results at line 851 (table); expression: .from("assessment_results"
- TABLE_FROM leads at line 895 (table); expression: .from("leads"
- RPC prepare_assessment_submission at line 926 (RPC function); expression: .rpc("prepare_assessment_submission"
- TABLE_FROM assessment_results at line 940 (table); expression: .from("assessment_results"

### supabase/functions/assessment-access/report-interpretation.mjs

- Blob SHA: d50057cb926fd7c73db30081069af22a510c0316; 215 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### supabase/functions/assessment-access/response-scorer.mts

- Blob SHA: a46d99780bcdd6d9d4b83bc1950e698a3c224fbd; 206 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### supabase/functions/assessment-access/result-persistence-projection.mts

- Blob SHA: 491b0020c91ee2b8356f4bfd50ca77b93d1d7cb5; 38 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### supabase/functions/assessment-access/structured-result.mts

- Blob SHA: 28cc2c8f2318a123a00c947be03bd8a39556a529; 260 lines.
- No literal table/RPC call was found by the wrapper-aware patterns.

### supabase/functions/assessment-config-release/index.ts

- Blob SHA: 14c4f3b85a2dcd608bd76bb2a0bb191abf220f39; 314 lines.
- RPC is_owner at line 33 (RPC function); expression: .rpc("is_owner"
- TABLE_FROM assessment_config_release_settings at line 108 (table); expression: .from("assessment_config_release_settings"
- TABLE_FROM assessment_config_releases at line 112 (table); expression: .from("assessment_config_releases"
- TABLE_FROM assessment_families at line 113 (table); expression: .from("assessment_families"
- TABLE_FROM assessment_config_releases at line 117 (table); expression: .from("assessment_config_releases"
- RPC c03_require_ci_release_context at line 126 (RPC function); expression: .rpc("c03_require_ci_release_context"
- RPC register_assessment_config_release_ci_secure at line 196 (RPC function); expression: .rpc("register_assessment_config_release_ci_secure"
- RPC register_assessment_config_release_secure at line 203 (RPC function); expression: .rpc("register_assessment_config_release_secure"
- RPC activate_existing_assessment_release_ci_secure at line 214 (RPC function); expression: .rpc("activate_existing_assessment_release_ci_secure"
- RPC activate_existing_assessment_release_secure at line 222 (RPC function); expression: .rpc("activate_existing_assessment_release_secure"
- RPC publish_assessment_config_release_secure at line 234 (RPC function); expression: .rpc(
          "publish_assessment_config_release_secure"
- RPC enable_assessment_config_release_gate_ci_secure at line 245 (RPC function); expression: .rpc("enable_assessment_config_release_gate_ci_secure"
- RPC enable_assessment_config_release_gate_secure at line 251 (RPC function); expression: .rpc("enable_assessment_config_release_gate_secure"
- TABLE_FROM assessment_config_releases at line 261 (table); expression: .from("assessment_config_releases"
- RPC verify_assessment_config_release_secure at line 271 (RPC function); expression: .rpc(
          "verify_assessment_config_release_secure"


## Consolidated active-code caller crosswalk — wrapper-aware scan of 40 source/entrypoint files — 2026-10-20

This pass scanned all 40 tracked files in the active browser/admin/Edge Function/Pages middleware and release/cleanup script paths listed in the main tree. It matches full text across line breaks and recognizes this project’s custom client wrappers: select/insert/update/delete/upsert, request('rpc/...'), Supabase .from()/.rpc(), REST /rest/v1 URLs, and Edge invoke calls. Git blob SHAs and line-specific matches are recorded in the four wrapper-aware batches immediately below this section. The preliminary first two code-search batches above used simpler line-local patterns; where they reported no call, do not infer no caller—the wrapper-aware batches supersede those preliminary zero-hit entries.

| Live public table | Active browser/admin caller evidence | Server/Edge caller evidence | Test/operational-only or unresolved notes |
|---|---|---|---|
| admin_audit_log | No direct browser/admin table read found. admin/assessment-manager.js calls get_owner_admin_audit_secure (line 85). | Stored get_owner_admin_audit_secure and write_admin_audit function bodies reference this table; the latter is called by secure admin mutation functions. | The direct table/API access route is not a browser query in the caller scan; permission correctness still needs effective-role verification. |
| admin_capabilities | admin/assessment-manager.js selects admin_capabilities (line 805); it calls grant/revoke capability RPCs at lines 901/909. | admin-management/index.ts calls is_owner (line 26) and register_admin_assistant_secure (line 62); stored functions grant/revoke/read capabilities. | No direct client mutation path was found by this scan. |
| admin_users | admin/admin-session.js performs a REST read from /rest/v1/admin_users (line 68); admin/assessment-manager.js selects admin_users (line 804). | admin-management/index.ts calls is_owner and register_admin_assistant_secure; other owner/admin RPCs also use this identity table. | Current code has a direct admin-user identity read; effective authorization must be tested, not inferred from caller presence. |
| answers | No direct browser table query found. | supabase/functions/assessment-access/engine.ts reads answers (line 391); assessment-access/index.ts reads answers (line 741) and calls save_assessment_answer (line 781) and prepare_assessment_submission (line 926). | Synthetic/cleanup SQL has test-only references. |
| assessment_assets | No direct browser/admin/Edge literal table caller found in the 40 scanned files. | Stored version-copy/delete and immutability functions reference the table in migrations; no current direct Edge .from() call was found. | WP-08 harnesses reference a reduced fixture. No-use or deletion conclusion is not supported; keep OPEN. |
| assessment_config_release_settings | No ordinary browser/admin direct caller found. | assessment-access/engine.ts reads it (line 439); assessment-config-release/index.ts reads it (line 108). | .github/scripts/c03-production-e2e-cleanup.mjs references it (line 57) in a run-scoped operational script; that script was not executed during this scan. |
| assessment_config_releases | No ordinary browser/admin direct caller found. | assessment-access/engine.ts reads it (line 463); assessment-config-release/index.ts reads it (lines 112, 117, 261) and calls release registration/verification/activation RPCs. | Operational cleanup script contains run-scoped references; no cleanup was run. |
| assessment_families | admin/assessment-manager.js selects it (lines 31, 227); admin/assessment-editor-workspace.js selects it (line 107). | assessment-access/engine.ts reads it (line 251); assessment-access/index.ts accesses it at lines 349, 387, 463, 489, 542; assessment-config-release/index.ts reads it (line 113). | Stored secure publication/version functions additionally depend on this table. |
| assessment_results | admin/assessment-manager.js calls get_admin_assessment_result_secure (line 1173), not a direct raw table select in the active report path. | assessment-access/index.ts reads/writes the result surface at lines 284, 752, 851, 940. | Cleanup script and WP harnesses include exact synthetic/test-only references; cleanup was not executed. |
| assessment_session_access | No direct browser/admin table caller found. | assessment-access/index.ts has table calls at lines 74, 417, 576, 710, 747, 826; protected-session RPCs also depend on this table. | C-03 cleanup script has run-scoped references at lines 95, 112, 113; no cleanup was run. |
| assessment_settings | admin/assessment-manager.js selects it (line 230). | assessment-access/index.ts reads it (line 216). | Live rows exist; no finding of disuse is made. |
| assessment_types | admin/assessment-manager.js selects it (lines 30, 226); admin/assessment-editor-workspace.js selects it (line 97). | assessment-access/engine.ts reads it (line 221); assessment-access/index.ts references it at lines 96, 334, 398, 472, 499, 606. | Central version/configuration table; numerous secure lifecycle functions also reference it. |
| assessment_users | No direct browser/admin table select found in the 40 scanned paths. | assessment-access/index.ts reads/writes it at line 551 and uses assessment-user session/auth paths. | Secure generation/RPC functions provide indirect writes. |
| axes | admin/assessment-manager.js selects it (line 1158); admin/assessment-editor-workspace.js selects it (line 101); admin/assessment-lifecycle.js selects it (line 185). | assessment-access/engine.ts reads it (line 228); assessment-access/index.ts reads it (line 101). | Report/rendering modules consume projected axis facts, not necessarily the database table directly. |
| experience_multipliers | No literal direct table/RPC caller found in the 40 active/operational source paths. | No current direct Edge .from() caller found in the scanned core paths. | Live table has rows. Absence of a literal caller in this scoped scan is not proof of disuse; classify OPEN and do not delete. |
| historical_snapshots | No current browser/admin/Edge runtime caller found in the 40 scanned source paths. | No direct Edge .from() caller found in the active assessment runtime files. | Referenced by WP-08 test harnesses and the operational cleanup script (line 111); those are not proof of runtime use. Keep OPEN pending full external/dynamic dependency review. |
| insights_mapping | No literal direct browser/admin/Edge table call found in the 40 scanned source paths. | Version copy/delete/immutability SQL function bodies refer to this table; the table is included in the WP-08 harness fixture. | No-use/deletion conclusion is not supported; dynamic/secure RPC callers require further review. |
| leads | admin/assessment-manager.js selects leads at lines 640 and 1139. | assessment-access/index.ts reads/writes leads at lines 243, 366, 660, 706, 895. | C-03 cleanup script contains run-scoped REST references at lines 62, 85, 106; no cleanup was run. |
| options | admin/assessment-manager.js selects it at line 590; admin/assessment-editor-workspace.js requests option rows at line 105. | assessment-access/engine.ts reads it (line 261); assessment-access/index.ts reads it (line 111). | admin/assessment-lifecycle.js calls secure option RPCs including update_draft_option_secure, add_option_secure, delete_option_secure and related lifecycle actions. |
| questions | admin/assessment-editor-workspace.js selects questions (line 102); admin/assessment-lifecycle.js selects by axis (line 200). | assessment-access/engine.ts reads questions (line 233); assessment-access/index.ts reads them (line 106). | Secure question lifecycle/copy/delete functions also reference it. |
| scores | admin/assessment-manager.js selects scores (line 1157) for the admin report’s legacy/historical path. | assessment-access/index.ts reads/persists score surface at line 301. | Cleanup script has run-scoped REST reference at line 110; no cleanup was run. |
| sessions | No direct browser/admin table select found in the scan. | assessment-access/engine.ts reads session context (line 360); assessment-access/index.ts accesses sessions at lines 271, 627, 733, 807, 840. | Cleanup script includes run-scoped references (lines 72, 107); it was not run. |
| specialty_profiles | No literal table/RPC caller found in the 40 scanned active/operational source paths. | No direct Edge .from() caller found. | Live rows exist. No-use/deletion conclusion is not supported; keep OPEN. |
| team_capacity_factors | No literal table/RPC caller found in the 40 scanned active/operational source paths. | No direct Edge .from() caller found. | Live rows exist. No-use/deletion conclusion is not supported; keep OPEN. |
| traps | No direct browser/admin table read found. | assessment-access/engine.ts reads it (line 240); assessment-access/index.ts reads it (line 115). | Version lifecycle/copy/immutability SQL functions also reference it; current row count alone does not define intended future use. |

### Caller-scan boundary

The above is a caller trace for the 40 tracked application/entrypoint/operational files specified by directory and extension in the main tree at the pinned commit. It does not include every test, historical/reference fixture, Markdown example, external caller, dynamically named table, or runtime-generated SQL expression. Those are separated from active application calls in the notes above. Before any unused-object or least-privilege conclusion, expand any indirect path with a reachable caller to its full function body and effective privileges. No tests were executed and the operational cleanup script was not run as part of this read-only caller scan.


## Effective table/function privilege evidence — read-only Supabase catalog query — 2026-10-20

### Effective table grants for exposed-role identities

A read-only `has_table_privilege` query checked direct effective privileges for roles `anon` and `authenticated` across the 25 public tables. The query filtered to tables with either direct `anon` SELECT/INSERT/UPDATE/DELETE, or `authenticated` MAINTAIN/REFERENCES/TRIGGER/TRUNCATE/INSERT/UPDATE/DELETE. Only two tables were returned:

| Table | anon SELECT/INSERT/UPDATE/DELETE | authenticated SELECT | authenticated INSERT/UPDATE/DELETE | authenticated MAINTAIN | authenticated REFERENCES | authenticated TRIGGER | authenticated TRUNCATE |
|---|---|---:|---|---:|---:|---:|---:|
| `public.admin_audit_log` | all false | true | all false | true | true | true | true |
| `public.admin_capabilities` | all false | true | all false | true | true | true | true |

The filtered query returned no other public table with these directly granted effective privileges. `service_role` retains its expected broad table privileges (queried separately while building the per-table inventory). RLS remains enabled for all public tables; this does not neutralize privileged table-level operations such as TRUNCATE. This is live **finding evidence**, not permission to repair it here. It matches the D-08 privilege issue addressed by the unmerged PR #120 candidate; the bounded candidate has not been merged/applied, and no grant was changed in this session.

### Effective execute privilege on the existing admin identity helpers

Read-only catalog evidence for `SECURITY DEFINER` helpers:

| Function | SECURITY DEFINER / search_path | anon EXECUTE | authenticated EXECUTE | service_role EXECUTE |
|---|---|---:|---:|---:|
| `public.is_active_admin()` | true; `search_path=public, pg_temp` | false | true | true |
| `public.is_active_admin(uuid)` | true; `search_path=""` | false | true | true |
| `public.is_owner()` | true; `search_path=public, pg_temp` | false | true | true |
| `public.is_owner(uuid)` | true; `search_path=""` | false | true | true |

The current active policies in the live catalog can use the zero-argument identity helpers; the UUID overloads accept an arbitrary identity argument. Authenticated EXECUTE remains true for these UUID overloads in Production at this query time, which is an evidenced D-15 authorization-boundary concern already scoped by PR #120. No policy/grant/function was modified in this session. The correctness of all 87 public stored functions and their effective grants is not established by this four-function sample; that broader review remains OPEN.

### Dynamic authoritative completion RPC caller confirmed

A line-range recheck of `supabase/functions/assessment-access/index.ts:970–1060` shows that the completion RPC is chosen dynamically by `access.assessment_user_id`:

- `complete_p4_assessment_from_result` for protected assessment users.
- `complete_p4_public_assessment_from_result` for the public flow.
- The dynamic caller is `supabase.rpc(rpcName, rpcPayload)` at line 1032 and persists the server-produced Structured Result.

The wrapper-aware caller scan's static-literal RPC list did not find this dynamic RPC name at the call expression. The continuation code has now been read directly and this dynamic dependency is recorded here. Continue treating regex scans as navigation aids, not a complete program analysis.

### Disposition

D-05 remains **OPEN / BLOCKING RECONCILIATION**. WP-11 remains IN PROGRESS and not closed. The live excess grants on `admin_audit_log` and `admin_capabilities`, plus authenticated EXECUTE on `is_owner(uuid)` and `is_active_admin(uuid)`, are evidenced, but no corrections have been applied. PR #120 remains OPEN / READY FOR REVIEW / UNMERGED; its proposed grant/policy migration is not part of main or Production. Do not modify privileges or apply migrations within this read-only reconciliation. WP-12 has NOT STARTED.


## Complete direct table-grant matrix — `anon`, `authenticated`, and `service_role` — 2026-10-20

This is a second read-only privilege pass across **all 25** live public tables, using PostgreSQL `has_table_privilege` for SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and MAINTAIN. The privileges listed are effective direct table privileges; they do not replace analysis of RLS policies, function EXECUTE privileges, membership/inherited roles, views, or function behavior.

| Table | anon direct table privileges | authenticated direct table privileges | service_role direct table privileges | RLS | FORCE RLS |
|---|---|---|---|---:|---:|
| `admin_audit_log` | none of the queried privileges | SELECT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE | SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN | enabled | no |
| `admin_capabilities` | none of the queried privileges | SELECT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE | SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN | enabled | no |
| `admin_users` | none | SELECT | full queried privilege set | enabled | no |
| `answers` | none | SELECT | full queried privilege set | enabled | no |
| `assessment_assets` | none | none | full queried privilege set | enabled | no |
| `assessment_config_release_settings` | none | none | full queried privilege set | enabled | no |
| `assessment_config_releases` | none | none | full queried privilege set | enabled | no |
| `assessment_families` | none | SELECT | full queried privilege set | enabled | no |
| `assessment_results` | none | none | full queried privilege set | enabled | no |
| `assessment_session_access` | none | none | full queried privilege set | enabled | no |
| `assessment_settings` | none | SELECT | full queried privilege set | enabled | no |
| `assessment_types` | none | SELECT | full queried privilege set | enabled | no |
| `assessment_users` | none | none | full queried privilege set | enabled | no |
| `axes` | none | SELECT | full queried privilege set | enabled | no |
| `experience_multipliers` | none | none | full queried privilege set | enabled | no |
| `historical_snapshots` | none | none | full queried privilege set | enabled | no |
| `insights_mapping` | none | none | full queried privilege set | enabled | no |
| `leads` | none | SELECT | full queried privilege set | enabled | no |
| `options` | none | SELECT | full queried privilege set | enabled | no |
| `questions` | none | SELECT | full queried privilege set | enabled | no |
| `scores` | none | SELECT | full queried privilege set | enabled | no |
| `sessions` | none | none | full queried privilege set | enabled | no |
| `specialty_profiles` | none | none | full queried privilege set | enabled | no |
| `team_capacity_factors` | none | none | full queried privilege set | enabled | no |
| `traps` | none | none | full queried privilege set | enabled | no |

Here, “none” means no direct privilege among the eight queried privileges. “Full queried privilege set” means service_role has all eight queried privileges, as returned by the live query. In total, no `anon` direct table privileges were found on any of the 25 tables; authenticated had direct SELECT on 12 tables and no direct INSERT/UPDATE/DELETE in this table-level query. The only unexpected/decision-relevant direct table grants surfaced by this query are MAINTAIN, REFERENCES, TRIGGER and TRUNCATE on `admin_audit_log` and `admin_capabilities` for `authenticated`. This is direct-grant evidence for D-08; it is not an implementation request or permission to change Production.

### Boundary of this privilege pass

The result does not establish the effective outcome of each RLS policy for every user/role claim. No `SET ROLE` negative/positive query was run, and no DML attempt was made. `authenticated` can also execute the UUID overloads `public.is_owner(uuid)` and `public.is_active_admin(uuid)` (both SECURITY DEFINER; `anon` cannot); these are separately recorded above as the D-15 evidence. The live role grant state and function body/authz correctness remain OPEN pending owner-approved remediation/review and appropriate verification. No SQL write or role/policy/grant change occurred.


## Public function EXECUTE grant summary — 2026-10-20, read-only

A fresh catalog query across all 87 public functions/procedures returned:

| Aggregate | Exact result |
|---|---:|
| Public functions/procedures | 87 |
| SECURITY DEFINER functions/procedures | 65 |
| Functions/procedures callable by `anon` | 2 |
| SECURITY DEFINER functions/procedures callable by `anon` | 0 |
| Functions/procedures callable by `authenticated` | 53 |
| SECURITY DEFINER functions/procedures callable by `authenticated` | 51 |

The two functions currently reported as EXECUTE-callable by `anon` are `public.p2_assert_draft_version()` and `public.p2_assessment_type_immutability()`. Both are non-SECURITY-DEFINER trigger functions (`prosecdef=false`, `search_path=""`); both also show authenticated EXECUTE. This inventory is a direct-grant/reachability marker, not a claim those trigger functions are safely callable as ordinary RPCs or that a vulnerability was demonstrated. Trigger-function direct invocation behavior and why EXECUTE remains granted should be verified before any change.

`public.is_owner()` and `public.is_active_admin()` plus their UUID overloads are SECURITY DEFINER. `anon` EXECUTE is false on all four. `authenticated` EXECUTE is true on all four; the UUID overloads accept a caller-supplied UUID and are the documented D-15 review point. No function grants were changed. This query summarizes privileges, not the correctness of each function's authorization logic or search path; all 65 SECURITY DEFINER functions and their full reachable callers require a fuller function-level review before WP-11 can close.



## Read-only referential and cross-table integrity checks — 2026-10-20

### Foreign-key orphan scan

A read-only query enumerated all 38 foreign-key constraints whose source table is in `public`; all 38 are `convalidated=true`. A second read-only query was generated from the live catalog metadata and executed one `NOT EXISTS` check per constraint. For each FK it counted source rows where all FK columns were non-null and no target row matched all referenced columns. **Result: 38/38 checks returned zero orphan rows; 0 unvalidated FKs.** The full per-constraint output (constraint name, source table, target table, orphan count) follows:

| Constraint | Source table | Target table | Orphan rows |
|---|---|---|---:|
| `admin_audit_log_actor_user_id_fkey` | `admin_audit_log` | `auth.users` | 0 |
| `admin_audit_log_family_id_fkey` | `admin_audit_log` | `public.assessment_families` | 0 |
| `admin_capabilities_granted_by_fkey` | `admin_capabilities` | `auth.users` | 0 |
| `admin_capabilities_user_id_fkey` | `admin_capabilities` | `auth.users` | 0 |
| `admin_users_created_by_fkey` | `admin_users` | `auth.users` | 0 |
| `admin_users_user_id_fkey` | `admin_users` | `auth.users` | 0 |
| `answers_lead_id_fkey` | `answers` | `public.leads` | 0 |
| `answers_session_id_fkey` | `answers` | `public.sessions` | 0 |
| `assessment_assets_assessment_type_id_fkey` | `assessment_assets` | `public.assessment_types` | 0 |
| `assessment_config_release_settings_enabled_by_fkey` | `assessment_config_release_settings` | `auth.users` | 0 |
| `assessment_config_releases_assessment_type_id_fkey` | `assessment_config_releases` | `public.assessment_types` | 0 |
| `assessment_config_releases_created_by_fkey` | `assessment_config_releases` | `auth.users` | 0 |
| `assessment_config_releases_family_id_fkey` | `assessment_config_releases` | `public.assessment_families` | 0 |
| `assessment_families_created_by_fkey` | `assessment_families` | `auth.users` | 0 |
| `assessment_families_current_published_version_fkey` | `assessment_families` | `public.assessment_types` | 0 |
| `assessment_families_current_release_id_fkey` | `assessment_families` | `public.assessment_config_releases` | 0 |
| `assessment_results_assessment_type_id_fkey` | `assessment_results` | `public.assessment_types` | 0 |
| `assessment_results_session_id_fkey` | `assessment_results` | `public.sessions` | 0 |
| `assessment_session_access_assessment_type_id_fkey` | `assessment_session_access` | `public.assessment_types` | 0 |
| `assessment_session_access_assessment_user_id_fkey` | `assessment_session_access` | `public.assessment_users` | 0 |
| `assessment_session_access_session_id_fkey` | `assessment_session_access` | `public.sessions` | 0 |
| `assessment_types_family_id_fkey` | `assessment_types` | `public.assessment_families` | 0 |
| `assessment_types_parent_id_fkey` | `assessment_types` | `public.assessment_types` | 0 |
| `assessment_users_assessment_key_fkey` | `assessment_users` | `public.assessment_settings` | 0 |
| `axes_assessment_type_id_fkey` | `axes` | `public.assessment_types` | 0 |
| `historical_snapshots_session_id_fkey` | `historical_snapshots` | `public.sessions` | 0 |
| `insights_mapping_assessment_type_id_fkey` | `insights_mapping` | `public.assessment_types` | 0 |
| `leads_assessment_type_id_fkey` | `leads` | `public.assessment_types` | 0 |
| `options_question_id_fkey` | `options` | `public.questions` | 0 |
| `questions_assessment_type_id_fkey` | `questions` | `public.assessment_types` | 0 |
| `questions_axis_id_fkey` | `questions` | `public.axes` | 0 |
| `scores_lead_id_fkey` | `scores` | `public.leads` | 0 |
| `scores_session_id_fkey` | `scores` | `public.sessions` | 0 |
| `sessions_assessment_release_id_fkey` | `sessions` | `public.assessment_config_releases` | 0 |
| `sessions_assessment_type_id_fkey` | `sessions` | `public.assessment_types` | 0 |
| `sessions_assessment_user_id_fkey` | `sessions` | `public.assessment_users` | 0 |
| `sessions_lead_id_fkey` | `sessions` | `public.leads` | 0 |
| `traps_assessment_type_id_fkey` | `traps` | `public.assessment_types` | 0 |

### Additional semantic cross-table checks

Eight additional read-only relational consistency checks ran against the current configuration/content tables and any operational rows present. All returned **0 violations**:

| Check | Violations |
|---|---:|
| Family current published-version pointer references a version belonging to a different family | 0 |
| Family current release pointer is misaligned with its family/current-published-version | 0 |
| Release family / referenced assessment-family / assessment-version identity mismatch | 0 |
| Question assessment-version differs from its linked axis assessment-version | 0 |
| Session assessment version differs from its pinned release's assessment type | 0 |
| Assessment-session access assessment type differs from linked session assessment type | 0 |
| Answer lead differs from linked session lead when both are populated | 0 |
| Score lead differs from linked session lead when both are populated | 0 |

These checks cover the explicit joins listed above; they are not a general semantic-validity proof of every column, configuration digest, registry, policy, or function. Null FK values are excluded according to standard `MATCH SIMPLE` FK behavior. No row, schema, role, grant, policy or migration was changed.

### Integrity-check disposition

The current live FK and these eight targeted consistency checks show no orphan rows or mismatches in their bounded scope. Continue to treat semantic checks not covered by those query predicates as OPEN. The result does not resolve missing initial-DDL provenance, the main/live migration ID mismatch, dynamic/external code dependencies, or the effective-RLS test gate. D-05 and WP-11 remain OPEN.


## SECURITY DEFINER search-path inventory — 2026-10-20, read-only

A catalog aggregate over all 87 public functions/procedures returned 65 SECURITY DEFINER functions. Of those 65:

| SECURITY DEFINER `search_path` category | Count |
|---|---:|
| `search_path=""` (empty) | 14 |
| `search_path=public, pg_temp` | 51 |
| No function-level `search_path` setting | 0 |
| Other function-level `search_path` settings | 0 |
| SECURITY DEFINER callable by `anon` | 0 |
| SECURITY DEFINER callable by `authenticated` | 51 |

This records the observed catalog settings only. It does not assert that every `SECURITY DEFINER` body is safe: each body still needs review for explicit schema qualification, caller authorization, dynamic SQL, object ownership, and effective EXECUTE grants. The 51 authenticated-executable `SECURITY DEFINER` functions and four admin-identity helper overloads are particularly relevant to WP-11's function/permission review. No function was changed and no privilege test requiring role impersonation was run.


## Repository-wide code/reference scan outside the primary runtime — batch 1 of 7

Pinned tree 67182c92126ff77e1d47f5bcacae5bf3aa8170d8. Scope: first 10 of 65 remaining tracked JS/TS/HTML/workflow files not already covered in the wrapper-aware active-caller crosswalk. Tests/workflows/reference files are separated from live runtime callers. Hits are navigation evidence, not proof of runtime reachability.

### .github/workflows/c02-answer-value-compat.yml

- Blob SHA: 5cf95e7be34f4300ebd43fa2ba4c9969b0be1b07; 52 lines; 1526 bytes; classification: WORKFLOW.
- Table-name references: options@41

### .github/workflows/c02-value70-live-e2e.yml

- Blob SHA: 057538ed7e32485e35d11f9ce2612ae635c07abb; 40 lines; 1293 bytes; classification: WORKFLOW.
- Table-name references: none found in text scan.

### .github/workflows/c03-credential-preflight.yml

- Blob SHA: a142dce77dc70d9d6a99682c50af26ef724ea839; 98 lines; 5321 bytes; classification: WORKFLOW.
- Literal API calls: REST assessment_config_release_settings@53; REST assessment_families@55; REST assessment_config_release_settings@92; REST assessment_families@94
- Table-name references: assessment_config_release_settings@53,92; assessment_families@55,94

### .github/workflows/c03-edge-handler-regression.yml

- Blob SHA: 39058f7f1fb1fedae59a5ea36f692d08bba693b2; 32 lines; 990 bytes; classification: WORKFLOW.
- Table-name references: none found in text scan.

### .github/workflows/c03-hybrid-config-release.yml

- Blob SHA: 033b63315835c87297590faf427fc0e1345ee5c5; 87 lines; 3495 bytes; classification: WORKFLOW.
- Table-name references: options@43

### .github/workflows/c03-production-release.yml

- Blob SHA: 5edb708ce6bdde06bf3ad0e6c101d4a9209b6197; 119 lines; 4405 bytes; classification: WORKFLOW.
- Table-name references: none found in text scan.

### .github/workflows/c03-protected-edge-handler.yml

- Blob SHA: ce22cb61ea32e9114ba9345a2c1aedc08826f4ea; 29 lines; 821 bytes; classification: WORKFLOW.
- Table-name references: none found in text scan.

### .github/workflows/p2-external-e2e.yml

- Blob SHA: 456ac83a2f53976dc5896aba27d02a1d36bb725a; 66 lines; 1867 bytes; classification: WORKFLOW.
- Table-name references: none found in text scan.

### .github/workflows/p3-kernel-verification.yml

- Blob SHA: f50d9c88e99619234c4503c2aeb36ea4473d4fc4; 220 lines; 8278 bytes; classification: WORKFLOW.
- Table-name references: sessions@55,121,167; options@91,200; assessment_users@162,186; assessment_results@164,181

### .github/workflows/server-runtime-verification.yml

- Blob SHA: fda7979f34a5db0bc4c07e06430d491f226d1f25; 22 lines; 724 bytes; classification: WORKFLOW.
- Table-name references: none found in text scan.

## Repository-wide code/reference scan outside the primary runtime — batch 2 of 7

Pinned tree 67182c92126ff77e1d47f5bcacae5bf3aa8170d8. Scope: files 11–20 of 65 remaining tracked JS/TS/HTML/workflow files not already covered in the wrapper-aware active-caller crosswalk.

### .github/workflows/wp-02-local-contract.yml

- Blob SHA: b612c9067828aeaebf722880772f742329e2fe1a; 42 lines; 1123 bytes; classification: WORKFLOW.
- Table-name references: none found in text scan.

### .github/workflows/wp-03-local-contract.yml

- Blob SHA: 2105a223ed23d7d12f5d05c79aa99d1dd37aafcd; 54 lines; 1621 bytes; classification: WORKFLOW.
- Table-name references: options@43

### .github/workflows/wp-04-local-contract.yml

- Blob SHA: 156a63d8b3fa76af247f9b770b0d255b0f11465a; 51 lines; 1546 bytes; classification: WORKFLOW.
- Table-name references: options@40

### .github/workflows/wp-05-local-contract.yml

- Blob SHA: 84136c16a50e1901d7baa1a0a93a3416399de4e5; 37 lines; 1307 bytes; classification: WORKFLOW.
- Table-name references: none found in text scan.

### .github/workflows/wp-06-report-validation-gate.yml

- Blob SHA: df28bc29bd077ede501dde4ce29576fb22364db1; 34 lines; 892 bytes; classification: WORKFLOW.
- Table-name references: none found in text scan.

### .github/workflows/wp-07-report-text-model-linkage.yml

- Blob SHA: 5d5ac4ab6f942d557c42fc52b72fe32e7c167d96; 31 lines; 848 bytes; classification: WORKFLOW.
- Table-name references: none found in text scan.

### .github/workflows/wp-08-v1-assessment-reconstruction.yml

- Blob SHA: 9b6d4aefc605370b61375745c2bc43586c1c516d; 38 lines; 1271 bytes; classification: WORKFLOW.
- Table-name references: options@28

### .github/workflows/wp-09-obsolete-engine-references.yml

- Blob SHA: b7542b1e6c926055a154e94c4167a1b981505772; 32 lines; 803 bytes; classification: WORKFLOW.
- Table-name references: none found in text scan.

### tests/app-view-toggle.test.js

- Blob SHA: bc061b323408f97a4b535771a1b6393686e9ce84; 60 lines; 2206 bytes; classification: TEST.
- Table-name references: none found in text scan.

### tests/c01-current-published-interpretation-binding.test.mjs

- Blob SHA: 0b9500d929c8644a154c44d14899cce6382c93ab; 85 lines; 4033 bytes; classification: TEST.
- Table-name references: options@10,11,36; questions@10,11,35

## Repository-wide code/reference scan outside the primary runtime — batch 3 of 7

Pinned tree 67182c92126ff77e1d47f5bcacae5bf3aa8170d8. Scope: files 21–30 of 65 remaining tracked JS/TS/HTML/workflow files not already covered in the wrapper-aware active-caller crosswalk.

### tests/c02-answer-value-compat.test.mjs

- Blob SHA: b4031bdbbb73bcac51aef78b90a109f991215112; 32 lines; 1532 bytes; classification: TEST.
- Table-name references: answers@11,13

### tests/c03-config-digest-coverage.test.js

- Blob SHA: c461c0d3245c33d95c3a3e9e0ac5a79dc613c043; 235 lines; 9641 bytes; classification: TEST.
- Table-name references: axes@24,120,138; questions@28,121,141; options@33,109,122; traps@37,94,105

### tests/c03-edge-handler-regression.test.ts

- Blob SHA: 06cc48a24ff7fe4c4c11571a25dd8f6bd6c74933; 254 lines; 11477 bytes; classification: TEST.
- Table-name references: options@46,47,117; axes@99,104,130; questions@109,130,134; traps@122,130,134; answers@135,188; assessment_session_access@156,208; sessions@165; leads@166; assessment_types@174; assessment_families@175

### tests/c03-github-oidc-claims.test.ts

- Blob SHA: b3c27d5f9b50d7fac05bcb7f10bcd04e6b51f439; 51 lines; 2212 bytes; classification: TEST.
- Table-name references: none found in text scan.

### tests/c03-github-oidc-token.test.mjs

- Blob SHA: f0955a5cb0c62ff34ca5c19abb0384fc8446c49e; 32 lines; 1542 bytes; classification: TEST.
- Table-name references: options@12,13,19

### tests/c03-load-real-admin-auth.mjs

- Blob SHA: d827bdcc61dd203fba74514b585963dfd3730156; 31 lines; 1155 bytes; classification: TEST.
- Table-name references: none found in text scan.

### tests/c03-oidc-handler-auth.test.ts

- Blob SHA: 7eae32f0c09bcc50fd5e39c000889a22ecb8715b; 56 lines; 3556 bytes; classification: TEST.
- Table-name references: none found in text scan.

### tests/c03-persisted-result-projection.test.js

- Blob SHA: 58953b0f7c308456aa77a4c66d422eef6af718eb; 61 lines; 2791 bytes; classification: TEST.
- Table-name references: scores@23; axes@25

### tests/c03-production-release.test.mjs

- Blob SHA: 93af8d47c46d48db8dde1fbbfbde1d969938653e; 200 lines; 7671 bytes; classification: TEST.
- Table-name references: options@24,25,28

### tests/c03-protected-edge-completion.test.ts

- Blob SHA: fb73666d06d7abd932865dadd5febe38a09362cd; 202 lines; 8409 bytes; classification: TEST.
- Table-name references: scores@23; axes@25; assessment_session_access@77; sessions@78; leads@82; assessment_results@86; assessment_families@87

## Repository-wide code/reference scan outside the primary runtime — batch 4 of 7

Pinned tree 67182c92126ff77e1d47f5bcacae5bf3aa8170d8. Scope: files 31–40 of 65 remaining tracked JS/TS/HTML/workflow files not already covered in the wrapper-aware active-caller crosswalk.

### tests/c03-release-verifier-contract.test.js

- Blob SHA: 67f681169a7974be35ba97e2b06e6038e96bb893; 53 lines; 2994 bytes; classification: TEST.
- Table-name references: none found in text scan.

### tests/c03-release-verifier-handler.test.ts

- Blob SHA: 9d5d444298e4b83a8bf5dd9c4fe31be723db2a37; 163 lines; 8642 bytes; classification: TEST.
- Table-name references: questions@15; options@33,58,70; assessment_config_releases@43

### tests/c03-runtime-attestation.test.mjs

- Blob SHA: 5b30f13db7a15e4c945f4af1b543ed245e45108f; 59 lines; 2697 bytes; classification: TEST.
- Table-name references: none found in text scan.

### tests/d09-pages-asset-exposure.test.js

- Blob SHA: 77d24ee88ca2e5b447c4d0e83e1f4e5458115f3e; 84 lines; 2698 bytes; classification: TEST.
- Table-name references: none found in text scan.

### tests/external-assessment-access.mjs

- Blob SHA: 734e14a13d464c23aaa19b0f0d03bc6879fe3cbf; 141 lines; 6562 bytes; classification: TEST.
- Table-name references: questions@62,66,71; axes@63,72; options@66,67,113

### tests/p3-70-scoring-activation.test.mjs

- Blob SHA: a145726d0c4a84fc9c5673f93fed42f0092648f8; 69 lines; 4515 bytes; classification: TEST.
- Table-name references: axes@54,57; scores@57,58

### tests/p3-aggregation-engine.test.mjs

- Blob SHA: 462f398172d847cff518e58d45c16acb093c4807; 71 lines; 4227 bytes; classification: TEST.
- Table-name references: none found in text scan.

### tests/p3-consistency-engine.test.mjs

- Blob SHA: 268208a314351dab2f72d27106a87f5f0d6ffec7; 194 lines; 6799 bytes; classification: TEST.
- Table-name references: none found in text scan.

### tests/p3-criticality-coverage-engine.test.mjs

- Blob SHA: b8e8ccf45e35e9b89174e7930293b283f6cd7f5c; 53 lines; 2735 bytes; classification: TEST.
- Table-name references: none found in text scan.

### tests/p3-economic-model-v1.test.mjs

- Blob SHA: f5fb51ef76fc9a4dd33f6e4df359de657eb0c1ad; 109 lines; 3800 bytes; classification: TEST.
- Table-name references: axes@101; scores@101

## Repository-wide code/reference scan outside the primary runtime — batch 5 of 7

Pinned tree 67182c92126ff77e1d47f5bcacae5bf3aa8170d8. Scope: files 41–50 of 65 remaining tracked JS/TS/HTML/workflow files not already covered in the wrapper-aware active-caller crosswalk.

### tests/p3-engine-ownership.test.mjs

- Blob SHA: 73bee85b0f7088b9e7d8aae0a20954049322eac9; 73 lines; 3369 bytes; classification: TEST.
- Table-name references: none found in text scan.

### tests/p3-gate-e-contract.test.mjs

- Blob SHA: 2031f9c60857e6611fd53fcf95fdd9269c28342d; 167 lines; 4678 bytes; classification: TEST.
- Table-name references: none found in text scan.

### tests/p3-historical-reconciliation.test.mjs

- Blob SHA: b7d3c941c5e2334ddae25b0c11310de65d43a65f; 25 lines; 1662 bytes; classification: TEST.
- Table-name references: answers@10

### tests/p3-integrated-scorer-v1.test.mjs

- Blob SHA: 9fd047d3eac26eb7100944c5a577feec76e2c010; 326 lines; 12388 bytes; classification: TEST.
- Table-name references: axes@38,62,80; scores@80,81,83; questions@93,98,192

### tests/p3-overall-score-projection.test.mjs

- Blob SHA: 372a0a70159228be028658b0ba05ef2e1cf347bd; 76 lines; 2603 bytes; classification: TEST.
- Table-name references: axes@33,38,42

### tests/p3-production-contract.test.mjs

- Blob SHA: 77b9d0b50738d71758b281e4f4241d33d45f5229; 198 lines; 9688 bytes; classification: TEST.
- Literal API calls: SELECT answers@193
- Table-name references: axes@63,94,185; scores@76,185; answers@193

### tests/p3-production-external-e2e.mjs

- Blob SHA: 854100c3820c432a3b933b62065ccae4fe4de550; 257 lines; 11294 bytes; classification: TEST.
- Table-name references: questions@58,61,145; axes@59,62; sessions@116; options@147,148,233; answers@160

### tests/p3-response-interpretation-registry.test.mjs

- Blob SHA: e7381b909bce2458fba2eea81637be6e055801cf; 16 lines; 2025 bytes; classification: TEST.
- Table-name references: options@8; questions@8

### tests/p3-scorer-v1.test.mjs

- Blob SHA: 0b2a49f8531b7efedcdb702c1782c0d7f5a29932; 89 lines; 5041 bytes; classification: TEST.
- Table-name references: questions@50

### tests/p3-shadow-replay-current-sessions.test.mjs

- Blob SHA: 72c9e0911bb41b207df33a19c79f3bf57aa60c41; 116 lines; 4733 bytes; classification: TEST.
- Table-name references: sessions@115

## Repository-wide code/reference scan outside the primary runtime — batch 6 of 7

Pinned tree 67182c92126ff77e1d47f5bcacae5bf3aa8170d8. Scope: files 51–60 of 65 remaining tracked JS/TS/HTML/workflow files not already covered in the wrapper-aware active-caller crosswalk.

### tests/p3-structured-result-v1.test.mjs

- Blob SHA: 9e36319e0cd3f1ed7ccc64d190a514eb6b9e6e50; 56 lines; 3820 bytes; classification: TEST.
- Table-name references: answers@14

### tests/p4-submission-flow.test.js

- Blob SHA: a4f506b8868a2282e182493726274851338a357a; 237 lines; 8502 bytes; classification: TEST.
- Table-name references: options@91,137; questions@91,135; answers@170; axes@189,228; scores@228

### tests/p5-editor-workspace.test.js

- Blob SHA: 18ee5e7ec1f567242707b37a68ed4d0298371dd3; 171 lines; 11190 bytes; classification: TEST.
- Literal API calls: SELECT leads@165
- Table-name references: traps@37,68; questions@53,72,106; assessment_assets@69; insights_mapping@70; assessment_session_access@71; axes@73; assessment_types@74,169; options@107,109; leads@165

### tests/reference/browser-engine-v4.js

- Blob SHA: fc413fb0ea2760493c7f9da34502d3428d50ec4a; 364 lines; 15048 bytes; classification: TEST.
- Table-name references: axes@9,39,42; answers@22,32,152; assessment_types@26,27; questions@40,43,48; traps@41,58,174; options@52,53; scores@346,349,351

### tests/reference/score-engine-legacy.mts

- Blob SHA: db24106203aa8ab48ee0097f768b51b8980bf9d2; 147 lines; 5552 bytes; classification: TEST.
- Table-name references: options@13; axes@27,52,81; questions@28,56; traps@29,68,143; answers@47,57,69

### tests/server-scoring-parity.test.js

- Blob SHA: f4a195882d78840010c61bd324010c8bb4473eda; 89 lines; 4027 bytes; classification: TEST.
- Table-name references: assessment_types@20,45; axes@22,47; questions@26,48; options@27,28,29; traps@32,55,86; answers@70,71,72; scores@81

### tests/support/historical-result-reconciliation.mts

- Blob SHA: 19907c78b85e54a6dc2d54879e9d563cacd47141; 40 lines; 1218 bytes; classification: TEST.
- Table-name references: none found in text scan.

### tests/wp-02-contract-local.test.mjs

- Blob SHA: 8d59f47830a084b00acc3d1ec65a7ecdfc5529c6; 147 lines; 6288 bytes; classification: TEST.
- Table-name references: axes@80,94,112; scores@93,94,121

### tests/wp-03-configuration-semantics.test.mjs

- Blob SHA: 34a93bb09172e7c21e7e10f7ae30f81c019deeb2; 125 lines; 6687 bytes; classification: TEST.
- Table-name references: axes@20,62

### tests/wp-04-structured-result-persistence.test.mjs

- Blob SHA: 97826e39306a828c3416a1a70efa0aab774dce08; 125 lines; 6553 bytes; classification: TEST.
- Table-name references: axes@27,42,44; scores@35,44,58; assessment_results@116

## Repository-wide code/reference scan outside the primary runtime — batch 7 of 7

Pinned tree 67182c92126ff77e1d47f5bcacae5bf3aa8170d8. Scope: files 61–65 of 65 remaining tracked JS/TS/HTML/workflow files not already covered in the wrapper-aware active-caller crosswalk.

### tests/wp-05-report-interpretation.test.mjs

- Blob SHA: db98698c4e4a43dbb74914f9f4b64debf25d8a65; 204 lines; 10248 bytes; classification: TEST.
- Table-name references: scores@40,132,136; axes@42,93,94; assessment_types@116; leads@174,175

### tests/wp-06-report-validation.test.mjs

- Blob SHA: dbd75f8f60dc02ed4f595b622e1bee7379e4ccce; 159 lines; 7340 bytes; classification: TEST.
- Table-name references: scores@27; axes@29

### tests/wp-07-report-text-linkage.test.mjs

- Blob SHA: 4fa2cf1f79d2a0f4be01006a3f3b229346dbd446; 74 lines; 4170 bytes; classification: TEST.
- Table-name references: none found in text scan.

### tests/wp-08-v1-assessment-reconstruction.test.mjs

- Blob SHA: 1bc6629899be1cdfcfa0336b4c37dab0730aa798; 117 lines; 6504 bytes; classification: TEST.
- Table-name references: axes@13,15,18; questions@14,19,20; options@20,21,110; assessment_results@28; assessment_session_access@29; assessment_types@32,37,110; answers@103; sessions@103; insights_mapping@105,110; assessment_assets@110; traps@110; assessment_families@114

### tests/wp-09-obsolete-engine-references.test.mjs

- Blob SHA: 72a1c8d2209885622942c9f9fd371a9fc254766d; 103 lines; 3107 bytes; classification: TEST.
- Table-name references: none found in text scan.


## Final repository-wide caller/reference scan coverage — 2026-10-20

The wrapper-aware production/entrypoint scan covered 40 tracked JS/TS/HTML files in application/admin/Edge/Pages middleware/release and scoped operational-script paths. A separate seven-batch scan then inspected the remaining **65** tracked JavaScript/TypeScript/HTML/GitHub workflow files not already covered: **18 workflow files and 47 test/reference/support files**. Both passes record Git blob SHAs, line counts and line-referenced table-name/API-call hits. The test/reference/workflow pass distinguishes table names used by fixtures, SQL harness references, and CI commands from active production application calls; these are not attributed as active runtime consumers unless an actual application entrypoint was found.

Tree verification was repeated after writing the scan records: the scanned source tree `67182c92126ff77e1d47f5bcacae5bf3aa8170d8` and current main `0bf0c877cb4b6db2aef869338014ae5f41e2141b` each contain 105 such tracked code/markup/workflow files, and **0 of their paths/blob SHAs changed**. Thus the exact text scanned is still present on current main. The 56 migration files were likewise compared at their scan tree and later main snapshot with no path/hash changes.

### Caller-scan result boundaries

- Active DB consumers have been identified for the primary assessment runtime, admin manager/editor/lifecycle, admin identity lookup, admin-management Edge handler, assessment-config-release Edge handler, and the run-scoped release/E2E cleanup script. The dynamic completion RPC selection in `assessment-access/index.ts` is separately documented at line 1032.
- Tests include references to live-schema names for fixtures, regression contracts and reference scoring modules. Workflow YAML contains paths and names used for CI harness setup/filtering, but does not itself constitute a production DB client call.
- No literal direct active caller was found in the 40 primary active/operational source paths for `experience_multipliers`, `specialty_profiles`, and `team_capacity_factors`; `historical_snapshots`, `insights_mapping`, and `assessment_assets` have indirect SQL/test/cleanup references as recorded. Do not classify any of these tables as unused or deletable from static search absence.
- A static scan, even across all 105 paths, cannot establish zero external callers or discover arbitrary runtime-generated identifiers, dynamic SQL, dashboard-issued SQL, service-role scripts not in Git, or external integrations. For each SECURITY DEFINER function, complete body/authz/search-path review remains an acceptance item, not an inferred PASS.

### D-05 state after the full scan

The tracked migration scan, table-by-table live catalog, per-table migration reference inventory, wrapper-aware application caller scan, test/workflow reference scan, effective table privileges, public function EXECUTE and SECURITY DEFINER search-path summaries, FK orphan scan, and eight targeted consistency checks are now recorded in this worksheet. **D-05 remains OPEN / BLOCKING RECONCILIATION** because (a) initial CREATE TABLE is absent for 18 tables across the 56 tracked migrations and there is no authoritative full schema baseline in the tracked tree; (b) `main` has three unmatched migration source/version identities against live history; (c) the full SECURITY DEFINER body and effective-role/RLS behavior review is not complete; and (d) the external/original schema archive has not been examined. WP-11 remains IN PROGRESS / NOT CLOSED; WP-12 has NOT STARTED.


## Source/ledger body comparison — 2026-10-20

PR #120 remains open and unmerged at `47c0a79dbee108149f9431ff4e86ac120c420f7a`. Its `20261018075528` SQL body matches main's `20261018100000` service-role migration after normalization. Its `20261018075855` SQL body matches main's source-only `20261018110000` verifier migration after comment/whitespace normalization, with one explanatory comment differing. These comparisons establish source-body correspondence only; the live ledger does not expose historical applied SQL bodies. Do not merge PR #120 or rewrite/apply migration history from this evidence. D-05 remains OPEN.


## Line-referenced migration DDL index — 2026-10-20

See `documentation/governance/D-05-MIGRATION-DDL-STATEMENT-INDEX-2026-10-20.md` for the line-level DDL hits across all 56 tracked migration files, including file blob SHAs and byte-size checks. Current main retains the same migration paths/blob SHAs as the pinned scan tree. The tracked-repository absence of initial persistent CREATE TABLE for the 18 candidate tables is confirmed. Remaining OPEN items are: external/original schema provenance; exact historical SQL body for the three migration source/ledger mismatches; table-by-table semantic reconciliation of live objects to each DDL statement; dynamic SQL/function dependency review; and SECURITY DEFINER/effective-role/RLS acceptance.

## Historical schema/migration provenance addendum — 2026-10-20

The original ADR-003 commit (`39c7dfc8443c150ec833881e1f910d42dbb14aa9`, 2026-09-30 22:21:34 UTC) documented that the live schema already contained tables, RLS policies, PostgreSQL functions, Edge Functions and operational data while the repository had no `supabase/migrations` path and the remote migration ledger had zero entries. The accepted ADR commit (`7b0a877cbcd74073c6fab5a0246017d01e8ed056`) required a reviewed baseline later; it was not itself that baseline.

The first five tracked migration files are non-replayable 182-byte provenance markers, not original SQL bodies. Targeted history review of October 1 duplicate/future-dated migration cleanup and October 10 filename reconciliation did not find evidence that those operations deleted initial DDL for the 18 legacy tables; the canonical `assessment_families` creation source remains tracked. Therefore, the best-supported explanation is that legacy table DDL was not captured in the tracked migration path when it was introduced, while the specific cause of the gap remains unproven. See `documentation/governance/D-05-HISTORICAL-MIGRATION-PROVENANCE-REVIEW-2026-10-20.md`.

This narrows the provenance question but does not close it: pre-2026-09-30 Git history, external archives/backups and Supabase editor/deployment history have not been fully verified. **D-05 remains OPEN / BLOCKING RECONCILIATION; WP-11 remains IN PROGRESS / NOT CLOSED; WP-12 remains NOT STARTED.** No database or Production changes were made.



## Read-only SECURITY DEFINER screening refresh — 2026-10-21

**Method:** read-only PostgreSQL catalog queries against project `oaqpzaarppccbnepffxx`; inspected `pg_proc.prosecdef`, `proconfig`, effective EXECUTE privileges via `has_function_privilege`, and selected function bodies. No database writes or configuration changes were made.

**Confirmed screening results (not a complete security acceptance):**
- No public-schema SECURITY DEFINER function in the returned inventory was executable by role `anon` according to `has_function_privilege`.
- The inspected privileged entry points callable by `authenticated` generally show explicit authorization delegation/checks (for example `require_admin_capability`, `require_owner`, or a guarded secure routine). This is only a textual screening; it does not prove all authorization paths are correct.
- `save_assessment_secure(uuid,text,text,text,text,text,boolean,boolean)` has no direct authorization call in its own body, but delegates creation to `create_assessment_secure`, published edits to `update_published_assessment_content_secure`, and draft edits to `update_assessment_working_copy_secure`. Acceptance still requires verifying each delegated routine and the state/authorization boundary together.
- `is_owner(uuid)` and `is_active_admin(uuid)` are SECURITY DEFINER predicates that query `admin_users`; their bodies intentionally test the supplied UUID and do not themselves contain an authz marker. Their safety depends on caller authorization and the exposed function ACL, so do not treat the text-only marker scan as a finding against them.
- SECURITY DEFINER functions use either `search_path = ''` or `search_path = public, pg_temp`. This inventory alone does not prove search-path safety for each unqualified identifier; per-function review remains required.

**Disposition:** no anonymous EXECUTE exposure was identified by this screening, but this is not a PASS for D-05. Complete function-by-function authorization, effective-role, dynamic SQL and RLS interaction review remains OPEN. D-05 OPEN / BLOCKING RECONCILIATION; WP-11 IN PROGRESS / NOT CLOSED; WP-12 NOT STARTED.

## Read-only function-by-function security review — 2026-10-21

**Scope:** live definitions, owner, function ACL, effective EXECUTE for `anon` and `authenticated`, `proconfig/search_path`, explicit authorization checks, state transitions, and direct SQL-function callers for the three D-05 continuation targets. Evidence obtained through read-only Supabase catalog queries against project `oaqpzaarppccbnepffxx`; no tests were run and no database state was changed.

### Live catalog evidence

| Live signature | Owner / SECURITY DEFINER | Function setting | Stored ACL | Effective EXECUTE |
|---|---|---|---|---|
| `public.create_assessment_secure(text,text,text,text,boolean,boolean)` | `postgres` / true | `search_path=public, pg_temp` | `postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres` | anon=false; authenticated=true |
| `public.update_published_assessment_content_secure(uuid,text,text,text)` | `postgres` / true | `search_path=public, pg_temp` | `postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres` | anon=false; authenticated=true |
| `public.update_assessment_working_copy_secure(uuid,text,text,text,boolean,boolean)` | `postgres` / true | `search_path=public, pg_temp` | `postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres` | anon=false; authenticated=true |

The definitions returned by `pg_get_functiondef` explicitly set the same search path. The inspected application tables and project functions in these bodies are schema-qualified as `public.*`; the identity lookup is schema-qualified as `auth.uid()`. No dynamic SQL appears in these three returned bodies. This finding is limited to the inspected bodies and does not prove safety of every dependency or caller.

### Per-function behavior and authorization evidence

1. **`create_assessment_secure`**
   - First executable authorization operation: `PERFORM public.require_admin_capability('assessment.edit')`.
   - Rejects null/blank slug with SQLSTATE `22023`; inserts a new `assessment_families` row and a new `assessment_types` row with `status='draft'`, `version=1`, `is_active=true`, and generated version UUID; records `assessment.create` through `public.write_admin_audit`.
   - Uses `lower(trim(p_slug))` for family/type slug and returns family/version IDs and draft status.
   - No branch permitting published/archived creation is present in the live body. Creation, inserts, and audit write execute within the function's calling transaction; runtime behavior was not tested.

2. **`update_published_assessment_content_secure`**
   - First executable authorization operation: `PERFORM public.require_admin_capability('assessment.edit')`.
   - Selects the requested `assessment_types` row `FOR UPDATE`; raises `P0002` if missing and `55000` unless the selected row status is exactly `published`.
   - Updates only `title_ar`, `title_en`, `description`, and `updated_at`; `title_ar` preserves the old value for null/blank input, `title_en` preserves the old value for null, while description is assigned directly. Writes before/after audit data using event `assessment.published_content_edit`.
   - Returns `status='published'`. The separate live immutability trigger is an additional guard, not a substitute for the function's own status check.

3. **`update_assessment_working_copy_secure`**
   - First executable authorization operation: `PERFORM public.require_admin_capability('assessment.edit')`.
   - Selects the requested `assessment_types` row `FOR UPDATE`; raises `P0002` if missing and `55000` unless status is exactly `draft`.
   - Updates title/description and the two boolean flags only; blank/null Arabic title preserves its old value, while the other listed values are assigned directly. Writes before/after audit data using event `assessment.edit`; returns success and the version ID.
   - The status check prevents this function from being the path for editing a published or archived row.

### Authorization helper inspected

The live `public.require_admin_capability(text)` is owned by `postgres`, SECURITY DEFINER, configured with `search_path=public, pg_temp`, and its ACL/effective privileges show no EXECUTE for `anon` or `authenticated` (service_role and postgres only). Its body calls `public.has_admin_capability(p_capability)` and raises SQLSTATE `42501` if false. The live `public.has_admin_capability(text)` is owned by `postgres`, SECURITY DEFINER, uses the same search path, and has authenticated EXECUTE. It returns true when `public.is_owner()` is true or when the current `auth.uid()` has an active `admin_users` row with role `admin` and a matching `admin_capabilities.capability`. This establishes the visible authorization chain in the live definitions; role impersonation/RLS/runtime negative-access behavior has not been exercised.

### Direct caller and compatibility wrapper

- The live SQL function-body text scan found one public SQL-function caller referencing these three targets: `public.save_assessment_secure(uuid,text,text,text,text,text,boolean,boolean)`. It is owned by `postgres`, SECURITY DEFINER, uses `search_path=public, pg_temp`, and has effective EXECUTE for authenticated and service_role, not anon.
- Live wrapper flow: if `p_id IS NULL`, delegate to `create_assessment_secure`; otherwise select the row status `FOR UPDATE`, raise `P0002` if absent, delegate published rows to `update_published_assessment_content_secure`, reject archived rows with `55000`, and delegate the remaining status to `update_assessment_working_copy_secure`. Each write delegate performs its own `assessment.edit` capability check.
- The wrapper reads/locks status before the delegated capability check and returns not-found/archived errors before authorization is checked by the delegate. This is consistent with the previously recorded D-17 observation; this review does not reclassify or reopen that audit item and does not establish exploitability. No fix is authorized or applied here.
- Repository caller evidence: `admin/assessment-manager.js` and `admin/assessment-editor-workspace.js` call `rpc/save_assessment_secure`. The tracked migration source for the wrapper and published-content function is `supabase/migrations/20261003224353_p5_published_content_edit_lifecycle.sql`; the working-copy function and wrapper also appear in `supabase/migrations/20261003170912_p5_admin_architecture.sql`. Source text is provenance evidence, not proof that a particular migration body was executed byte-for-byte in Production.

### Evidence limits and disposition

- Verified: live definitions, owners, SECURITY DEFINER flags, function settings, stored ACLs, effective EXECUTE results for anon/authenticated, explicit authorization and state branches, helper definitions, one direct SQL-function caller, and two tracked admin RPC caller files.
- Not verified: runtime behavior under impersonated roles; negative-access tests; full dependency/RLS interactions; every possible non-SQL caller or dynamically constructed invocation; historical executed migration bytes. No unit, integration, E2E, or production write-path tests were run.
- No production writes, schema/grant/policy changes, deployment, migration application, PR merge, deletion/recreation, or migration-history changes were performed.
- **Disposition unchanged:** this bounded review adds evidence but does not close the broader 25-table reconciliation, historical initial-DDL provenance gap, or migration source/ledger discrepancies. D-05 remains **OPEN / BLOCKING RECONCILIATION**; WP-11 remains **IN PROGRESS / NOT CLOSED**; WP-12 remains **NOT STARTED**.
