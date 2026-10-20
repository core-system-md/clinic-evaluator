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

- **Live columns (6):** `user_id uuid NOT NULL`; `role text NOT NULL DEFAULT 'admin'::text`; `active boolean NOT NULL DEFAULT true`; `created_at timestamp with time zone NOT NULL DEFAULT now()`; `created_by uuid`; `display_name text`
- **Constraints / relationships:** `admin_users_created_by_fkey: FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL`; `admin_users_pkey: PRIMARY KEY (user_id)`; `admin_users_role_check: CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text])))`; `admin_users_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`
- **Indexes:** `admin_users_pkey: CREATE UNIQUE INDEX admin_users_pkey ON public.admin_users USING btree (user_id)`; `admin_users_single_owner_uidx: CREATE UNIQUE INDEX admin_users_single_owner_uidx ON public.admin_users USING btree (role) WHERE (role = 'owner'::text)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (5):** `admin_users_delete_owner_admins [DELETE TO authenticated] USING=((role = 'admin'::text) AND is_owner(( SELECT auth.uid() AS uid))) CHECK=-`; `admin_users_insert_owner [INSERT TO authenticated] USING=- CHECK=((role = 'admin'::text) AND is_owner(( SELECT auth.uid() AS uid)))`; `admin_users_select_self_or_admin [SELECT TO authenticated] USING=((user_id = ( SELECT auth.uid() AS uid)) OR is_active_admin(( SELECT auth.uid() AS uid))) CHECK=-`; `admin_users_update_owner [UPDATE TO authenticated] USING=is_owner(( SELECT auth.uid() AS uid)) CHECK=((role = 'admin'::text) AND (user_id <> ( SELECT auth.uid() AS uid)) AND is_owner(( SELECT auth.uid() AS uid)))`; `p0_admin_select_admin_users [SELECT TO authenticated] USING=is_active_admin(( SELECT auth.uid() AS uid)) CHECK=-`
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** `get_owner_admin_audit_secure(p_limit integer, p_offset integer, p_action text, p_actor_user_id uuid, p_family_id uuid, p_from timestamp with time zone, p_to timestamp with time zone)`, `grant_admin_capability_secure(p_user_id uuid, p_capability text)`, `has_admin_capability(p_capability text)`, `is_active_admin()`, `is_active_admin(p_user_id uuid)`, `is_owner(p_user_id uuid)`, `is_owner()`, `register_admin_assistant_secure(p_user_id uuid, p_display_name text, p_capabilities text[])`, `require_admin()`, `revoke_admin_capability_secure(p_user_id uuid, p_capability text)`, `set_admin_active_secure(p_user_id uuid, p_active boolean)`, `update_admin_assistant_profile_secure(p_user_id uuid, p_display_name text)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `admin/assessment-manager.js`
- **Initial CREATE TABLE provenance:** **NOT LOCATED** in the tracked migration search used for this worksheet. Treat as an unresolved provenance gap until a complete file-level scan/source archive confirms absence.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261003170912_p5_admin_architecture.sql`, `supabase/migrations/20261003174838_p5_admin_assistant_management.sql`, `supabase/migrations/20261003171050_p5_admin_canonical_import_and_audit.sql`, `supabase/migrations/20261001190000_p0_security_closure.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.answers`

- **Live columns (13):** `id uuid NOT NULL DEFAULT uuid_generate_v4()`; `session_id uuid`; `lead_id uuid`; `question_id text NOT NULL`; `axis_id text NOT NULL`; `question_text text`; `answer_value integer NOT NULL`; `is_trap boolean DEFAULT false`; `trap_triggered boolean DEFAULT false`; `answered_at timestamp with time zone DEFAULT now()`; `option_index integer`; `option_value integer`; `chosen_option_label text`
- **Constraints / relationships:** `answers_answer_value_compat_check: CHECK ((answer_value = ANY (ARRAY[0, 1, 2, 3, 4, 5, 40, 70, 100])))`; `answers_lead_id_fkey: FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE`; `answers_pkey: PRIMARY KEY (id)`; `answers_session_id_fkey: FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE`; `answers_session_question_unique: UNIQUE (session_id, question_id)`
- **Indexes:** `answers_pkey: CREATE UNIQUE INDEX answers_pkey ON public.answers USING btree (id)`; `answers_session_question_uidx: CREATE UNIQUE INDEX answers_session_question_uidx ON public.answers USING btree (session_id, question_id) WHERE (session_id IS NOT NULL)`; `answers_session_question_unique: CREATE UNIQUE INDEX answers_session_question_unique ON public.answers USING btree (session_id, question_id)`; `idx_answers_session: CREATE INDEX idx_answers_session ON public.answers USING btree (session_id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (7):** `Allow anon insert answers [INSERT TO anon] USING=- CHECK=true`; `Service role full access answers [ALL TO service_role] USING=true CHECK=true`; `anon_insert_answers [INSERT TO anon] USING=- CHECK=true`; `answers_public_insert [INSERT TO public] USING=- CHECK=true`; `answers_public_select [SELECT TO public] USING=true CHECK=-`; `p0_admin_select_answers [SELECT TO authenticated] USING=is_active_admin(( SELECT auth.uid() AS uid)) CHECK=-`; `service_all_answers [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** `calculate_session_score(p_session_id uuid)`, `prepare_assessment_submission(p_session_id uuid, p_access_token_hash text)`, `prepare_assessment_submission(p_session_id uuid, p_access_token_hash text, p_economic_input jsonb)`, `save_assessment_answer(p_access_token_hash text, p_question_id text, p_option_index integer, p_current_question integer)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `assets/js/app.js`, `supabase/functions/assessment-access/index.ts`, `supabase/functions/assessment-access/engine.ts`
- **Initial CREATE TABLE provenance:** **NOT LOCATED** in the tracked migration search used for this worksheet. Treat as an unresolved provenance gap until a complete file-level scan/source archive confirms absence.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql`, `supabase/migrations/20261001190000_p0_security_closure.sql`, `supabase/migrations/20261003084304_20261003103000_p4_submission_context_lock.sql`, `supabase/migrations/20261003082603_20261003093000_p4_submission_prepare_finalize.sql`, `supabase/migrations/20261009164951_structured_result_authority.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.assessment_assets`

- **Live columns (13):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `assessment_type_id uuid NOT NULL`; `asset_type character varying(50) NOT NULL`; `file_url text NOT NULL`; `file_name character varying(255)`; `file_size integer`; `mime_type character varying(100)`; `alt_text character varying(255)`; `alt_text_ar character varying(255)`; `display_order integer DEFAULT 0`; `is_active boolean DEFAULT true`; `created_at timestamp with time zone DEFAULT now()`; `updated_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `assessment_assets_assessment_type_id_fkey: FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id) ON DELETE CASCADE`; `assessment_assets_pkey: PRIMARY KEY (id)`
- **Indexes:** `assessment_assets_pkey: CREATE UNIQUE INDEX assessment_assets_pkey ON public.assessment_assets USING btree (id)`; `idx_assets_assessment: CREATE INDEX idx_assets_assessment ON public.assessment_assets USING btree (assessment_type_id)`; `idx_assets_type: CREATE INDEX idx_assets_type ON public.assessment_assets USING btree (assessment_type_id, asset_type)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (2):** `anon_select_assets [SELECT TO anon] USING=(assessment_type_id IN ( SELECT assessment_types.id    FROM assessment_types   WHERE ((assessment_types.status)::text = 'published'::text))) CHECK=-`; `service_all_assets [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** `p2_assessment_assets_immutable: CREATE TRIGGER p2_assessment_assets_immutable BEFORE INSERT OR DELETE OR UPDATE ON public.assessment_assets FOR EACH ROW EXECUTE FUNCTION p2_assert_draft_version('direct')`; `update_assets_updated_at: CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assessment_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
- **Stored functions with table-name text match:** `create_assessment_version_secure(p_source_version_id uuid)`, `delete_assessment_draft_secure(p_id uuid)`, `duplicate_assessment(source_id uuid)`, `p2_assert_draft_version()`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** No match in sampled files. This is not proof of no caller.
- **Initial CREATE TABLE provenance:** **NOT LOCATED** in the tracked migration search used for this worksheet. Treat as an unresolved provenance gap until a complete file-level scan/source archive confirms absence.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`, `supabase/migrations/20261004102003_p5_delete_draft_cascade_fix_2026_10_04.sql`, `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.assessment_config_release_settings`

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

- **Live columns (3):** `assessment_key text NOT NULL`; `auth_enabled boolean DEFAULT false`; `created_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `assessment_settings_pkey: PRIMARY KEY (assessment_key)`
- **Indexes:** `assessment_settings_pkey: CREATE UNIQUE INDEX assessment_settings_pkey ON public.assessment_settings USING btree (assessment_key)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (5):** `Service role full access assessment_settings [ALL TO service_role] USING=true CHECK=true`; `anon_read_assessment_settings [SELECT TO anon] USING=true CHECK=-`; `anon_select_assessment_settings [SELECT TO anon] USING=true CHECK=-`; `p0_admin_select_assessment_settings [SELECT TO authenticated] USING=is_active_admin(( SELECT auth.uid() AS uid)) CHECK=-`; `service_all_assessment_settings [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** `toggle_assessment_auth_secure(p_slug text, p_enabled boolean)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `admin/assessment-manager.js`, `supabase/functions/assessment-access/index.ts`
- **Initial CREATE TABLE provenance:** **NOT LOCATED** in the tracked migration search used for this worksheet. Treat as an unresolved provenance gap until a complete file-level scan/source archive confirms absence.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001190000_p0_security_closure.sql`, `supabase/migrations/20261003170912_p5_admin_architecture.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.assessment_types`

- **Live columns (23):** `id uuid NOT NULL DEFAULT uuid_generate_v4()`; `slug text NOT NULL`; `title_ar text NOT NULL`; `title_en text`; `description text`; `question_count integer NOT NULL DEFAULT 0`; `axis_count integer NOT NULL DEFAULT 0`; `has_traps boolean DEFAULT false`; `has_ev_simulator boolean DEFAULT false`; `config_version integer DEFAULT 1`; `is_active boolean DEFAULT true`; `created_at timestamp with time zone DEFAULT now()`; `status character varying(20) DEFAULT 'published'::character varying`; `version integer DEFAULT 1`; `updated_at timestamp with time zone DEFAULT now()`; `published_at timestamp with time zone`; `archived_at timestamp with time zone`; `created_by uuid`; `parent_id uuid`; `kpi_mappings jsonb`; `ev_mappings jsonb`; `axis_roles jsonb`; `family_id uuid NOT NULL`
- **Constraints / relationships:** `assessment_types_family_id_fkey: FOREIGN KEY (family_id) REFERENCES assessment_families(id)`; `assessment_types_parent_id_fkey: FOREIGN KEY (parent_id) REFERENCES assessment_types(id)`; `assessment_types_pkey: PRIMARY KEY (id)`; `assessment_types_slug_key: UNIQUE (slug)`; `chk_assessment_status: CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying])::text[])))`
- **Indexes:** `assessment_types_family_version_uidx: CREATE UNIQUE INDEX assessment_types_family_version_uidx ON public.assessment_types USING btree (family_id, version)`; `assessment_types_one_published_per_family_uidx: CREATE UNIQUE INDEX assessment_types_one_published_per_family_uidx ON public.assessment_types USING btree (family_id) WHERE ((status)::text = 'published'::text)`; `assessment_types_pkey: CREATE UNIQUE INDEX assessment_types_pkey ON public.assessment_types USING btree (id)`; `assessment_types_slug_key: CREATE UNIQUE INDEX assessment_types_slug_key ON public.assessment_types USING btree (slug)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (7):** `Allow anon read assessment_types [SELECT TO anon] USING=true CHECK=-`; `Allow public read access [SELECT TO public] USING=true CHECK=-`; `Service role full access assessment_types [ALL TO service_role] USING=true CHECK=true`; `anon_select_assessment_types [SELECT TO anon] USING=((status)::text = 'published'::text) CHECK=-`; `assessment_types_public_read [SELECT TO public] USING=(is_active = true) CHECK=-`; `p0_admin_select_assessment_types [SELECT TO authenticated] USING=is_active_admin(( SELECT auth.uid() AS uid)) CHECK=-`; `service_all_assessment_types [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** `p2_assessment_type_immutability: CREATE TRIGGER p2_assessment_type_immutability BEFORE DELETE OR UPDATE ON public.assessment_types FOR EACH ROW EXECUTE FUNCTION p2_assessment_type_immutability()`; `update_assessment_types_updated_at: CREATE TRIGGER update_assessment_types_updated_at BEFORE UPDATE ON public.assessment_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
- **Stored functions with table-name text match:** `activate_existing_assessment_release_ci_secure(p_release_id uuid, p_expected_published_version_id uuid, p_workflow_run_id text, p_workflow_run_attempt text, p_workflow_sha text, p_confirmation text)`, `activate_existing_assessment_release_secure(p_release_id uuid, p_expected_published_version_id uuid)`, `add_option_secure(p_question_id uuid, p_label_ar text, p_label text, p_option_value integer, p_option_index integer, p_display_order integer, p_is_trap boolean)`, `archive_assessment_secure(p_version_id uuid)`, `create_assessment_secure(p_slug text, p_title_ar text, p_title_en text, p_description text, p_has_traps boolean, p_has_ev_simulator boolean)`, `create_assessment_version_secure(p_source_version_id uuid)`, `delete_assessment_draft_secure(p_id uuid)`, `delete_draft_axis_secure(p_axis_id uuid)`, `delete_draft_question_secure(p_question_id uuid)`, `delete_option_secure(p_option_id uuid)`, `duplicate_assessment(source_id uuid)`, `duplicate_assessment_secure(p_id uuid, p_clone_slug text)`, `get_public_assessment_options_secure(p_assessment_type_id uuid)`, `import_assessment_secure(p_data jsonb)`, `p2_assert_draft_version()`, `publish_assessment_config_release_secure(p_release_id uuid, p_expected_published_version_id uuid)`, `publish_assessment_version_secure(p_version_id uuid)`, `register_assessment_config_release_ci_secure(p_assessment_type_id uuid, p_git_commit_sha text, p_config_digest text, p_canonicalizer_version text, p_interpretation_version integer, p_interpretation_registry_digest text, p_scoring_engine_version text, p_scoring_contract_version text, p_report_model_version text, p_fixture_set_version text, p_migration_contract_version text, p_edge_release_ref text, p_workflow_run_id text, p_workflow_run_attempt text, p_workflow_sha text, p_confirmation text)`, `register_assessment_config_release_secure(p_assessment_type_id uuid, p_git_commit_sha text, p_config_digest text, p_canonicalizer_version text, p_interpretation_version integer, p_interpretation_registry_digest text, p_scoring_engine_version text, p_scoring_contract_version text, p_report_model_version text, p_fixture_set_version text, p_migration_contract_version text, p_edge_release_ref text)`, `restore_public_assessment_secure(p_version_id uuid)`, `resume_public_assessment_secure(p_version_id uuid)`, `save_assessment_secure(p_id uuid, p_title_ar text, p_title_en text, p_slug text, p_description text, p_status text, p_has_traps boolean, p_has_ev_simulator boolean)`, `save_axis_secure(p_assessment_type_id uuid, p_title text, p_title_ar text, p_code character varying, p_weight numeric, p_display_order integer)`, `save_question_secure(p_assessment_type_id uuid, p_axis_id uuid, p_question_text text, p_question_text_ar text, p_code character varying, p_question_type character varying, p_display_order integer, p_is_required boolean, p_trap_index integer)`, `start_assessment_session(p_access_token_hash text, p_assessment_user_id uuid, p_assessment_type_id uuid, p_lead_id uuid)`, `start_public_assessment_session(p_access_token_hash text, p_assessment_type_id uuid, p_lead_id uuid, p_attempt_key_hash text)`, `start_public_assessment_session(p_access_token_hash text, p_assessment_type_id uuid, p_lead_id uuid)`, `stop_public_assessment_secure(p_family_id uuid)`, `update_assessment_status_secure(p_id uuid, p_status text, p_is_active boolean)`, `update_assessment_working_copy_secure(p_id uuid, p_title_ar text, p_title_en text, p_description text, p_has_traps boolean, p_has_ev_simulator boolean)`, `update_draft_axis_content_secure(p_axis_id uuid, p_title text, p_title_ar text, p_description text)`, `update_draft_axis_secure(p_axis_id uuid, p_title text, p_title_ar text, p_description text, p_weight numeric, p_display_order integer)`, `update_draft_calculation_config_secure(p_id uuid, p_axis_roles jsonb, p_kpi_mappings jsonb, p_ev_mappings jsonb)`, `update_draft_option_secure(p_option_id uuid, p_label text, p_label_ar text, p_option_value numeric, p_option_index integer, p_display_order integer, p_is_trap boolean, p_display_text text, p_display_text_ar text)`, `update_draft_question_secure(p_question_id uuid, p_question_text text, p_question_text_ar text, p_axis_id uuid, p_display_order integer, p_is_required boolean, p_trap_index integer)`, `update_draft_question_text_secure(p_question_id uuid, p_question_text text, p_question_text_ar text)`, `update_option_secure(p_option_id uuid, p_label_ar text, p_option_value integer)`, `update_published_assessment_content_secure(p_id uuid, p_title_ar text, p_title_en text, p_description text)`, `update_published_axis_content_secure(p_axis_id uuid, p_title text, p_title_ar text, p_description text)`, `update_published_option_text_secure(p_option_id uuid, p_label text, p_label_ar text, p_display_text text, p_display_text_ar text)`, `update_published_question_text_secure(p_question_id uuid, p_question_text text, p_question_text_ar text)`, `validate_assessment_version_secure(p_version_id uuid)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `assets/js/app.js`, `admin/assessment-manager.js`, `admin/assessment-editor-workspace.js`, `supabase/functions/assessment-access/index.ts`, `supabase/functions/assessment-access/engine.ts`
- **Initial CREATE TABLE provenance:** **NOT LOCATED** in the tracked migration search used for this worksheet. Treat as an unresolved provenance gap until a complete file-level scan/source archive confirms absence.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`, `supabase/migrations/20261001100833_p2_admin_status_guard.sql`, `supabase/migrations/20261002161455_p3_production_implementation.sql`, `supabase/migrations/20261003175601_p5_working_copy_stable_family_slug.sql`, `supabase/migrations/20261003174838_p5_admin_assistant_management.sql`, `supabase/migrations/20261004115737_p5_lifecycle_immutability_compat.sql`, `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.assessment_users`

