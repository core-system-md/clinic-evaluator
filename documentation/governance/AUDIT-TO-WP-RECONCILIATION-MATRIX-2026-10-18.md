# SESSION CLOSEOUT ADDENDUM — 2026-10-21 (D-05 / WP-11)

**This addendum records the session closeout; it does not replace the original audit inventory below.** Every C/D finding remains represented in Section 3. Keep its original ID, prior status/evidence, responsible gate and remaining action. Where later evidence supersedes an earlier summary, append evidence rather than deleting the audit trail.

## Actual work performed in this session

- Read-only GitHub review of `main`, the existing D-05 worksheet, migration DDL/source-ledger/provenance artifacts, and current handoff.
- Read-only Supabase catalog/body screening on project `oaqpzaarppccbnepffxx` for public-schema SECURITY DEFINER functions, `prosecdef`, function `proconfig`, effective EXECUTE privileges via `has_function_privilege`, and selected definitions.
- The screening returned no public-schema SECURITY DEFINER function executable by `anon`. This is a bounded catalog result only; it does not prove all authorization paths, search-path safety, dynamic SQL, effective-role behavior, or RLS interactions are safe.
- The body of `save_assessment_secure` delegates create/published-edit/draft-edit operations to `create_assessment_secure`, `update_published_assessment_content_secure`, and `update_assessment_working_copy_secure`. These paths were identified as remaining review targets, not declared passed.
- Two documentation commits were saved and verified on `main` during this session: `03aca8cab38028ab59d4cecab4a8d1424aa2d87b` updates the live-schema worksheet; `0635674ee99cec176632687f050a76f754af09a7` updates the handoff. No application source, SQL migration, grants, policies, schema, production data, deployment, or PR state was changed.
- No automated test suite, E2E test, deployment test, negative-access runtime test, or isolated migration replay was run in this session. No WP was closed.

## Current stage gate and exact continuation

- **WP-10 §40:** closed for its bounded scope under the previously recorded evidence; do not reopen it absent new regression evidence.
- **WP-11 §41 / D-05:** IN PROGRESS / NOT CLOSED; D-05 remains OPEN / BLOCKING RECONCILIATION. Existing evidence includes the 56-file tracked migration DDL index, 25-table live worksheet, 57-row live migration ledger reconciliation, caller/reference scans, privilege summaries, 38 validated FK checks with zero orphan rows, and eight targeted semantic checks with zero violations. These are bounded checks, not full acceptance.
- **WP-12 §42:** NOT STARTED. No automatic stage transition.
- **C-01, C-02, C-03:** preserve existing CLOSED dispositions. C-03 live E2E remains WAIVED / NOT RUN, not PASS. Do not reopen without new regression evidence and owner direction.
- **D-05 remaining:** inspect delegated secure function bodies and their authorization/state boundaries; review each SECURITY DEFINER function's effective role, search-path and dynamic SQL behavior; reconcile DDL evolution against live catalog; seek authoritative original schema provenance and resolve migration source/ledger identity differences without rewriting history or merging PR #120. Unknowns stay OPEN.
- No production mutation, baseline synthesized from Production, table delete/recreate, migration apply/history rewrite, grants/policy/schema change, deployment, or PR merge is authorized by this closeout.

**Next session's first action:** resume WP-11/D-05 by fetching the live definitions and ACLs of `create_assessment_secure`, `update_published_assessment_content_secure`, and `update_assessment_working_copy_secure`, then trace each call's authorization checks and state boundary against its callers. Record exact evidence in the D-05 worksheet before any decision or change. Stop after this bounded review; do not start WP-12.

---

# Audit-to-Work-Package Reconciliation Matrix — 2026-10-18

**Purpose:** Reconcile the 2026-10-11 comprehensive audit against the governing implementation contract, the WP sequence, and evidence available in the repository/current Production handoff. This is a traceability document, not a new implementation plan.

**Repository:** `core-system-md/clinic-evaluator`  
**Governing contract:** `documentation/governance/FINAL-IMPLEMENTATION-CONTRACT-2026-10-07.md`  
**Current state anchor:** `documentation/handoff/CURRENT-SESSION-HANDOFF.md`  
**Audit date:** 2026-10-11; later verified evidence is used where it supersedes the audit snapshot.

## 1. Rules for reading this matrix

- The audit has three critical findings labelled **C-01–C-03**, followed by **D-04–D-19**. They are 19 findings in total; the C findings are not relabelled as D findings.
- A finding being fixed or closed does **not** close an entire WP. A WP can cover several findings, and a finding can touch more than one WP.
- WP-09 is already closed. Do not reopen it to absorb new work merely because a later finding concerns legacy references or assets. Handle any distinct remaining issue in its correct existing contract scope.
- C-01 and C-03 are closed under the latest owner-directed handoff. C-02 is closed with live value-70 scoring evidence. Do not reopen any of them without new regression evidence and explicit owner direction.
- The contract defines WP-10 (§40), WP-11 (§41), and WP-12 (§42). They are the planned remaining stages; the 2026-10-08 state reconciliation records WP-10–WP-12 as not started as independent stages. A fix made incidentally elsewhere is evidence for that finding only, not proof that a full WP is closed.
- “Verified” below means supported by the listed repository or live evidence. “Partial” means implementation or documentary progress exists but the full acceptance evidence is absent. “Open” means the finding still needs scoped reconciliation. “Decision-bound” means no change may be made without an owner decision.
- No Production write, migration, deployment, deletion, release-gate change, or security redesign is authorized by this matrix.

## 1A. Mandatory no-drop rule and source-verification boundary

This is a mandatory governance rule for all remaining work:

1. **No audit finding may disappear.** Every finding from the original audit remains represented until it has a documented disposition. Closing a WP does not automatically close every finding associated with it; one finding may require action or verification across more than one WP.
2. **Explicit assignment is required.** Every open, partial, decision-bound, or unverified finding must name its responsible WP gate(s), the required action, acceptance evidence, and next continuation point. For cross-WP findings, record each stage's responsibility separately and keep the finding open until all required parts are resolved.
3. **No evidence, no closure.** “Not found,” “not tested,” “not rechecked,” or “owner waived” must never be converted into PASS/CLOSED. A waiver is recorded as WAIVED / NOT RUN and closes only the waived scope, not the technical assertion.
4. **Stage gate review.** At each WP closeout, compare the actual diff, tests and runtime evidence with the contract and every finding assigned to that WP. Carry every unresolved item forward by its original ID, exact remaining action, and next authorized WP. Stop after the current WP; do not start the next WP automatically.
5. **Closed scope protection.** C-01, C-02 and C-03 remain closed under their recorded dispositions unless new regression evidence and explicit owner direction justify reopening. WP-09 remains closed. Distinct D findings must not be silently absorbed into those closures.
6. **No parallel plan.** This matrix is a traceability overlay on the approved WP-09–WP-12 contract sequence, not a new workstream. Out-of-scope items remain documented dependencies/decision requirements and are not implemented as an unapproved parallel project.
7. **Original-audit verification limitation.** The named artifact `clinic-evaluator-full-audit-report-2026-10-11.md` was not found in the current `main` repository tree or the available file search. This matrix reconciles audit details preserved in existing repository/handoff records, but exact source-text verification—especially D-10 and the conflicting D-11 label—remains OPEN until the original report is located and compared. Do not claim a complete verbatim audit-to-matrix review before that comparison.

