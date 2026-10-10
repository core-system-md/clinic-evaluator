# HANDOFF — Production Structured Result Release Recovery
**Date:** 2026-10-10  
**Repository:** core-system-md/clinic-evaluator  
**Supabase project:** oaqpzaarppccbnepffxx  
**Production Edge Function:** assessment-access  
**Status:** IN PROGRESS — NOT CLOSED

This handoff supersedes older statements that Production has not changed. Use live-state evidence below for the current deployment. Do not restart WP-01 or redo completed work.

## 1. Owner operating instructions — mandatory
- One bounded task at a time; no unrelated refactors or extra security/architecture projects.
- Existing assessment behavior and governing contract are the baseline. Preserve a working system and make only changes needed for the requested fixes.
- Inspect current repo, deployed code, database state, and existing test evidence before editing.
- No automatic progression between WPs. Close and report one gate at a time; stop at each stage.
- Never call a gate PASS without concrete test/runtime evidence. Mark missing evidence NOT VERIFIED.
- No further Production writes/deployments until read-only reconciliation establishes exact state and a safe, minimal E2E plan.
- Do not reset/delete/republish assessment versions, change public routes, or invent test completions in live user data.

## 2. What is confirmed now

### 2.1 Production migrations
A fresh Supabase list_migrations response includes:
- 20261009164918 / canonical_axis_weights
- 20261009164951 / structured_result_authority
- 20261009170228 / reconstruct_final_assessment_versions

This supersedes older repository notes claiming these migrations are absent in Production. A separate filtered query against supabase_migrations.schema_migrations was blocked by tool security; do not claim that query independently confirmed exact rows. The migration-list response is the evidence available.

### 2.2 Production Edge Function
A live get_edge_function inspection returned:
- Function: assessment-access
- Active version: 34
- Bundle SHA-256: fc3dce961191d081d3d1bcb099d6b0d2b79c47982877e91077fcdb18474cd907
- Entry imports ./engine.ts and ./economic-opportunity-model-v1.mts
- The current deployed bundle uses the Structured Result completion path.

This is not proof of a complete assessment session succeeding end-to-end.

### 2.3 Completion RPCs and privileges
Read-only database inspection confirms these functions exist:
- complete_p4_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_submission_fingerprint text, p_result jsonb)
- complete_p4_public_assessment_from_result(p_session_id uuid, p_access_token_hash text, p_submission_fingerprint text, p_result jsonb)
- Legacy complete_p4_assessment_session(...) and complete_p4_public_assessment_session(...) still exist.

The inspected grants show service_role=true, authenticated=false, anon=false for each of these RPCs. prosecdef=false was reported for each function. Do not remove legacy RPCs as part of this handoff.

### 2.4 Production smoke checks observed
The HTTP response log contains:
- get_catalog: HTTP 200, success:true; response includes the assessment catalog.
- get_content: HTTP 200 for observed assessment-content requests, including Patient Journey and other existing families.
- Invalid/expired session tokens for session/completion-related requests returned HTTP 401, as expected.

API-declared counts observed:
| Family slug | Questions | Axes |
|---|---:|---:|
| clinic-performance | 9 | 3 |
| patient-journey | 25 | 5 |
| medical-team-assessment | 12 | 4 |
| comprehensive-clinic-assessment | 36 | 6 |
| admin-reception-assessment | Re-check through API |

These are API-declared counts, not an exhaustive content-integrity proof. A prior SQL count joined questions to axes and inflated counts by join multiplication; do not reuse those multiplied counts as real question totals.

### 2.5 What remains unproven
- No successful disposable/test assessment has been completed end-to-end through deployed version 34 and its Structured Result persistence path.
- No evidence proves the saved report returned to the user is correct after completion.
- Exact live-to-repository deployed-source commit mapping is not yet proven by the bundle hash.
- At initial Handoff creation, WP-05/WP-06/WP-07 corrective reconciliation was not established as fully closed. WP-05 has since been closed at repository level by corrective PR #72; WP-06 and WP-07 remain open, and Production E2E remains NOT VERIFIED.
- The broad Node baseline historically failed four unrelated P5 editor assertions (tests 9, 12, 17, 18); check latest Actions before relying on historical status.
- Production release is NOT CLOSED.

## 3. Repository governance evidence and conflict to resolve
Governance records exist:
- documentation/governance/FINAL-IMPLEMENTATION-CONTRACT-2026-10-07.md
- documentation/governance/CURRENT-IMPLEMENTATION-STATE-RECONCILIATION-2026-10-08.md
- documentation/governance/IMPLEMENTATION-STATUS-REGISTER-2026-10-08.md
- WP-specific records for WP-05, WP-06, WP-07 and WP-08.

Older portions of the reconciliation/status register say Production was untouched and rollout was blocked. Those statements were true at their historical timestamp but are now stale because Production migrations and Edge Function v34 have since been applied/deployed. Treat this handoff as the newer live-state addendum; do not rewrite historical evidence as though the older statements were never true.

### WP-05 corrective PR — resolved 2026-10-10