- **Live columns (9):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `assessment_key text`; `username text NOT NULL`; `password_hash text NOT NULL`; `max_uses integer DEFAULT 1`; `used_count integer DEFAULT 0`; `expires_at timestamp with time zone`; `active boolean DEFAULT true`; `created_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `assessment_users_assessment_key_fkey: FOREIGN KEY (assessment_key) REFERENCES assessment_settings(assessment_key) ON DELETE CASCADE`; `assessment_users_pkey: PRIMARY KEY (id)`
- **Indexes:** `assessment_users_pkey: CREATE UNIQUE INDEX assessment_users_pkey ON public.assessment_users USING btree (id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (4):** `Service role full access assessment_users [ALL TO service_role] USING=true CHECK=true`; `anon_read_assessment_users [SELECT TO anon] USING=true CHECK=-`; `anon_update_assessment_users [UPDATE TO anon] USING=true CHECK=true`; `service_all_assessment_users [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** `complete_assessment_session(p_session_id uuid, p_assessment_user_id uuid, p_overall_score numeric, p_classification text, p_score_rows jsonb)`, `complete_p3_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p4_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `generate_assessment_user_secure(p_slug text, p_username text, p_password_hash text, p_max_uses integer, p_expiry_days integer)`, `start_assessment_session(p_access_token_hash text, p_assessment_user_id uuid, p_assessment_type_id uuid, p_lead_id uuid)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `supabase/functions/assessment-access/index.ts`
- **Initial CREATE TABLE provenance:** **NOT LOCATED** in the tracked migration search used for this worksheet. Treat as an unresolved provenance gap until a complete file-level scan/source archive confirms absence.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql`, `supabase/migrations/20261003170912_p5_admin_architecture.sql`, `supabase/migrations/20261002161455_p3_production_implementation.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.axes`

- **Live columns (11):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `assessment_type_id uuid NOT NULL`; `code character varying(10) NOT NULL`; `title character varying(255) NOT NULL`; `title_ar character varying(255)`; `description text`; `weight numeric(5,2) NOT NULL DEFAULT 0.00`; `display_order integer NOT NULL DEFAULT 0`; `status character varying(20) DEFAULT 'active'::character varying`; `created_at timestamp with time zone DEFAULT now()`; `updated_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `axes_assessment_type_id_code_key: UNIQUE (assessment_type_id, code)`; `axes_assessment_type_id_fkey: FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id) ON DELETE CASCADE`; `axes_pkey: PRIMARY KEY (id)`
- **Indexes:** `axes_assessment_type_id_code_key: CREATE UNIQUE INDEX axes_assessment_type_id_code_key ON public.axes USING btree (assessment_type_id, code)`; `axes_pkey: CREATE UNIQUE INDEX axes_pkey ON public.axes USING btree (id)`; `idx_axes_assessment: CREATE INDEX idx_axes_assessment ON public.axes USING btree (assessment_type_id)`; `idx_axes_code: CREATE INDEX idx_axes_code ON public.axes USING btree (code)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (5):** `Allow all on axes [ALL TO anon,authenticated] USING=true CHECK=true`; `Allow public read access [SELECT TO public] USING=true CHECK=-`; `anon_select_axes [SELECT TO anon] USING=(assessment_type_id IN ( SELECT assessment_types.id    FROM assessment_types   WHERE ((assessment_types.status)::text = 'published'::text))) CHECK=-`; `p0_admin_select_axes [SELECT TO authenticated] USING=is_active_admin(( SELECT auth.uid() AS uid)) CHECK=-`; `service_all_axes [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** `p2_axes_immutable: CREATE TRIGGER p2_axes_immutable BEFORE INSERT OR DELETE OR UPDATE ON public.axes FOR EACH ROW EXECUTE FUNCTION p2_assert_draft_version('direct')`; `update_axes_updated_at: CREATE TRIGGER update_axes_updated_at BEFORE UPDATE ON public.axes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
- **Stored functions with table-name text match:** `complete_p4_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_public_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_submission_fingerprint text, p_result jsonb)`, `create_assessment_version_secure(p_source_version_id uuid)`, `delete_assessment_draft_secure(p_id uuid)`, `delete_draft_axis_secure(p_axis_id uuid)`, `duplicate_assessment(source_id uuid)`, `duplicate_assessment_secure(p_id uuid, p_clone_slug text)`, `import_assessment_secure(p_data jsonb)`, `p2_assert_draft_version()`, `save_axis_secure(p_assessment_type_id uuid, p_title text, p_title_ar text, p_code character varying, p_weight numeric, p_display_order integer)`, `save_question_secure(p_assessment_type_id uuid, p_axis_id uuid, p_question_text text, p_question_text_ar text, p_code character varying, p_question_type character varying, p_display_order integer, p_is_required boolean, p_trap_index integer)`, `update_draft_axis_content_secure(p_axis_id uuid, p_title text, p_title_ar text, p_description text)`, `update_draft_axis_secure(p_axis_id uuid, p_title text, p_title_ar text, p_description text, p_weight numeric, p_display_order integer)`, `update_draft_calculation_config_secure(p_id uuid, p_axis_roles jsonb, p_kpi_mappings jsonb, p_ev_mappings jsonb)`, `update_draft_question_secure(p_question_id uuid, p_question_text text, p_question_text_ar text, p_axis_id uuid, p_display_order integer, p_is_required boolean, p_trap_index integer)`, `update_published_axis_content_secure(p_axis_id uuid, p_title text, p_title_ar text, p_description text)`, `validate_assessment_version_secure(p_version_id uuid)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `assets/js/app.js`, `admin/assessment-manager.js`, `admin/assessment-editor-workspace.js`, `supabase/functions/assessment-access/index.ts`, `supabase/functions/assessment-access/engine.ts`, `assets/js/report-interpretation.js`, `assets/js/report-validation.js`
- **Initial CREATE TABLE provenance:** **NOT LOCATED** in the tracked migration search used for this worksheet. Treat as an unresolved provenance gap until a complete file-level scan/source archive confirms absence.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`, `supabase/migrations/20261001101014_p2_immutability_trigger_fix.sql`, `supabase/migrations/20261003175220_p5_working_copy_deep_copy_and_legacy_write_lock.sql`, `supabase/migrations/20261009164918_canonical_axis_weights.sql`, `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.experience_multipliers`