## 1B. Required per-finding tracking fields

For every C/D finding, retain: (a) original ID and source wording/reference; (b) factual status and evidence date/source; (c) responsible WP(s), with distinct action per WP for cross-stage items; (d) acceptance criteria/tests; (e) dependency or owner decision; (f) final disposition and evidence link; and (g) if still open, exact next WP gate and remaining action.

A finding with incomplete source traceability remains visible as **OPEN — SOURCE RECONCILIATION REQUIRED**; it must not be dropped or assigned by guesswork.

## 2. WP contract anchors

| WP | Contract scope | Acceptance boundary for this reconciliation |
|---|---|---|
| WP-09 | §39 — remove obsolete engine/runtime references | Closed historical stage. Do not reopen; only distinguish any genuinely separate remaining finding from the work already closed. |
| WP-10 | §40 — normalize weight representations, score-field semantics, obsolete report fields and obsolete Leakage outputs; preserve historical records unless an explicit migration rule exists; destructive deletion only under approved reset policy and dependency checks | A bounded data/field semantics package with explicit migration/deletion rules. Does not authorize broad cleanup or editing published versions in place. |
| WP-11 | §41 — final schema and policies, legacy functions and permissions, no newly introduced direct public access | Evidence-backed schema, grants, function and public-exposure reconciliation. Historical migration provenance and approval status must remain explicit. |
| WP-12 | §42 — layered source/static, unit, integration, E2E, failure/retry and runtime verification | A separate verification stage after required implementation/reconciliation. E2E requirements in the contract must not be reported as passed when owner-waived or not run. |

## 3. Finding-by-finding reconciliation