Canonical corrective PR #72, “WP-05 corrective: restore report semantics and history provenance”:
- Branch: `wp05-corrective-semantic-ownership-2026-10-10`
- Head before squash merge: `d94607ccacc3421e42ae20f19957383cd165c12f`
- Squash merge to `main`: `270d868825d83aa50624ef7ccd40313eef0c9bfc`
- Dedicated WP-05 workflow run `38005770371`: **SUCCESS**
- Related WP-06 report-validation workflow run `38005770377`: **SUCCESS**
- P3 kernel `38005770365`, WP-02 `38005770363`, WP-09 `38005770318`: **SUCCESS**
- PR #69 was closed unmerged as superseded; GitHub comment ID `6091206906` records why. PR #69’s 90-commit diff was not merged.

The merged change closes WP-05’s repository-level contract reconciliation: explicit family report models, server-owned report projection semantics, and persisted previous-session provenance wired to trend evaluation. It did not mutate Production or deploy an Edge Function.

PR #72’s branch CI also exposed two unrelated known repository/workflow path failures that remain for migration-name/history reconciliation:
- WP-03 run `38005770356`: expected `supabase/migrations/20261008090000_canonical_axis_weights.sql` is absent from the current source tree.
- WP-04 run `38005770367`: expected `supabase/migrations/20261008100000_structured_result_authority.sql` is absent from the current source tree.
No migrations or test harnesses for those work packages were changed here.

## 4. Exact continuation point — after WP-05 closeout

**WP-05 is complete at the repository implementation boundary and this conversation stops here.** Do not restart WP-05 or repeat its tests as a new task without a new finding.

1. The canonical fix is PR #72, merged to `main` at `270d868825d83aa50624ef7ccd40313eef0c9bfc`; WP-05 run `38005770371` is **SUCCESS**.
2. The old stacked PR #69 is closed unmerged and must not be revived.
3. WP-03/WP-04 failures on missing migration paths are recorded above and remain assigned to the separate migration-name/history reconciliation. Do not alter migrations in the WP-05 closeout.
4. The next *separate* corrective item, if the owner’s existing release authorization still applies, is WP-06. Do not begin WP-06 automatically in this handoff.
5. WP-07 follows only after WP-06 is separately corrected and evidenced. The controlled E2E and overall release gate remain later tasks.

Do not change scoring formulas, questionnaire content, published assessment versions, Production database state, routes, or the deployed Edge Function as part of this WP-05 closeout.
6. WP-06 scope: ensure browser responses expose only the approved user projection, not raw persisted Structured Result. Add focused tests; do not broaden into unrelated security redesign.
7. WP-07 scope: move remaining semantic report/presentation strings out of assets/js/app.js into the contract-defined catalog/linkage model; focused tests only.
8. After all three are closed, run a controlled disposable E2E assessment through the exact deployed API path. If a disposable live-production session cannot be safely created and cleaned without touching real user data, mark Production E2E NOT VERIFIED and use a local/disposable database harness instead.
9. Final gate: verify migration order/identity, deployed function source/provenance, catalogue/content consistency, successful result persistence and returned user report, regression suites, rollback/recovery. Report each gate PASS/FAIL/NOT VERIFIED.

## 5. Release status matrix
| Gate | Status | Evidence / reason |
|---|---|---|
| Release migrations present in Supabase migration list | PASS (presence only) | Fresh migration list includes the three versions; SQL-filtered row check was blocked |
| Edge Function version 34 deployed | PASS (deployment exists) | Live function metadata and bundle SHA-256 |
| Catalog endpoint | PASS (smoke only) | HTTP 200 and success:true |
| Content endpoint | PASS (smoke only) | HTTP 200 responses observed |
| Invalid token rejection | PASS (negative smoke only) | HTTP 401 for invalid/expired token |
| Valid completion + Structured Result persistence E2E | NOT VERIFIED | No successful disposable completion trace |
| User-facing saved report correctness | NOT VERIFIED | No post-completion result-read assertion |
| WP-05 corrective closure | **PASS / CLOSED (repository)** | PR #72 merged at `270d868825d83aa50624ef7ccd40313eef0c9bfc`; dedicated run `38005770371` SUCCESS; Production E2E remains NOT VERIFIED |
| WP-06 corrective closure | OPEN / NOT VERIFIED | No current closure evidence after corrective audit |
| WP-07 corrective closure | OPEN / NOT VERIFIED | No current closure evidence after corrective audit |
| Exact deployed source-to-commit provenance | NOT VERIFIED | Bundle hash available; matching repository artifact/commit not established |
| Overall release | NOT CLOSED | Required corrective gates and valid E2E proof incomplete |

## 6. Guardrails / do not do
- Do not treat “migration/function deployed” as equivalent to “release complete.”
- Do not start WP-08 again: its repository implementation was previously merged and verified; this handoff concerns live release reconciliation and the WP-05→WP-07 corrective gate.
- Do not claim WP-06 or WP-07 closed solely because historical PRs merged. WP-05 is closed only on the corrective evidence and merge recorded above; its Production E2E gate remains NOT VERIFIED.
- Do not run complete against real user sessions or use random fake data in production.
- Do not edit applied migration files or rewrite Supabase migration history.
- Do not make additional production changes before proving the exact defect and validating a safe test path.

**Next action:** Stop after the completed WP-05 closeout. The next authorized corrective stage is WP-06 in a separate continuation; overall Production release remains NOT CLOSED.