- **Live columns (7):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `years_range text NOT NULL`; `years_min integer`; `years_max integer`; `multiplier real NOT NULL DEFAULT 1.0`; `label_ar text NOT NULL`; `label_en text NOT NULL`
- **Constraints / relationships:** `experience_multipliers_pkey: PRIMARY KEY (id)`; `experience_multipliers_years_range_key: UNIQUE (years_range)`
- **Indexes:** `experience_multipliers_pkey: CREATE UNIQUE INDEX experience_multipliers_pkey ON public.experience_multipliers USING btree (id)`; `experience_multipliers_years_range_key: CREATE UNIQUE INDEX experience_multipliers_years_range_key ON public.experience_multipliers USING btree (years_range)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (0):** No policy row returned for this table.
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** No text match in public function bodies found by this query; this is not proof of no dependency.
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** No match in sampled files. This is not proof of no caller.
- **Initial CREATE TABLE provenance:** **NOT LOCATED** in the tracked migration search used for this worksheet. Treat as an unresolved provenance gap until a complete file-level scan/source archive confirms absence.
- **Migration files with known references / changes found in targeted searches:** No specific migration path identified by targeted search; requires exhaustive migration-file scan.
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.historical_snapshots`

- **Live columns (5):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `session_id uuid NOT NULL`; `assessment_type_id uuid NOT NULL`; `snapshot_data jsonb NOT NULL`; `created_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `historical_snapshots_pkey: PRIMARY KEY (id)`; `historical_snapshots_session_id_fkey: FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE`
- **Indexes:** `historical_snapshots_pkey: CREATE UNIQUE INDEX historical_snapshots_pkey ON public.historical_snapshots USING btree (id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (1):** `service_all_snapshots [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** No text match in public function bodies found by this query; this is not proof of no dependency.
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** No match in sampled files. This is not proof of no caller.
- **Initial CREATE TABLE provenance:** **NOT LOCATED** in the tracked migration search used for this worksheet. Treat as an unresolved provenance gap until a complete file-level scan/source archive confirms absence.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.insights_mapping`

- **Live columns (15):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `assessment_type_id uuid`; `insight_code character varying(50) NOT NULL`; `severity character varying(20) DEFAULT 'info'::character varying`; `title character varying(255) NOT NULL`; `title_ar character varying(255)`; `message text NOT NULL`; `message_ar text`; `recommendation text`; `recommendation_ar text`; `category character varying(50)`; `display_order integer DEFAULT 0`; `is_active boolean DEFAULT true`; `created_at timestamp with time zone DEFAULT now()`; `updated_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `insights_mapping_assessment_type_id_fkey: FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id) ON DELETE CASCADE`; `insights_mapping_assessment_type_id_insight_code_key: UNIQUE (assessment_type_id, insight_code)`; `insights_mapping_pkey: PRIMARY KEY (id)`
- **Indexes:** `idx_insights_assessment: CREATE INDEX idx_insights_assessment ON public.insights_mapping USING btree (assessment_type_id)`; `idx_insights_code: CREATE INDEX idx_insights_code ON public.insights_mapping USING btree (insight_code)`; `insights_mapping_assessment_type_id_insight_code_key: CREATE UNIQUE INDEX insights_mapping_assessment_type_id_insight_code_key ON public.insights_mapping USING btree (assessment_type_id, insight_code)`; `insights_mapping_pkey: CREATE UNIQUE INDEX insights_mapping_pkey ON public.insights_mapping USING btree (id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (2):** `anon_select_insights [SELECT TO anon] USING=((assessment_type_id IN ( SELECT assessment_types.id    FROM assessment_types   WHERE ((assessment_types.status)::text = 'published'::text))) OR (assessment_type_id IS NULL)) CHECK=-`; `service_all_insights [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** `p2_insights_mapping_immutable: CREATE TRIGGER p2_insights_mapping_immutable BEFORE INSERT OR DELETE OR UPDATE ON public.insights_mapping FOR EACH ROW EXECUTE FUNCTION p2_assert_draft_version('direct')`; `update_insights_updated_at: CREATE TRIGGER update_insights_updated_at BEFORE UPDATE ON public.insights_mapping FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
- **Stored functions with table-name text match:** `create_assessment_version_secure(p_source_version_id uuid)`, `delete_assessment_draft_secure(p_id uuid)`, `duplicate_assessment(source_id uuid)`, `p2_assert_draft_version()`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** No match in sampled files. This is not proof of no caller.
- **Initial CREATE TABLE provenance:** **NOT LOCATED** in the tracked migration search used for this worksheet. Treat as an unresolved provenance gap until a complete file-level scan/source archive confirms absence.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`, `supabase/migrations/20261003175220_p5_working_copy_deep_copy_and_legacy_write_lock.sql`, `supabase/migrations/20261004102003_p5_delete_draft_cascade_fix_2026_10_04.sql`, `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.leads`

- **Live columns (20):** `id uuid NOT NULL DEFAULT uuid_generate_v4()`; `assessment_type_id uuid`; `full_name text NOT NULL`; `email text`; `phone text`; `clinic_name text`; `country text DEFAULT 'JO'::text`; `source text DEFAULT 'website'::text`; `utm_campaign text`; `completed boolean DEFAULT false`; `score_total integer DEFAULT 0`; `score_percentage numeric(5,2) DEFAULT 0`; `created_at timestamp with time zone DEFAULT now()`; `completed_at timestamp with time zone`; `specialty text`; `years text`; `team text`; `ev_current integer`; `ev_potential integer`; `ev_gap integer`
- **Constraints / relationships:** `leads_assessment_type_id_fkey: FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id)`; `leads_pkey: PRIMARY KEY (id)`
- **Indexes:** `idx_leads_assessment: CREATE INDEX idx_leads_assessment ON public.leads USING btree (assessment_type_id)`; `idx_leads_email: CREATE INDEX idx_leads_email ON public.leads USING btree (email)`; `leads_pkey: CREATE UNIQUE INDEX leads_pkey ON public.leads USING btree (id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (8):** `Allow anon insert leads [INSERT TO anon] USING=- CHECK=true`; `Allow anon update leads [UPDATE TO anon] USING=true CHECK=true`; `Service role full access leads [ALL TO service_role] USING=true CHECK=true`; `anon_insert_leads [INSERT TO anon] USING=- CHECK=true`; `leads_owner_read [SELECT TO public] USING=true CHECK=-`; `leads_public_insert [INSERT TO public] USING=- CHECK=true`; `p0_admin_select_leads [SELECT TO authenticated] USING=is_active_admin(( SELECT auth.uid() AS uid)) CHECK=-`; `service_all_leads [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** `check_assessment_leads_secure(p_assessment_id uuid)`, `complete_assessment_session(p_session_id uuid, p_assessment_user_id uuid, p_overall_score numeric, p_classification text, p_score_rows jsonb)`, `complete_p3_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p3_public_assessment_session(p_session_id uuid, p_access_token_hash text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p4_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p4_public_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_public_assessment_session(p_session_id uuid, p_access_token_hash text, p_submission_fingerprint text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_public_assessment_session(p_session_id uuid, p_score_rows jsonb, p_overall_score numeric, p_classification text)`, `delete_assessment_draft_secure(p_id uuid)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `assets/js/app.js`, `admin/assessment-manager.js`, `supabase/functions/assessment-access/index.ts`
- **Initial CREATE TABLE provenance:** **NOT LOCATED** in the tracked migration search used for this worksheet. Treat as an unresolved provenance gap until a complete file-level scan/source archive confirms absence.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql`, `supabase/migrations/20261001190000_p0_security_closure.sql`, `supabase/migrations/20261002161455_p3_production_implementation.sql`, `supabase/migrations/20261003082603_20261003093000_p4_submission_prepare_finalize.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.options`

- **Live columns (11):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `question_id uuid NOT NULL`; `option_index integer NOT NULL`; `option_value integer NOT NULL`; `label character varying(255) NOT NULL`; `label_ar character varying(255)`; `display_text text`; `display_text_ar text`; `is_trap boolean DEFAULT false`; `display_order integer NOT NULL DEFAULT 0`; `created_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `options_pkey: PRIMARY KEY (id)`; `options_question_id_fkey: FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE`; `options_question_id_option_index_key: UNIQUE (question_id, option_index)`
- **Indexes:** `idx_options_index: CREATE INDEX idx_options_index ON public.options USING btree (question_id, option_index)`; `idx_options_question: CREATE INDEX idx_options_question ON public.options USING btree (question_id)`; `options_pkey: CREATE UNIQUE INDEX options_pkey ON public.options USING btree (id)`; `options_question_id_option_index_key: CREATE UNIQUE INDEX options_question_id_option_index_key ON public.options USING btree (question_id, option_index)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (4):** `Allow public read access [SELECT TO public] USING=true CHECK=-`; `anon_select_options [SELECT TO anon] USING=(question_id IN ( SELECT questions.id    FROM questions   WHERE (questions.assessment_type_id IN ( SELECT assessment_types.id            FROM assessment_types           WHERE ((assessment_types.status)::text = 'published'::text))))) CHECK=-`; `p0_admin_select_options [SELECT TO authenticated] USING=is_active_admin(( SELECT auth.uid() AS uid)) CHECK=-`; `service_all_options [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** `p2_options_immutable: CREATE TRIGGER p2_options_immutable BEFORE INSERT OR DELETE OR UPDATE ON public.options FOR EACH ROW EXECUTE FUNCTION p2_assert_draft_version('option')`
- **Stored functions with table-name text match:** `add_option_secure(p_question_id uuid, p_label_ar text, p_label text, p_option_value integer, p_option_index integer, p_display_order integer, p_is_trap boolean)`, `create_assessment_version_secure(p_source_version_id uuid)`, `delete_option_secure(p_option_id uuid)`, `duplicate_assessment(source_id uuid)`, `duplicate_assessment_secure(p_id uuid, p_clone_slug text)`, `get_public_assessment_options_secure(p_assessment_type_id uuid)`, `import_assessment_secure(p_data jsonb)`, `p2_assert_draft_version()`, `save_assessment_answer(p_access_token_hash text, p_question_id text, p_option_index integer, p_current_question integer)`, `save_option_secure(p_question_id uuid, p_option_index integer, p_option_value integer, p_label text, p_label_ar text, p_display_text text, p_display_text_ar text, p_is_trap boolean, p_display_order integer)`, `update_draft_option_secure(p_option_id uuid, p_label text, p_label_ar text, p_option_value numeric, p_option_index integer, p_display_order integer, p_is_trap boolean, p_display_text text, p_display_text_ar text)`, `update_option_secure(p_option_id uuid, p_label_ar text, p_option_value integer)`, `update_option_secure(p_id uuid, p_label text, p_label_ar text, p_option_value integer, p_is_trap boolean, p_display_order integer)`, `update_published_option_text_secure(p_option_id uuid, p_label text, p_label_ar text, p_display_text text, p_display_text_ar text)`, `validate_assessment_version_secure(p_version_id uuid)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `assets/js/app.js`, `admin/assessment-manager.js`, `admin/assessment-editor-workspace.js`, `supabase/functions/assessment-access/index.ts`, `supabase/functions/assessment-access/engine.ts`, `supabase/functions/assessment-config-release/index.ts`, `supabase/functions/admin-management/index.ts`
- **Initial CREATE TABLE provenance:** **NOT LOCATED** in the tracked migration search used for this worksheet. Treat as an unresolved provenance gap until a complete file-level scan/source archive confirms absence.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`, `supabase/migrations/20261001190000_p0_security_closure.sql`, `supabase/migrations/20261003171050_p5_admin_canonical_import_and_audit.sql`, `supabase/migrations/20261003224353_p5_published_content_edit_lifecycle.sql`, `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.questions`

- **Live columns (16):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `axis_id uuid NOT NULL`; `assessment_type_id uuid NOT NULL`; `code character varying(20) NOT NULL`; `question_text text NOT NULL`; `question_text_ar text`; `question_type character varying(50) DEFAULT 'likert'::character varying`; `display_order integer NOT NULL DEFAULT 0`; `is_required boolean DEFAULT true`; `trap_index integer`; `status character varying(20) DEFAULT 'active'::character varying`; `created_at timestamp with time zone DEFAULT now()`; `updated_at timestamp with time zone DEFAULT now()`; `impact text DEFAULT 'medium'::text`; `layer text DEFAULT 'A'::text`; `trap_for jsonb DEFAULT '[]'::jsonb`
- **Constraints / relationships:** `questions_assessment_type_id_fkey: FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id) ON DELETE CASCADE`; `questions_axis_id_code_key: UNIQUE (axis_id, code)`; `questions_axis_id_fkey: FOREIGN KEY (axis_id) REFERENCES axes(id) ON DELETE CASCADE`; `questions_pkey: PRIMARY KEY (id)`
- **Indexes:** `idx_questions_assessment: CREATE INDEX idx_questions_assessment ON public.questions USING btree (assessment_type_id)`; `idx_questions_axis: CREATE INDEX idx_questions_axis ON public.questions USING btree (axis_id)`; `questions_axis_id_code_key: CREATE UNIQUE INDEX questions_axis_id_code_key ON public.questions USING btree (axis_id, code)`; `questions_pkey: CREATE UNIQUE INDEX questions_pkey ON public.questions USING btree (id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (4):** `Allow public read access [SELECT TO public] USING=true CHECK=-`; `anon_select_questions [SELECT TO anon] USING=(assessment_type_id IN ( SELECT assessment_types.id    FROM assessment_types   WHERE ((assessment_types.status)::text = 'published'::text))) CHECK=-`; `p0_admin_select_questions [SELECT TO authenticated] USING=is_active_admin(( SELECT auth.uid() AS uid)) CHECK=-`; `service_all_questions [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** `p2_questions_immutable: CREATE TRIGGER p2_questions_immutable BEFORE INSERT OR DELETE OR UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION p2_assert_draft_version('direct')`; `update_questions_updated_at: CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
- **Stored functions with table-name text match:** `add_option_secure(p_question_id uuid, p_label_ar text, p_label text, p_option_value integer, p_option_index integer, p_display_order integer, p_is_trap boolean)`, `create_assessment_version_secure(p_source_version_id uuid)`, `delete_assessment_draft_secure(p_id uuid)`, `delete_draft_axis_secure(p_axis_id uuid)`, `delete_draft_question_secure(p_question_id uuid)`, `delete_option_secure(p_option_id uuid)`, `duplicate_assessment(source_id uuid)`, `duplicate_assessment_secure(p_id uuid, p_clone_slug text)`, `get_public_assessment_options_secure(p_assessment_type_id uuid)`, `import_assessment_secure(p_data jsonb)`, `p2_assert_draft_version()`, `prepare_assessment_submission(p_session_id uuid, p_access_token_hash text)`, `prepare_assessment_submission(p_session_id uuid, p_access_token_hash text, p_economic_input jsonb)`, `save_assessment_answer(p_access_token_hash text, p_question_id text, p_option_index integer, p_current_question integer)`, `save_question_secure(p_assessment_type_id uuid, p_axis_id uuid, p_question_text text, p_question_text_ar text, p_code character varying, p_question_type character varying, p_display_order integer, p_is_required boolean, p_trap_index integer)`, `update_draft_option_secure(p_option_id uuid, p_label text, p_label_ar text, p_option_value numeric, p_option_index integer, p_display_order integer, p_is_trap boolean, p_display_text text, p_display_text_ar text)`, `update_draft_question_secure(p_question_id uuid, p_question_text text, p_question_text_ar text, p_axis_id uuid, p_display_order integer, p_is_required boolean, p_trap_index integer)`, `update_draft_question_text_secure(p_question_id uuid, p_question_text text, p_question_text_ar text)`, `update_option_secure(p_option_id uuid, p_label_ar text, p_option_value integer)`, `update_published_option_text_secure(p_option_id uuid, p_label text, p_label_ar text, p_display_text text, p_display_text_ar text)`, `update_published_question_text_secure(p_question_id uuid, p_question_text text, p_question_text_ar text)`, `validate_assessment_version_secure(p_version_id uuid)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `assets/js/app.js`, `admin/assessment-manager.js`, `admin/assessment-editor-workspace.js`, `supabase/functions/assessment-access/index.ts`, `supabase/functions/assessment-access/engine.ts`
- **Initial CREATE TABLE provenance:** **NOT LOCATED** in the tracked migration search used for this worksheet. Treat as an unresolved provenance gap until a complete file-level scan/source archive confirms absence.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001100633_p2_assessment_family_versions.sql`, `supabase/migrations/20261001190000_p0_security_closure.sql`, `supabase/migrations/20261003171050_p5_admin_canonical_import_and_audit.sql`, `supabase/migrations/20261003175220_p5_working_copy_deep_copy_and_legacy_write_lock.sql`, `supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.scores`

- **Live columns (13):** `id uuid NOT NULL DEFAULT uuid_generate_v4()`; `session_id uuid`; `lead_id uuid`; `axis_id text NOT NULL`; `axis_name_ar text`; `axis_name_en text`; `raw_score integer DEFAULT 0`; `max_possible integer DEFAULT 0`; `percentage numeric(5,2) DEFAULT 0`; `weight numeric(5,2) DEFAULT 1.00`; `weighted_score numeric(10,2) DEFAULT 0`; `grade text`; `created_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `scores_lead_id_fkey: FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE`; `scores_pkey: PRIMARY KEY (id)`; `scores_session_id_fkey: FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE`
- **Indexes:** `idx_scores_session: CREATE INDEX idx_scores_session ON public.scores USING btree (session_id)`; `scores_pkey: CREATE UNIQUE INDEX scores_pkey ON public.scores USING btree (id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (7):** `Allow anon insert scores [INSERT TO anon] USING=- CHECK=true`; `Service role full access scores [ALL TO service_role] USING=true CHECK=true`; `anon_insert_scores [INSERT TO anon] USING=- CHECK=true`; `p0_admin_select_scores [SELECT TO authenticated] USING=is_active_admin(( SELECT auth.uid() AS uid)) CHECK=-`; `scores_public_insert [INSERT TO public] USING=- CHECK=true`; `scores_public_select [SELECT TO public] USING=true CHECK=-`; `service_all_scores [ALL TO service_role] USING=true CHECK=true`
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** `complete_assessment_session(p_session_id uuid, p_assessment_user_id uuid, p_overall_score numeric, p_classification text, p_score_rows jsonb)`, `complete_p3_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p3_public_assessment_session(p_session_id uuid, p_access_token_hash text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p4_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p4_public_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_public_assessment_session(p_session_id uuid, p_access_token_hash text, p_submission_fingerprint text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_public_assessment_session(p_session_id uuid, p_score_rows jsonb, p_overall_score numeric, p_classification text)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `assets/js/app.js`, `admin/assessment-manager.js`, `supabase/functions/assessment-access/index.ts`, `assets/js/report-interpretation.js`, `assets/js/report-validation.js`
- **Initial CREATE TABLE provenance:** **NOT LOCATED** in the tracked migration search used for this worksheet. Treat as an unresolved provenance gap until a complete file-level scan/source archive confirms absence.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001190000_p0_security_closure.sql`, `supabase/migrations/20261002161455_p3_production_implementation.sql`, `supabase/migrations/20261002161945_p3_preserve_completion_access_v2.sql`, `supabase/migrations/20261003082603_20261003093000_p4_submission_prepare_finalize.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.sessions`

- **Live columns (25):** `id uuid NOT NULL DEFAULT uuid_generate_v4()`; `lead_id uuid`; `assessment_type_id uuid`; `status text DEFAULT 'in_progress'::text`; `current_question integer DEFAULT 1`; `started_at timestamp with time zone DEFAULT now()`; `completed_at timestamp with time zone`; `duration_seconds integer DEFAULT 0`; `ip_address inet`; `user_agent text`; `assessment_user_id uuid`; `usage_consumed_at timestamp with time zone`; `assessment_version integer`; `scoring_engine_version text`; `interpretation_version integer`; `scoring_contract_version text`; `assessment_config_digest text`; `submission_state text NOT NULL DEFAULT 'draft'::text`; `submission_snapshot jsonb`; `submission_fingerprint text`; `submission_started_at timestamp with time zone`; `last_activity_at timestamp with time zone`; `attempt_key_hash text`; `submission_economic_input jsonb`; `assessment_release_id uuid`
- **Constraints / relationships:** `sessions_assessment_release_id_fkey: FOREIGN KEY (assessment_release_id) REFERENCES assessment_config_releases(id) ON DELETE RESTRICT`; `sessions_assessment_type_id_fkey: FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id)`; `sessions_assessment_user_id_fkey: FOREIGN KEY (assessment_user_id) REFERENCES assessment_users(id) ON DELETE SET NULL`; `sessions_lead_id_fkey: FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE`; `sessions_pkey: PRIMARY KEY (id)`; `sessions_submission_state_check: CHECK ((submission_state = ANY (ARRAY['draft'::text, 'processing'::text, 'completed'::text])))`
- **Indexes:** `idx_sessions_assessment: CREATE INDEX idx_sessions_assessment ON public.sessions USING btree (assessment_type_id)`; `idx_sessions_lead: CREATE INDEX idx_sessions_lead ON public.sessions USING btree (lead_id)`; `sessions_active_attempt_key_uidx: CREATE UNIQUE INDEX sessions_active_attempt_key_uidx ON public.sessions USING btree (assessment_type_id, attempt_key_hash) WHERE ((attempt_key_hash IS NOT NULL) AND (status = 'in_progress'::text))`; `sessions_assessment_release_id_idx: CREATE INDEX sessions_assessment_release_id_idx ON public.sessions USING btree (assessment_release_id) WHERE (assessment_release_id IS NOT NULL)`; `sessions_assessment_user_id_idx: CREATE INDEX sessions_assessment_user_id_idx ON public.sessions USING btree (assessment_user_id)`; `sessions_assessment_user_status_idx: CREATE INDEX sessions_assessment_user_status_idx ON public.sessions USING btree (assessment_user_id, assessment_type_id, status, started_at DESC)`; `sessions_assessment_version_idx: CREATE INDEX sessions_assessment_version_idx ON public.sessions USING btree (assessment_type_id, assessment_version)`; `sessions_attempt_lookup_idx: CREATE INDEX sessions_attempt_lookup_idx ON public.sessions USING btree (assessment_type_id, attempt_key_hash) WHERE (attempt_key_hash IS NOT NULL)`; `sessions_pkey: CREATE UNIQUE INDEX sessions_pkey ON public.sessions USING btree (id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (7):** `Allow anon insert sessions [INSERT TO anon] USING=- CHECK=true`; `Allow anon update sessions [UPDATE TO anon] USING=true CHECK=true`; `Service role full access sessions [ALL TO service_role] USING=true CHECK=true`; `anon_insert_sessions [INSERT TO anon] USING=- CHECK=true`; `service_all_sessions [ALL TO service_role] USING=true CHECK=true`; `sessions_public_insert [INSERT TO public] USING=- CHECK=true`; `sessions_public_select [SELECT TO public] USING=true CHECK=-`
- **Triggers:** `c03_pin_session_release: CREATE TRIGGER c03_pin_session_release BEFORE INSERT ON public.sessions FOR EACH ROW EXECUTE FUNCTION c03_pin_session_release()`
- **Stored functions with table-name text match:** `complete_assessment_session(p_session_id uuid, p_assessment_user_id uuid, p_overall_score numeric, p_classification text, p_score_rows jsonb)`, `complete_p3_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p3_public_assessment_session(p_session_id uuid, p_access_token_hash text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p4_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_p4_public_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_submission_fingerprint text, p_result jsonb)`, `complete_p4_public_assessment_session(p_session_id uuid, p_access_token_hash text, p_submission_fingerprint text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)`, `complete_public_assessment_session(p_session_id uuid, p_score_rows jsonb, p_overall_score numeric, p_classification text)`, `delete_assessment_draft_secure(p_id uuid)`, `get_admin_assessment_session_counts_secure()`, `get_admin_report_sessions_secure(p_lead_id uuid)`, `prepare_assessment_submission(p_session_id uuid, p_access_token_hash text)`, `prepare_assessment_submission(p_session_id uuid, p_access_token_hash text, p_economic_input jsonb)`, `save_assessment_answer(p_access_token_hash text, p_question_id text, p_option_index integer, p_current_question integer)`, `start_assessment_session(p_access_token_hash text, p_assessment_user_id uuid, p_assessment_type_id uuid, p_lead_id uuid)`, `start_public_assessment_session(p_access_token_hash text, p_assessment_type_id uuid, p_lead_id uuid)`, `start_public_assessment_session(p_access_token_hash text, p_assessment_type_id uuid, p_lead_id uuid, p_attempt_key_hash text)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `assets/js/app.js`, `admin/assessment-manager.js`, `supabase/functions/assessment-access/index.ts`, `supabase/functions/assessment-access/engine.ts`
- **Initial CREATE TABLE provenance:** **NOT LOCATED** in the tracked migration search used for this worksheet. Treat as an unresolved provenance gap until a complete file-level scan/source archive confirms absence.
- **Migration files with known references / changes found in targeted searches:** `supabase/migrations/20261001120000_protected_assessment_access_foundation.sql`, `supabase/migrations/20261001190000_p0_security_closure.sql`, `supabase/migrations/20261002161455_p3_production_implementation.sql`, `supabase/migrations/20261003082558_20261003090000_p4_submission_foundation.sql`, `supabase/migrations/20261003084304_20261003103000_p4_submission_context_lock.sql`, `supabase/migrations/20261015120000_c03_github_oidc_release_authorization.sql`
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.specialty_profiles`

- **Live columns (13):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `specialty_key text NOT NULL`; `specialty_name_ar text NOT NULL`; `specialty_name_en text NOT NULL`; `default_avg_visit real NOT NULL DEFAULT 50`; `default_visits_per_year real NOT NULL DEFAULT 4`; `default_years_relationship real NOT NULL DEFAULT 5`; `default_referral_rate real NOT NULL DEFAULT 10`; `specialty_multiplier real NOT NULL DEFAULT 1.0`; `team_capacity_factor real NOT NULL DEFAULT 1.0`; `description_ar text`; `created_at timestamp with time zone DEFAULT now()`; `updated_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `specialty_profiles_pkey: PRIMARY KEY (id)`; `specialty_profiles_specialty_key_key: UNIQUE (specialty_key)`
- **Indexes:** `specialty_profiles_pkey: CREATE UNIQUE INDEX specialty_profiles_pkey ON public.specialty_profiles USING btree (id)`; `specialty_profiles_specialty_key_key: CREATE UNIQUE INDEX specialty_profiles_specialty_key_key ON public.specialty_profiles USING btree (specialty_key)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (0):** No policy row returned for this table.
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** No text match in public function bodies found by this query; this is not proof of no dependency.
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** No match in sampled files. This is not proof of no caller.
- **Initial CREATE TABLE provenance:** **NOT LOCATED** in the tracked migration search used for this worksheet. Treat as an unresolved provenance gap until a complete file-level scan/source archive confirms absence.
- **Migration files with known references / changes found in targeted searches:** No specific migration path identified by targeted search; requires exhaustive migration-file scan.
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.team_capacity_factors`

- **Live columns (7):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `team_range text NOT NULL`; `team_min integer`; `team_max integer`; `capacity_factor real NOT NULL DEFAULT 1.0`; `label_ar text NOT NULL`; `label_en text NOT NULL`
- **Constraints / relationships:** `team_capacity_factors_pkey: PRIMARY KEY (id)`; `team_capacity_factors_team_range_key: UNIQUE (team_range)`
- **Indexes:** `team_capacity_factors_pkey: CREATE UNIQUE INDEX team_capacity_factors_pkey ON public.team_capacity_factors USING btree (id)`; `team_capacity_factors_team_range_key: CREATE UNIQUE INDEX team_capacity_factors_team_range_key ON public.team_capacity_factors USING btree (team_range)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (0):** No policy row returned for this table.
- **Triggers:** No non-internal trigger returned.
- **Stored functions with table-name text match:** No text match in public function bodies found by this query; this is not proof of no dependency.
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** No match in sampled files. This is not proof of no caller.
- **Initial CREATE TABLE provenance:** **NOT LOCATED** in the tracked migration search used for this worksheet. Treat as an unresolved provenance gap until a complete file-level scan/source archive confirms absence.
- **Migration files with known references / changes found in targeted searches:** No specific migration path identified by targeted search; requires exhaustive migration-file scan.
- **Disposition:** Initial DDL not located by targeted repository search; provenance remains OPEN. Do not classify the table as unused or rebuildable.

### `public.traps`

- **Live columns (11):** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `assessment_type_id uuid`; `name text`; `question_id text`; `validates text`; `target_axis text`; `penalty_base numeric`; `penalty_max numeric`; `message text`; `message_ar text`; `created_at timestamp with time zone DEFAULT now()`
- **Constraints / relationships:** `traps_assessment_type_id_fkey: FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id)`; `traps_pkey: PRIMARY KEY (id)`
- **Indexes:** `traps_pkey: CREATE UNIQUE INDEX traps_pkey ON public.traps USING btree (id)`
- **RLS:** enabled=true; FORCE RLS=false. **Policies (0):** No policy row returned for this table.
- **Triggers:** `p2_traps_immutable: CREATE TRIGGER p2_traps_immutable BEFORE INSERT OR DELETE OR UPDATE ON public.traps FOR EACH ROW EXECUTE FUNCTION p2_assert_draft_version('direct')`
- **Stored functions with table-name text match:** `create_assessment_secure(p_slug text, p_title_ar text, p_title_en text, p_description text, p_has_traps boolean, p_has_ev_simulator boolean)`, `create_assessment_version_secure(p_source_version_id uuid)`, `delete_assessment_draft_secure(p_id uuid)`, `delete_draft_axis_secure(p_axis_id uuid)`, `delete_draft_question_secure(p_question_id uuid)`, `duplicate_assessment_secure(p_id uuid, p_clone_slug text)`, `import_assessment_secure(p_data jsonb)`, `p2_assert_draft_version()`, `p2_assessment_type_immutability()`, `save_assessment_secure(p_id uuid, p_title_ar text, p_title_en text, p_slug text, p_description text, p_status text, p_has_traps boolean, p_has_ev_simulator boolean)`, `update_assessment_working_copy_secure(p_id uuid, p_title_ar text, p_title_en text, p_description text, p_has_traps boolean, p_has_ev_simulator boolean)`
- **Repository source files with table-name text match (sampled core runtime/admin/report files only):** `admin/assessment-manager.js`, `admin/assessment-editor-workspace.js`, `supabase/functions/assessment-access/index.ts`, `supabase/functions/assessment-access/engine.ts`, `assets/js/report-validation.js`
- **Initial CREATE TABLE provenance:** **NOT LOCATED** in the tracked migration search used for this worksheet. Treat as an unresolved provenance gap until a complete file-level scan/source archive confirms absence.
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