| Audit finding | Main subject from audit / current evidence | Contract mapping | Evidence-based status | Required disposition in the existing path |
|---|---|---|---|---|
| **C-01** | Interpretation binding and option identity for the currently published V1 assessment families | Historical relationship to WP-08/version reconstruction; verify only under WP-12 if a new regression appears | **CLOSED** for current published V1 families. Production E2E and exact-run cleanup evidence are recorded in the current handoff. | No work. Do not reopen or use this as a reason to restart the prior sequence. Future-version publication/binding is a separate scope, not a C-01 reopening. |
| **C-02** | Value 70 persistence and scoring | Historical persistence/scoring repair; verification evidence contributes to WP-12 | **CLOSED**. Production value-70 path was exercised; the compatibility constraint includes 70; the handoff records scoring lineage and cleanup. | No work. Do not rerun or reopen without new regression evidence. |
| **C-03** | Assessment configuration release/publication and repository-to-runtime release binding | Release path and its release evidence are documented in the current handoff; not a remaining WP-10/11/12 implementation ticket | **CLOSED BY OWNER DECISION (scope closure)**; guarded release verified. Live E2E was explicitly waived and is **NOT RUN**, not passed. | No work. Do not add a runner, cleanup workflow, or new C-03 tests; do not misstate the waiver as a pass. |
| **D-04** | Admin assessment manager still contains legacy trap/Leakage presentation logic and fields (including `trap_triggered` / `is_trap` and P3-related/causal financial language) | **WP-10 §40** for obsolete report/Leakage fields; **WP-12 §42** static, unit and integration checks. Historical WP-06/WP-07 closures do not by themselves prove this distinct admin path is clean. | **OPEN** based on the audit/current source inspection. | During WP-10, identify the exact active fields and semantics, remove only contract-forbidden obsolete outputs, and preserve any valid diagnostic behavior. Verify through WP-12; do not perform a broad unrelated UI rewrite. |
| **D-05** | Production schema/migration provenance; completed full 56 migration scan, wrapper-aware caller scan of 40 tracked application/entrypoint files, all-25-table direct privilege matrix, public function execute summary, 38 FK orphan checks, 8 semantic checks, and SECURITY DEFINER search-path inventory | **WP-11 §41** schema/function reconciliation; **WP-12 §42** source/runtime verification | **OPEN / BLOCKING RECONCILIATION**. Seven of 25 live public tables have initial CREATE TABLE definitions in tracked migrations; 18 exact names lack an initial CREATE TABLE in those 56 files and match the P0 table list. No authoritative full-schema baseline was found in the tracked tree; external archive not examined. Live ledger has 57 entries vs 56 main files, 55 exact version/name matches, live-only 20261018075528/20261018075855 and source-only 20261018110000. All 38 FKs are validated and returned zero orphan rows; 8 targeted cross-table checks returned zero violations. `anon` has no direct table-level privileges among eight queried types on 25/25 tables; authenticated direct MAINTAIN/REFERENCES/TRIGGER/TRUNCATE remains on admin_audit_log and admin_capabilities. Public functions: 87 total, 65 SECURITY DEFINER; 0 anon-executable SECURITY DEFINER; 51 authenticated-executable SECURITY DEFINER; 14 empty search_path and 51 `public, pg_temp`. Two non-SECURITY-DEFINER trigger functions show anon EXECUTE. Authenticated can execute is_owner(uuid)/is_active_admin(uuid). PR #120 remains OPEN / READY FOR REVIEW / UNMERGED; candidate changes are not on main/Production. | Find authoritative external/original schema if any; reconcile unmatched migration IDs/source on main with historical deployment evidence; review all SECURITY DEFINER bodies/callers/search paths and effective access; review the two anon-executable trigger functions; complete remaining semantic/integrity and RLS behavior checks as authorized. No Production-derived baseline, schema/grant/policy changes, migration-history rewrite/application, deletion/recreation, PR merge, or WP-12 start. Keep D-05 OPEN. |
| **D-06** | EV Simulator uses incorrect/ignored inputs and defaults (including visits) and a fixed three-visits/year assumption; referral defaults are not represented as unknown | **WP-10 §40** score/report-field semantics; **WP-12 §42** EV unit/integration/runtime checks | **OPEN**. Current code/evidence indicates the visits input is checked but ignored and the model retains the fixed assumption. | Repair the calculation and its input/default semantics rather than hiding the simulator. Follow versioning rules: do not edit a published assessment version in place. Verify outputs and edge cases in WP-12. |
| **D-07** | Legacy database functions/schema requiring dependency-aware review before removal | **WP-11 §41** legacy function/schema and permission reconciliation; **WP-12 §42** regression verification | **OPEN**. The current evidence does not establish a complete dependency inventory and safe disposition for all legacy functions. | Inventory callers, grants, triggers, RPC dependencies and deployed callers first. Remove only proven obsolete objects after dependency checks and required approval; no blanket deletion. |
| **D-08** | Excess database privileges, including `TRUNCATE`, `TRIGGER`, and `REFERENCES` on `admin_audit_log` and `admin_capabilities` for `authenticated` | **WP-11 §41** policies/permissions; **WP-12 §42** permission and negative-access tests | **OPEN** per latest read-only evidence. | Establish intended privilege requirements and callers, then produce a least-privilege reconciliation with tests. Do not change grants as part of this matrix or perform an unreviewed security redesign. |
| **D-09** | Internal/legacy assets must not be publicly exposed while required client assets remain available | **WP-11 §41** public exposure boundary; **WP-12 §42** deployment/runtime checks. WP-09 remains closed. | **PARTIAL**. PR #81 was merged and Pages checks showed the misspelled legacy assessment asset path returned 404 while `report_texts.json` remained available. The prior handoff says production probes were rate-limited; full independent Production verification was not established there. | Verify the current deployed asset surface and required client assets with bounded read-only probes. Do not remove `report_texts.json` or reopen WP-09. Any source fix must be justified by the actual exposure evidence. |
| **D-10** | V2 assessment/report/version compatibility concern recorded in the audit context | **WP-10 §40** only where data/field normalization is implicated; **WP-12 §42** version naming, report selection, interpretation and integration verification | **NEEDS TARGETED EVIDENCE RECHECK**. The available current summary identifies this as a V2 issue but does not provide a sufficient current, standalone closure proof for every affected path. | At the relevant WP gate, map the exact audited V2 path to source/config and test evidence before changing it. Do not infer that C-01’s closure automatically closes all V2 concerns; equally, do not reopen C-01 absent regression evidence. |
| **D-11** | The audit/handoff materials use conflicting meanings for “D11” (audit context includes log/audit concerns; other project notes use D11 for Git↔DB synchronization or classification/grade semantics) | **UNRESOLVED IDENTIFIER/SCOPE COLLISION**; cannot safely assign to a WP until the original audit wording and referenced evidence are matched | **BLOCKED ON TRACEABILITY, not a new implementation task**. The current records do not establish one unambiguous meaning across all documents. | Preserve the original audit identifier and quote its exact finding when reconciling. Separate distinct topics rather than merging them under one label. No implementation until the source wording is resolved from the audit record. |
| **D-12** | Dead code / non-authoritative paths around Structured Result and reporting | **WP-10 §40** for obsolete report fields; **WP-11 §41** where legacy database functions are involved; **WP-12 §42** forbidden paths and report validation | **OPEN / PARTIAL**. Related WP-06/WP-07 work is historically closed, but current evidence still points to a separate admin/runtime path that needs direct verification. | Trace each remaining reference to a reachable caller and its authority. Remove only confirmed dead/forbidden paths, with tests proving Structured Result remains authoritative. Do not reopen closed WP-06/WP-07 as a blanket action. |
| **D-13** | Historical business-record deletion and its audit trail | Contract §40 historical-record and destructive-delete safeguards; **WP-11 §41** only for any necessary read-only database reconciliation | **HISTORICAL ACTION RECORDED; DO NOT REPEAT**. PR #80 documentation was merged; records preserve reported counts and do not claim a fresh live verification of the historical operation. | Preserve the historical record. No restoration, repeat deletion, or cleanup. If a factual discrepancy is found, document it and seek a separate explicit decision before any data operation. |
| **D-14** | Production migrations applied without evidenced owner approval; inventory of three migration effects | **WP-11 §41** migration/schema reconciliation; WP-10’s migration safeguards apply to any data cleanup proposed from this evidence | **PARTIAL INVENTORY; APPROVAL GAP OPEN**. The prior index records the migration impact inventory but says the three migrations were not owner-approved and no rollback/repair/history rewrite was performed. The current live/repository migration mismatch adds a separate provenance issue under D-05. | Reconcile exact migration identity, SQL effects, sequence and available approval evidence. Do not assume approval, rollback, restore, rewrite history or apply corrective SQL. Keep D-14 distinct from D-05: one concerns authorization/effects; the other baseline/identity reconciliation. |
| **D-15** | Authorization/identity boundary | **WP-11 §41** policies and grants; **WP-12 §42** positive and negative access tests | **OPEN / REQUIRES BOUNDED RECONCILIATION** based on the audit summary; no new authorization architecture is approved by this matrix. | Map each observed grant/policy/path to the intended principal and existing contract. Implement only the least-privilege correction justified by evidence; any architectural alternative requires owner review first. |
| **D-16** | Naming/version-label consistency | **WP-10 §40** where persisted field semantics are affected; **WP-12 §42** version naming and source/static checks | **OPEN** in the audit queue; no complete current closure evidence is cited in the handoff. | Normalize names only where contract/source evidence shows a real mismatch. Avoid cosmetic renames that alter API, migration, or published-version identity. |
| **D-17** | Numeric precision/rounding semantics | **WP-10 §40** score-field semantics; **WP-12 §42** scoring, EV, result-accuracy and integration tests | **OPEN** in the audit queue. Floating-point evidence from C-02 (69.99999999999999 representing 70) is not, by itself, a general rounding-policy decision. | Define expected numeric semantics from the approved contract and tests before implementation. Do not introduce a new rounding policy by inference. |
| **D-18** | Persisted/report result accuracy | **WP-12 §42** scoring, interpretation, Structured Result, persistence, report selection/validation and runtime verification; any identified data-field defect may first belong to WP-10 | **OPEN** unless specific existing evidence proves an individual assertion. | Verify source → saved answer → calculation → persisted Structured Result → user report as separate assertions. Do not treat source tests, a successful release, or a waived E2E as proof of the whole chain. |
| **D-19** | Leaked-password decision record | **Decision-bound**; WP-11 applies only if an already-approved security change is explicitly in scope | **DOCUMENTATION/DECISION ONLY** under the current owner boundary. | Record the existing decision and rationale accurately. Do not rotate credentials, alter authentication, or introduce security changes without a new explicit owner decision. |

## 4. What the matrix says about the remaining work

### WP-10 — next planned implementation stage

WP-10 is the first contract-defined stage after WP-09. Its scope is limited to the data and field semantics named in §40. Findings most directly routed to it are **D-04, D-06, D-12 and D-17**, with D-16 only where a naming issue changes persisted semantics. It must preserve historical records unless an explicit migration rule permits a change. D-13 is not authorization to delete anything again; D-14 is not approval to repair or roll back migrations.

### WP-11 — security/database reconciliation

WP-11 follows WP-10 and covers **D-05, D-07, D-08, D-09, D-14 and D-15**, plus the database-function aspect of D-12. D-05 and D-14 must remain distinct: migration identity/baseline mismatch is not the same question as whether the applied changes had documented owner approval. D-11 cannot be assigned until its conflicting identifier meanings are resolved.

### WP-12 — verification gate

WP-12 is the final layered verification stage, not a substitute for implementing the fixes. It verifies the changes and remaining accepted paths for **D-04 through D-18**, as applicable, across source/static, unit, integration, failure/retry and runtime layers. Contract §42 describes E2E for each V1 assessment. Any owner waiver must be recorded as **WAIVED / NOT RUN**, never PASS. C-03’s specific E2E waiver remains closed under the owner decision and must not be reopened via WP-12.

## 5. Unresolved items that must not become parallel workstreams

1. **D-05 / D-14 migration reconciliation:** compare the live ledger to each exact repository migration file, SQL content and commit sequence. Counts alone are not a safe disposition. No production repair is authorized.
2. **D-10 / D-11 source traceability:** recover the exact audit wording and paths so V2 concerns are not conflated with the conflicting D-11 meanings. Do not invent a finding from a shorthand label.
3. **D-09 Production exposure:** prior successful Pages deployment and preview checks are not a substitute for the missing bounded Production probes.
4. **D-19:** documentation/decision only unless the owner makes a new security decision.

## 6. Exact continuation point

**Resume at WP-10 planning/execution readiness, not at C-01, C-02 or C-03.**

Before any WP-10 implementation, use the table above to select only findings that actually fall within §40; inspect the current code/data contract for those findings; define explicit acceptance tests and any migration rule; then execute WP-10 as one bounded stage and close it with repository evidence. Stop after that stage and update the handoff. Do not start WP-11 automatically. D-05/D-14/D-11 traceability work should be documented as dependencies for the relevant later gate, not used to broaden WP-10.

This matrix is a current reconciliation snapshot, not a claim that all listed findings were re-tested on Production. Each status is bounded by the evidence cited above and must be updated only when new evidence is obtained.


## 7. WP-10 execution evidence addendum — verified 2026-10-18

This addendum supersedes the prior WP-10 evidence/status/action text above for D-04, D-06, D-12, D-17 and D-16 only where the bounded scope below states. It does not close cross-stage work assigned to WP-11 or WP-12, and it does not alter C-01–C-03 dispositions.

**Verification head:** `aa752a54b548e45160dd73932a0b5216963be54d`  
**CI evidence:** [GitHub Actions run #39126698618](https://github.com/core-system-md/clinic-evaluator/actions/runs/39126698618) — SUCCESS. P3 isolated kernel, full Node test suite, P4 disposable PostgreSQL completion harness, and C-02 disposable PostgreSQL answer-save harness passed. Targeted tests for the economic model and Structured Result persistence were added explicitly to the P3 kernel workflow. No Production write, migration, deletion, Edge deployment, or security change was performed.

| Finding | Verified WP-10 disposition | Evidence / remaining gate |
|---|---|---|
| D-04 | **WP-10 SCOPE VERIFIED; WP-12 REMAINS.** Admin report no longer reads answer-level trap fields or renders the trap/Leakage panel. Removed the unused direct answers query and unsupported causal financial wording. Current report values use the official Structured Result; legacy axis scores are explicitly labelled historical. | Static/admin regression assertions and full Node test suite passed in run #39126698618. WP-12 layered verification remains required; do not claim release-wide closure. |
| D-06 | **WP-10 SCOPE VERIFIED; WP-12 REMAINS.** The canonical economic model consumes supplied positive `visitsPerYear`, defaults to 3 only when omitted, rejects zero visits, treats blank referral as unavailable when base inputs are otherwise valid, and returns the base value at 0% referral. Report projection preserves the calculation assumptions. | `tests/p3-economic-model-v1.test.mjs` runs in CI and passed, including report-assumption parity. Endpoint source passes the validated visits input. WP-12 runtime/integration verification remains required. |
| D-12 | **WP-10 REPORT-FIELD/DATA-FLOW SCOPE VERIFIED; FINDING REMAINS OPEN OVERALL.** Removed browser-side fallback projection from raw `row.result`; the client accepts only the server-owned `userReport`. Removed unused `evSimulator: null` and `traps: []` response fields. Admin report uses Structured Result for current overall score, axes and KPIs; it does not fetch answers to construct the report, and legacy axis rows are labelled historical. | D-12 regression test and full Node suite passed in run #39126698618. Database-function/permission work stays assigned to WP-11; layered verification stays assigned to WP-12. |
| D-17 | **WP-10 PRECISION/PERSISTENCE SEMANTICS VERIFIED; WP-12 REMAINS.** Authoritative `assessment_results.result` stores `p_result` unchanged, preserving full Structured Result precision. Report projection preserves fractional percentage values. Legacy `scores.raw_score` and `scores.max_possible` are integer columns; the active projection/SQL rounds only at that legacy-table boundary, matching the existing schema contract. | Fractional raw/max, integer projection, schema type and report-boundary assertions passed in `tests/wp-04-structured-result-persistence.test.mjs` under run #39126698618. WP-12 end-to-end persistence/runtime verification remains required. No new rounding policy was introduced. |
| D-16 | **NOT IMPLICATED IN WP-10.** No evidence established a persisted-semantics mismatch. | No renaming or API/schema identity changes made. Revisit only if new scoped evidence establishes a real semantics mismatch. |

**WP-10 §40 scoped execution: COMPLETE.** Cross-stage D-04/D-06/D-12/D-17 obligations remain assigned to WP-12, and D-12's database-function/permission aspect remains assigned to WP-11. Do not start WP-11 or WP-12 automatically.

**Protected dispositions:** C-01, C-02 and C-03 remain closed under their recorded owner-approved dispositions. C-03 live E2E remains **WAIVED / NOT RUN**, not PASS. WP-09 remains closed. D-05/D-10/D-11 and other findings retain their existing assignments and must not be dropped or reclassified from this WP-10 evidence.

**Production boundary:** No Production database mutation, migration, deletion, Edge deployment, release-gate change, or security redesign was performed as part of this WP-10 execution.

## 8. Current WP-10 closeout reconciliation — 2026-10-19

This section resolves stale status/continuation text in Sections 3 and 6 against the verified WP-10 evidence addendum in Section 7 and the current handoff checkpoint. It does not change the original finding inventory or close cross-stage work.

- **WP-10 §40 scoped execution: COMPLETE** at verification head `aa752a54b548e45160dd73932a0b5216963be54d`; CI evidence is run [#39126698618](https://github.com/core-system-md/clinic-evaluator/actions/runs/39126698618), recorded SUCCESS in the handoff and Section 7. The latest main documentation head observed during this reconciliation is `cf34521c2a5ff65c9aed6dbfa9b08a012ec7abaa`.
- For the WP-10 scope only, Section 7 supersedes the earlier D-04, D-06, D-12, D-16 and D-17 status/action cells in Section 3. D-04 and D-06 have WP-10 implementation evidence; D-12's report-field/data-flow scope is verified but the finding remains open for WP-11 database-function/permission work and WP-12 layered verification; D-17 precision/persistence semantics are verified within WP-10 while WP-12 remains; D-16 was not implicated by persisted-semantics evidence.
- **No Production runtime E2E was run for WP-10.** This closeout does not establish release-wide closure or satisfy WP-12.
- **C-01, C-02, C-03 remain closed** under their recorded dispositions. C-03 live E2E is **WAIVED / NOT RUN**, not PASS. WP-09 remains closed.
- The original audit file `clinic-evaluator-full-audit-report-2026-10-11.md` remains NOT FOUND in the current main tree. D-10 and D-11 exact source wording/identity reconciliation remains OPEN; do not infer or rewrite the original finding text.
- No Production mutation, migration, deletion, Edge deployment, release-gate change, or security redesign was performed for WP-10.

**Exact continuation point:** WP-10 is closed for its §40 bounded scope. STOP. Do not start WP-11 or WP-12 without a new explicit owner instruction. Preserve every C-01–C-03 and D-04–D-19 entry and its remaining assigned gates as recorded above.


## Session evidence addendum — read-only schema investigation — 2026-10-19

This addendum records evidence obtained during the 2026-10-19 session. It does not replace or close any original finding and does not change the C-01/C-02/C-03 dispositions.

### Read-only live catalog evidence
The live `public` schema query returned 25 tables, RLS enabled on 25/25, 38 foreign keys (0 unvalidated), 71 RLS policies, 15 non-internal triggers, 87 public functions/procedures, 0 public views/materialized views, and 0 invalid indexes. These are structural counts only; they are not a security or functional pass. The catalog snapshot shows populated configuration/content and administrative tables as well as zero-estimate operational tables. Row counts are planner estimates and must not be used to infer that an empty/zero-estimate table is unused.

### D-05 clarification — baseline provenance is not table-use evidence
PR #120's current description reports that 18 of 25 live tables lack an initial `CREATE TABLE` in tracked migrations and that no authoritative initial schema DDL was found in its repository search. PR #120 is still OPEN/UNMERGED; do not represent its proposed reconciliation as merged into `main`. This session did not independently establish the exact 18 table names or finish tracing each table through all application, Edge Function, SQL function, trigger, policy, and migration references. Therefore:
- The “18 tables” claim remains a **baseline/migration-provenance gap**, not evidence of unused tables.
- No table has been identified as safe to delete or recreate.
- No Production baseline may be synthesized from live metadata.
- D-05 remains OPEN until exact table names, migration provenance, authoritative schema source (if any), and isolated replay acceptance evidence are reconciled.

### Session scope and next action
No repository code search results, app tests, effective-role tests, integrity/orphan checks, or E2E tests were completed in this session. No production writes or schema/security changes occurred. No WP was closed.

**Next authorized continuation:** under WP-11/D-05, create a reproducible 25-table worksheet and reconcile every live table to its schema objects, initial/altering migration sources, SQL function dependencies, repository/Edge callers, and observed data role. Independently test the 18-table claim; keep unknowns OPEN. Do not start WP-12 automatically and do not reopen C-01/C-02/C-03.


## 9. D-05 / WP-11 live schema worksheet checkpoint — 2026-10-19

The table-by-table working register is `D-05-LIVE-SCHEMA-RECONCILIATION-2026-10-19.md`. It captures live catalog details for all 25 `public` tables, including columns, constraints/relationships, indexes, RLS/policies, triggers, stored-function text matches, sampled source-file references, and indexed migration-file references. The document explicitly separates source-search hits from proof of DDL effect or reachable callers.

The exact 18 candidate names are corroborated by the table list in `supabase/migrations/20261001190000_p0_security_closure.sql`: `admin_users`, `answers`, `assessment_assets`, `assessment_settings`, `assessment_types`, `assessment_users`, `axes`, `experience_multipliers`, `historical_snapshots`, `insights_mapping`, `leads`, `options`, `questions`, `scores`, `sessions`, `specialty_profiles`, `team_capacity_factors`, and `traps`. The search located initial CREATE TABLE declarations for seven other live tables (`admin_audit_log`, `admin_capabilities`, `assessment_families`, `assessment_results`, `assessment_session_access`, `assessment_config_releases`, `assessment_config_release_settings`), so the 18/25 arithmetic is consistent. However, search-index absence is not final proof that an initial definition is absent from every tracked migration or external authoritative archive.

**Disposition remains OPEN / BLOCKING RECONCILIATION.** Next work is a full file-level scan of every tracked SQL migration, exact reconciliation against the live migration ledger, and expanded caller/dependency/permission review. No Production mutation, schema/grant/policy change, migration, deployment, deletion, or WP-12 work occurred in this checkpoint. Keep all unknowns open and do not advance to WP-12 automatically.


### Main versus PR #120 boundary

PR #120's current branch description says the applied migration IDs `20261018075528`, `20261018075855`, and `20261018100000` are reconciled to source on the branch, with source-only/unapplied `20261018110000` removed and a new `20261018120000_wp11_security_database_reconciliation.sql` proposed. PR #120 remains OPEN / READY FOR REVIEW / UNMERGED. Do not treat its migration fix or proposed security migration as part of `main`/Production; no merge or migration application was performed for this D-05 worksheet. The separate missing-initial-DDL baseline gap remains OPEN.


## 10. D-05 full migration scan — verified evidence, 2026-10-20

The working register D-05-LIVE-SCHEMA-RECONCILIATION-2026-10-19.md now includes full-content scans and source line categories for all 56 tracked migration files at the pinned main snapshot; a main tree comparison confirmed the migration paths/blobs did not change afterwards. It also records exact row counts for all 25 live public tables from a read-only query and the 9 SQL files outside the migration directory.

The file-level scan located seven initial public-table declarations in tracked migrations: assessment_families, assessment_session_access, assessment_results, admin_capabilities, admin_audit_log, assessment_config_releases, and assessment_config_release_settings. It found no initial CREATE TABLE declaration for the other 18 tables named in D-05; those names also appear in the P0 migration's existing-table privilege-revocation list. Test harnesses outside the migration directory define reduced schemas for testing and are not a production baseline. ADR-003 records the decision to review/create a baseline later rather than providing the baseline artifact. No authoritative schema dump was found in the inspected tracked repository tree; an external archive or backup has not been examined.

The read-only live migration ledger has 57 entries while main has 56 SQL migration files: 55 version/name matches; applied identities missing source paths on main are 20261018075528 / c03_service_role_api_key_compatibility and 20261018075855 / c03_verifier_api_key_compatibility; the source-only main file is 20261018110000_c03_verifier_api_key_compatibility.sql. No other version/name mismatch was found. PR #120 currently contains source files for all 57 ledger identities plus the new candidate 20261018120000, but remains OPEN / READY FOR REVIEW / UNMERGED; this branch state is not part of main or Production. The migration list exposes version/name, not original executed SQL bytes, so exact executed-source equivalence remains unproven.

**Status:** D-05 remains OPEN / BLOCKING RECONCILIATION; WP-11 is IN PROGRESS / NOT CLOSED; WP-12 has NOT STARTED. Next action is authoritative-source discovery and the remaining dependency/permissions/integrity review, with no baseline inferred from production metadata and no automatic stage advance.


## 11. D-05 wrapper-aware callers and current effective privilege checks — 2026-10-20

The latest worksheet records four wrapper-aware scan batches covering 40 browser/admin/Edge/Pages/release/cleanup source files. It recognizes the custom `supabase.select/request` wrappers, direct `.from()/.rpc()` calls, REST URLs, and line breaks across calls. Direct table use is mapped to exact source lines. Absence of a literal direct query in these 40 files is not evidence of disuse or safe deletion. The dynamic completion path in `assessment-access/index.ts` selects between `complete_p4_assessment_from_result` and `complete_p4_public_assessment_from_result` based on `access.assessment_user_id` and calls the selected RPC at line 1032.

Fresh read-only effective privilege queries on Production show `authenticated` has direct `MAINTAIN`, `REFERENCES`, `TRIGGER`, and `TRUNCATE` on `admin_audit_log` and `admin_capabilities` in addition to SELECT, while `anon` lacks direct SELECT/INSERT/UPDATE/DELETE for those tables. The live `is_owner(uuid)` and `is_active_admin(uuid)` security-definer overloads still have EXECUTE granted to `authenticated`; their zero-argument equivalents are also callable by authenticated and are used by current policies. These are evidence for D-08/D-15, not permission changes. PR #120's candidate for this bounded concern remains OPEN / READY FOR REVIEW / UNMERGED; no grants, functions or policies were modified by the current scan.

The table-by-table source provenance, SQL line scans, code callers, current row counts, and open questions are recorded in `D-05-LIVE-SCHEMA-RECONCILIATION-2026-10-19.md`. D-05 and WP-11 remain OPEN/IN PROGRESS. WP-12 is not started.


## 12. D-05 full direct privilege/function EXECUTE summary — 2026-10-20

A full direct table privilege matrix for all 25 `public` tables was recorded in the D-05 worksheet. `anon` has none of the eight queried direct table privileges on any of them. `authenticated` has direct SELECT on the documented subset and additionally has MAINTAIN, REFERENCES, TRIGGER, TRUNCATE on `admin_audit_log` and `admin_capabilities`. The current RLS catalog still has RLS enabled on 25/25; this is not a substitute for addressing elevated direct table privileges. No grant was changed.

A read-only public function grant query counted 87 functions/procedures, 65 SECURITY DEFINER, 2 anon EXECUTE (both non-SECURITY-DEFINER trigger functions `p2_assert_draft_version()` and `p2_assessment_type_immutability()`), 53 authenticated EXECUTE, 51 authenticated-executable SECURITY DEFINER. The four `is_owner`/`is_active_admin` overloads have no anon EXECUTE; authenticated EXECUTE remains on the zero-argument helpers and the UUID overloads. These are observations; function behavior, the direct EXECUTE on trigger functions, complete caller graphs, and effective-role RLS still need review. No changes were applied and WP-12 was not started.


## 13. D-05 integrity check result — 2026-10-20

The worksheet records an exhaustive read-only orphan query generated from all 38 public-source FK catalog entries: all 38 constraints are validated and all 38 checked constraints returned zero orphan rows for fully populated FK columns. Eight targeted semantic cross-table checks also returned zero violations (family current version/release pointers, release family/version identity, question-axis assessment version, session-release pin, access-session type, and answer/score session lead matching when both non-null). These bounded check results do not replace full RLS behavior tests or all semantic invariants. No data or schema changes were made. D-05 and WP-11 remain open; WP-12 remains not started.


## 14. D-05 SECURITY DEFINER inventory — 2026-10-20

A read-only aggregate over the 87 public functions/procedures found 65 SECURITY DEFINER functions; 14 have `search_path=""`, 51 have `search_path=public, pg_temp`, none lack a function-level search_path setting and none have other search_path settings. No SECURITY DEFINER function is directly EXECUTE-callable by `anon`; 51 are EXECUTE-callable by `authenticated`. This is catalog evidence, not a full body-level security assessment: explicit schema qualification, authorization gates, dynamic SQL, ownership and reachable callers remain to be checked. Two non-SECURITY-DEFINER trigger functions still report `anon` EXECUTE. No function or grant was changed; WP-12 remains not started.


## D-05 / WP-11 checkpoint — full tracked migration inventory and live ledger — 2026-10-20

Evidence artifact: `documentation/governance/D-05-MIGRATION-SOURCE-LEDGER-RECONCILIATION-2026-10-20.md` (commit `1378689e0eccbe191e65dad77ba8c5048e7db92c`). At inspected main tree SHA `312c60907649aa62de605937a0a82cf5d3fe3b75`, 56 tracked SQL migration files were compared with 57 live Supabase migration ledger rows. Applied IDs `20261018075528` and `20261018075855` have no same-version source files on main; `20261018110000_c03_verifier_api_key_compatibility.sql` is source-only/unapplied. This discrepancy is preserved as OPEN; no migration history or production state was changed.

Initial CREATE TABLE declarations were located for seven live tables: `admin_audit_log`, `admin_capabilities`, `assessment_families`, `assessment_results`, `assessment_session_access`, `assessment_config_releases`, and `assessment_config_release_settings`. The other 18 candidate names match the P0 privilege-revocation list. The full 56-file tracked migration scan confirms no initial persistent CREATE TABLE for those tables on main; whether an authoritative external/original schema archive exists remains OPEN. The large file `20261009170228_reconstruct_final_assessment_versions.sql` was fully inspected: 97,267 Unicode characters encode to 130,416 UTF-8 bytes, matching the Git tree size; it contains trigger toggles and two temporary tables but no persistent CREATE TABLE for the 25 live tables.

**Disposition:** D-05 OPEN / BLOCKING RECONCILIATION; WP-11 IN PROGRESS / NOT CLOSED; WP-12 NOT STARTED. The large migration file is now fully verified by UTF-8 byte count and its full contents inspected. Next: validate any authoritative external/historical schema source, finish line-level object evolution and applied-ledger reconciliation, and continue function-body/dynamic dependency/effective-role review. No production mutation, migration application, deletion/recreation, speculative baseline, PR merge, or WP-12 work occurred.


### D-05 source-body comparison with PR #120 — 2026-10-20

At open PR #120 head `47c0a79dbee108149f9431ff4e86ac120c420f7a`, the candidate's `20261018075528` service-role migration SQL body is identical after normalization to main's `20261018100000` file. The candidate's `20261018075855` verifier SQL body matches main's source-only `20261018110000` body after comment/whitespace normalization (one explanatory comment differs). The live ledger records versions/names, not the applied historical SQL body, so exact applied-body provenance remains unproven. PR #120 remains unmerged; no history rewrite, migration application or production change occurred. Keep D-05 OPEN and do not start WP-12.


## D-05 line-referenced migration DDL index — 2026-10-20

New artifact: `documentation/governance/D-05-MIGRATION-DDL-STATEMENT-INDEX-2026-10-20.md` (commit `b1ffbdf73540e3c6da2e24c3b929ecfbb63c57f3`). All 56 tracked migration files at pinned tree `312c60907649aa62de605937a0a82cf5d3fe3b75` were retrieved, their UTF-8 byte sizes checked against Git blob sizes, and line-level table-owned DDL statements indexed with file SHA and line number. Current main has the same migration paths/blob SHAs. This completes the tracked-file DDL search, not the entire D-05 acceptance review: dynamic SQL, function body/authorization review, live object-by-object semantic reconciliation, external schema provenance, and exact historical applied SQL provenance remain OPEN. D-05 remains OPEN; WP-11 remains in progress; WP-12 not started.

## D-05 historical provenance addendum — 2026-10-20

The historical review at `documentation/governance/D-05-HISTORICAL-MIGRATION-PROVENANCE-REVIEW-2026-10-20.md` establishes that the original ADR-003 commit documented a pre-existing live schema with no tracked migration directory and zero remote migration records; the accepted ADR planned a reviewed baseline later. The five earliest tracked migration files are provenance markers rather than original SQL bodies. The October 1 duplicate/future-dated migration cleanup and October 10 migration-identity reconciliation inspected so far do not establish that initial DDL for the 18 legacy tables was deleted. The better-supported interpretation is that the legacy schema predated tracked migrations and no reviewed baseline artifact was located. Cause attribution remains OPEN because pre-2026-09-30 history and external/local archives have not been fully examined.

This narrows the next task to authoritative provenance search and the remaining semantic/security reconciliation. It does not close D-05 or WP-11. Do not recreate tables, generate a baseline from Production, rewrite or apply migration history, alter grants/policies/schema, merge PR #120, or start WP-12.


## 10. WP-11 D-05 residual RLS/effective-privilege evidence — 2026-10-21

This checkpoint adds verified live catalog evidence and leaves the gate open. Detailed SQL catalog outputs, source references, and limitations are recorded in `documentation/governance/D-05-LIVE-SCHEMA-RECONCILIATION-2026-10-19.md` under “Read-only residual WP-11 reconciliation — RLS semantics and remaining privilege gaps — 2026-10-21”.

- **New D-05 blocker:** seven live tables (`answers`, `assessment_types`, `axes`, `leads`, `options`, `questions`, `scores`) have permissive `TO public SELECT USING (true)` policies and direct SELECT for `authenticated`, while the separate `p0_admin_select_*` policies are not restrictive policies. PostgreSQL OR-combines applicable permissive policies, so these true policies bypass the intended admin row predicate for authenticated SELECT. The direct `anon` SELECT privilege check returned false on all seven; this finding is not evidence of anonymous direct table reads or a tested runtime data return.
- Applied `20261001190000_p0_security_closure` creates the intended `p0_admin_select_*` policies but does not drop the live broad policy names. Those exact legacy policy names were not located in the current 56-file DDL statement index; original policy provenance remains OPEN.
- The current PR #120 candidate migration does not remove the seven broad policies and its disposable harness does not reproduce them, so that harness cannot verify their effective composition against live Production. PR #120 stays OPEN / UNMERGED; this checkpoint does not authorize merge.
- The current SECURITY DEFINER summary is 65 functions, 0 anon EXECUTE, 51 authenticated EXECUTE, 14 empty function-level search paths, and 51 `public, pg_temp`. All 25 public base tables are owned by `postgres`, with RLS enabled and FORCE RLS false; postgres/service_role have BYPASSRLS. Two non-SECURITY-DEFINER trigger-returning functions have anon EXECUTE ACLs; standalone RPC reachability was not tested. UUID overloads `is_owner(uuid)` and `is_active_admin(uuid)` remain executable by authenticated and support the existing D-15 concern. Static screening is not a full dependency/runtime review.
- `documentation/project-audit/03-p0-auth-data-rpc-decision.md` retains the owner decision gate for trust-boundary architecture; no RLS/grant/function fix was authorized or applied. The 18-table initial-DDL provenance gap, external archive gap, and current-main/live migration identity mismatches also remain open. No tests, Production writes, schema/grant/policy changes, migration application, deployment, PR merge, baseline synthesis, deletion/recreation, or migration-history rewrite were performed.

**Disposition unchanged:** D-05 **OPEN / BLOCKING RECONCILIATION**; WP-11 **IN PROGRESS / NOT CLOSED**; WP-12 **NOT STARTED**. C-01/C-02/C-03 remain closed. The next work stays within WP-11: obtain the owner's trust-boundary decision before any policy remediation, seek authoritative original schema provenance, and reconcile source/ledger identities without rewriting applied history or merging PR #120. Do not start WP-12.


## Follow-up — owner-selected Option C / updated D-05 candidate — 2026-10-21

The owner selected Option C (Hybrid); the decision-selection gate is recorded in `documentation/project-audit/03-p0-auth-data-rpc-decision.md`. The WP-11 candidate branch now drops the nine broad permissive policies identified by live catalog inspection and extends the disposable harness to reproduce and assert removal of them. Static assertions were added to `tests/wp-11-security-reconciliation.test.js`.

Candidate head: `4cbebd0982428987f911a2d6f84b6b5ca400039c`; PR #120 remains OPEN / UNMERGED. The commit-status query had no check statuses at the time of this update, so new candidate verification remains pending. No Production changes were performed. The candidate leaves existing authenticated admin policies and grants intact; full Option C alignment for sensitive result access is not established by this bounded policy change alone.

D-05 remains OPEN / BLOCKING RECONCILIATION; WP-11 remains IN PROGRESS; WP-12 NOT STARTED. C-01/C-02/C-03 remain closed. Historical schema provenance and current-main/live migration identity reconciliation remain open.


### Candidate-head correction — 2026-10-21

The current PR #120 head is `c293d6894bb10021c5795a23abe100666f10df18`. Its migration, disposable harness, and static contract test are present, but GitHub reported no associated PR workflow runs or commit status entries; CI is **unverified**. PR #120 remains OPEN / UNMERGED and D-05 remains OPEN.


### Final checkpoint — 2026-10-21

PR #120 current head: `82548fabe56e49abc2ce147732f7306286175c40`. Candidate files are present; GitHub returned no associated PR workflow runs or commit statuses, so CI is unverified. The live `sessions_public_select` policy has `USING (true)`, but neither `anon` nor `authenticated` has direct SELECT on `sessions`; it remains a latent cleanup item outside this candidate's modeled fixture. D-05 remains open; WP-11 remains in progress; WP-12 is not started.


## D-05 / WP-11 status update — effective-role evidence, 2026-10-23

The D-05 worksheet records a fresh read-only Production role check and full 25-table privilege matrix (worksheet update commits `5e0e77f8d7c75564bcd938f1253a07fe9601aba5` and `4e0ddc35c3890ff9265848384a92992f80af1cb3`; operational deployment correction is recorded later in the worksheet). All 25 public tables have RLS enabled and are owned by postgres; none has FORCE RLS. `anon` has no direct SELECT privilege on the 25 tables; `authenticated` has SELECT on 12, including the seven previously identified broad permissive-policy paths. A read-only `SET LOCAL ROLE authenticated` query confirmed SELECT path visibility on `axes` (22), `questions` (93), `options` (370), and `assessment_types` (5); `answers`, `leads`, and `scores` returned zero rows. This is database-role evidence, not an HTTP/API end-to-end test.

PR #120 remains OPEN / UNMERGED at `82548fabe56e49abc2ce147732f7306286175c40`; no current-head workflow runs or commit statuses were returned. Main still has 56 migration files against 57 live migration ledger entries, with source identity discrepancies `20261018075528`, `20261018075855`, and source-only `20261018110000`. The initial CREATE TABLE definitions for 18 live public tables remain absent from tracked migrations, and no authoritative external schema archive was located in the available repository/Library search. No baseline was synthesized from Production metadata.

**Disposition unchanged:** D-05 OPEN / BLOCKING RECONCILIATION; WP-11 IN PROGRESS; WP-12 NOT STARTED. C-01/C-02/C-03 remain closed. No database permissions/policies/schema were changed, no migration was applied, and PR #120 was not merged. The required `[CF-Pages-Skip]` prefix must be used for documentation-only commits.


## OWNER DECISION ADDENDUM — D-05 SCHEMA PROVENANCE NON-BLOCKING — 2026-10-24

Authority: owner instruction in the 2026-10-24 continuation; full decision: `documentation/governance/D-05-OWNER-DECISION-NONBLOCKING-SCHEMA-PROVENANCE-2026-10-24.md`.

- The missing original DDL/backup for 18 of 25 live public tables is accepted as a **non-blocking historical-provenance limitation**. It must not be re-raised as a prerequisite for unrelated current/future work, and the same unavailable artifact must not be requested again.
- No historical baseline may be synthesized from Production; no table deletion/recreation or applied migration-history rewrite is permitted.
- The current live-schema worksheet is observational, not proof of original schema intent or full empty-database replay. Revisit provenance only if a new authoritative source appears, a concrete regression/defect is evidenced, or a separately scoped requirement explicitly needs replay.
- D-05 itself remains OPEN for its separate technical gates: source/ledger reconciliation in PR #120 is not merged or current-head CI-verified; the documented broad authenticated SELECT policy paths and latent sessions policy remain to be dispositioned; delegated function authorization and targeted negative-access/API evidence remain incomplete.
- Current PR #120 head: `82548fabe56e49abc2ce147732f7306286175c40`; GitHub reports `mergeable=false`, no status checks or PR-triggered runs for that exact SHA, and no submitted reviews. Successful workflows tied to a different SHA do not satisfy the current-head gate.
- This decision does not authorize Production writes, schema/grant/policy changes, migration application/history rewrite, deployment, PR merge, or WP-12. Preserve C-01/C-02/C-03 CLOSED and WP-12 NOT STARTED.

**Acceptance rule:** the provenance limitation is not a blocking dependency; D-05 can close only after its remaining technical gates have evidence-backed dispositions. Do not close D-05 based on documentation alone.


## Latest D-05 / WP-11 checkpoint — 2026-10-24

- Historical provenance for 18 tables is now an **accepted non-blocking limitation** per `documentation/governance/D-05-OWNER-DECISION-NONBLOCKING-SCHEMA-PROVENANCE-2026-10-24.md`. Do not repeat the unavailable-source search or use it as a blocker for unrelated future work.
- PR #120 was reconciled onto current `main` with a conflict-free merge commit; current head `29ba1c6e33b12503f43f2f9c765c3c16a04b18a7`, base `92146ff4ef792112fe3a6113b41996f23722c86d`, `mergeable=true`.
- Current read-only source/ledger comparison: 57 unique live applied IDs; 58 migration SQL files in candidate; zero live IDs missing source; one source-only file, the proposed unapplied WP-11 migration `20261018120000_wp11_security_database_reconciliation.sql`. No applied migration ledger rows were changed.
- Current-head CI passed: WP-11 #40082964599, C-03 #40082964353, and P3/full suite #40082964346.
- PR #120 remains open/unmerged and independent review is absent. CI evidence is isolated/disposable, not Production acceptance. No Production migration, grants/policy change, deployment, or live ledger mutation was performed. WP-12 remains NOT STARTED; C-01/C-02/C-03 remain CLOSED.
- **D-05 status:** OPEN pending PR review/merge and authorized live verification of the proposed policy/function changes. The missing historical schema source is no longer a blocking dependency.

