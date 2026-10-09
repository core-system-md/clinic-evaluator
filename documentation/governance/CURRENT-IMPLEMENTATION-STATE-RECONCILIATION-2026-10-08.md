# Current Implementation State Reconciliation
## 2026-10-08

**Project:** `core-system-md/clinic-evaluator`  
**Supabase:** `oaqpzaarppccbnepffxx`  
**Purpose:** Maintain the authoritative implementation ledger after forensic verification of WP-05 through WP-08 and explicitly separate merged implementation from production rollout.

## 1. Authoritative correction

The earlier session handoff statement that WP-05 had not been proven contractually closed is **superseded**.

Forensic verification of GitHub shows:

- WP-05 final branch: `wp-05-report-interpretation-2026-10-08`
- PR: **#59**
- PR state: **closed / merged**
- Base SHA: `e4d582bb51b74fe9e4dbf5251504deed4a558505`
- Head SHA: `c38ad6ee6ed220ccc7a66334470d47df7ebfb7e3`
- Merge commit: `ee357a4e23d0c006783da9cdf236da3491c77c97`
- Dedicated workflow: **37742137612 — SUCCESS**
- Dedicated WP-05 tests: **PASS**
- Governance document: present on `main`
- WP-05 stage decision: **PASS / STAGE CLOSED**

Therefore:

**WP-05 = COMPLETE / VERIFIED / DOCUMENTED / CLOSED / MERGED**

## 2. Important distinction: old WP-05 branch

An earlier branch/PR also exists:

`wp-05-report-interpretation-engine-2026-10-07` / PR #56.

That work is historical/Draft and is **not** the final WP-05 closure evidence.

The final authoritative WP-05 is PR #59.

## 3. Actual ordering of WP-05 → WP-06 → WP-07

The GitHub base/merge chain proves the following order:

1. WP-05 PR #59 merged at `ee357a4e23d0c006783da9cdf236da3491c77c97`.
2. WP-06 PR #60 was based on that exact WP-05 merge commit.
3. WP-06 merged as `219ba205194ccae6dcd2e828d7895f3dd77ce368`.
4. WP-07 PR #61 followed that closed-stage lineage and merged as `a075803e24a7c6ccda803d3ceb58fd603d793ccd`.

Consequently, there is **no GitHub evidence that WP-06 or WP-07 were started before WP-05 was closed**.

## 4. WP-08 reconciliation

A later forensic check established that the previous statement:

> **WP-08 = Not implemented**

was incorrect.

The authoritative WP-08 evidence is:

- Branch: `wp-08-v1-assessment-reconstruction-2026-10-08`
- PR: **#62**
- PR state: **closed / merged**
- Base SHA: `f793957e6a9ff42c3b7f60202f89786ababd3042`
- Head SHA: `afe347d339199359677195fc1cb4825a979b3c0c`
- Merge commit: `aa3f44e7a0268753ae12caa75ab3fb643f50ad2c`
- Dedicated workflow: **37748440553 — SUCCESS**
- Dedicated WP-08 tests: **PASS**
- Disposable PostgreSQL migration harness: **PASS**
- Governance record: `documentation/governance/WP-08-V1-ASSESSMENT-RECONSTRUCTION-2026-10-08.md`
- Stage decision: **PASS / STAGE CLOSED**
- Cross-stage status register: `documentation/governance/IMPLEMENTATION-STATUS-REGISTER-2026-10-08.md`

WP-08 therefore is:

**IMPLEMENTED / VERIFIED / DOCUMENTED / CLOSED / MERGED**

### 4.1 Production boundary — deliberately separate

WP-08 PR #62 explicitly excluded production mutation.

The WP-08 implementation contains and tests the migration:

`supabase/migrations/20261008120000_reconstruct_final_assessment_versions.sql`

but the migration was **not executed against Production Supabase**.

Production checks confirm that the WP-08 migration is not present in the production migration history.

Therefore these statements are simultaneously true and are **not contradictory**:

1. **WP-08 implementation is CLOSED/MERGED.**
2. **WP-08 production rollout has NOT been executed.**

The implementation-stage contract boundary was to prepare, test, verify, document, and merge the reconstruction without performing the production mutation.

## 5. Current stage ledger

| WP | Current status |
|---|---|
| WP-01 | Complete |
| WP-02 | Complete within scoped engine-establishment boundary |
| WP-03 | Complete; a duplicate architecture document still requires documentary reconciliation |
| WP-04 | Pass / Closed / Merged within persistence-authority scope |
| WP-05 | **POST-CLOSURE RECONCILIATION REQUIRED** — report-model completeness and history-provenance integration gaps |
| WP-06 | **POST-CLOSURE RECONCILIATION REQUIRED** — transport/privacy boundary is not enforced by the report-validation layer |
| WP-07 | **POST-CLOSURE RECONCILIATION REQUIRED** — semantic strings remain outside the linkage catalog |
| WP-08 | **Pass / Closed / Merged after corrective reconciliation — production rollout not executed** |
| WP-09 | Pass / Closed / Merged |
| WP-10–WP-12 | Not started as implementation stages |

## 6. Correct current transition point

The project is **not** at “WP-08 pre-implementation”, and it is also **not yet contract-clean for Production rollout**.

The WP-08 implementation has now been corrected and closed, but the post-closure forensic audit identified unresolved contract deviations in the report stages:

- WP-05 report-model completeness and normal-history provenance integration;
- WP-06 transport/privacy enforcement for Structured Result;
- WP-07 full semantic ownership/linkage coverage.

Therefore the current point is:

**POST-WP-08 CORRECTIVE RECONCILIATION GATE — NOT PRODUCTION-READY**

No Production rollout decision may be treated as cleared until these reconciliation items are separately corrected and verified.

Before any Production action, the following must be independently verified against the governing contract and current Production state:

- final V1 content identity and exact counts;
- family/version relationships and current published pointers;
- all session/result/access dependencies;
- historical-session preservation;
- routing target and public URL behavior;
- removal/deletion safety for superseded versions;
- RLS/grants/security-definer dependencies;
- current production migration state;
- rollback/recovery path;
- production smoke-test plan;
- explicit owner approval for the Production mutation.

## 7. Explicit stop condition

Until the corrective reconciliation gate is resolved:

- do not execute the WP-08 production migration;
- do not delete superseded production assessment versions;
- do not switch production routing;
- do not mutate production assessment content;
- do not start WP-10;
- do not treat WP-05, WP-06, or WP-07 as contract-clean merely because their historical dedicated workflows passed.

**WP-08 is corrected and closed. The next implementation work must address the earliest outstanding reconciliation item one WP at a time, then stop. Production remains blocked.**

## 8. Source of truth

For current implementation status, use, in this order:

1. GitHub PR/merge evidence;
2. stage-specific governance records;
3. `IMPLEMENTATION-STATUS-REGISTER-2026-10-08.md`;
4. this current-state reconciliation.

Historical handoffs remain historical records and must not override later repository evidence.

## 9. Reconciliation record

This revision supersedes the earlier statement in this file that WP-08 was “Not implemented”.

It does **not** authorize a Production migration or other Production mutation.

**No production database or Edge Function mutation is performed by this documentation correction.**


## 10. Post-closure forensic recalibration — 2026-10-08

The prior stage records remain historical evidence of their executed implementations and dedicated test runs. A later contract audit, however, found that several closure claims were broader than the actual implementation boundaries.

### WP-05 — reconciliation required

The current report model registry provides purpose, KPI allow-list, and an economic flag, but it does not independently encode all required assessment-family semantics listed in contract §15: measured constructs, axes/components, diagnostic meanings, permitted user-facing conclusions, and text/template catalog.

The normal history adapter also returns only score/axis/date fields, while the report trend compatibility contract requires family, version, engine, contract, and configuration provenance. The dedicated fixture test proves compatibility logic with synthetic provenance but does not prove that the production history path supplies it.

### WP-06 — reconciliation required

The report validation layer correctly rejects forbidden fields from the user projection, but the assessment-access completion response still carries the full persisted Structured Result to the browser. This is a transport-boundary violation of the user-content policy even though the projected report itself is sanitized.

### WP-07 — reconciliation required

The linkage catalog audits the live `report_texts.json` leaves, but semantic report/presentation strings remain hardcoded in `assets/js/app.js`. Those statements are therefore outside the declared semantic ownership catalog and require reconciliation with contract §16.

### WP-03 — documentary contradiction only

The architecture duplicate `documentation/architecture/FINAL-CHANGE-SET-IMPLEMENTATION-CONTRACT-2026-10-07.md` contains a conflicting 0–1 storage statement. The active governance contract and owner-approved Change Set require canonical 0–100 percentage-point storage. No independent WP-03 code defect has been established from this contradiction alone; the file should be reconciled before final closure.

### WP-08 — corrected and closed

PR #65 corrected the two proven WP-08 defects: final V1 Consistency mapping and Patient Journey canonical weight storage. The corrected dedicated workflow passed, and the correction was merged as:

`ebd375e883e9faeb8659fc5bef312f343f0aa504`

No Production mutation occurred.

### Corrective execution order

The next implementation work is **not authorized automatically**. When authorized, the earliest unresolved implementation-stage reconciliation should be handled independently, with dedicated verification and closure before moving onward.

**Current overall status: implementation is blocked from Production rollout until the unresolved reconciliation items are closed.**


## Final WP-08 reconciliation record — 2026-10-08

The post-closure V1 Consistency correction was followed by reconciliation of stale canonical/test expectations exposed by the corrected registry scope. PR #67 brought the architecture registry and P3/WP-03 contract tests into exact version-scoped parity and merged to main at be6214e4f8fb9382ccdf8150d34491a061887b97.

The dedicated WP-08 verification remained successful (37777401435), the P3 isolated kernel succeeded (113312306760), and the WP-03 configuration semantics contract succeeded (113312305582). The WP-03 disposable PostgreSQL contract also succeeded (113312305836). The full Node baseline remains red on existing P5 editor assertions unrelated to this reconciliation.

Production remains unchanged and the WP-08 migration remains unapplied in Production.

## 11. Final WP-05 / WP-06 / WP-07 reconciliation — 2026-10-08

The post-closure reconciliation workstream has now been completed for all three adjacent report stages.

Final reconciliation branch:

`reconciliation-wp05-report-interpretation-2026-10-08`

Final head:

`b3b67a11fe50f27f6acf3dfc9c8349a7d59ef7d3`

### WP-05

**PASS / STAGE CLOSED / VERIFIED / DOCUMENTED**

Dedicated workflow **37812228830 — SUCCESS**.

Resolved:
- complete family-specific report models;
- server-verified normal-history provenance compatibility;
- browser fail-closed trend boundary;
- explicit server binding of report family to concrete assessment type.

### WP-06

**PASS / STAGE CLOSED / VERIFIED / DOCUMENTED**

Dedicated workflow **37812228983 — SUCCESS**.

Resolved:
- raw Structured Result transport exposure;
- response-level technical provenance exposure;
- public report-source contract and validation boundary;
- assessment-family binding.

### WP-07

**PASS / STAGE CLOSED / VERIFIED / DOCUMENTED**

Dedicated workflow **37812228856 — SUCCESS**.

Resolved:
- report-semantic hardcoding in renderer;
- report narrative ownership outside family models;
- model-owned presentation semantics;
- complete linkage preservation for the 94 live text leaves.

### Integrated verification

- WP-05: **SUCCESS**
- WP-06: **SUCCESS**
- WP-07: **SUCCESS**
- P3 isolated kernel job **113431739662: SUCCESS**
- P4 protected completion job **113431739528: SUCCESS**
- Full Node baseline job **113431739621: FAILURE**, limited to the already documented unrelated P5 editor-workspace baseline assertions.

The aggregate P3-kernel workflow therefore carries a failed conclusion because the same aggregate run includes the failed Full Node baseline audit; the isolated P3 kernel and P4 protected-completion jobs themselves passed.

### Production boundary

Read-only production verification confirms this reconciliation introduced no production mutation:

- migration history remains at `20261005143243 / p5_public_options_projection_recovery`;
- no reconciliation migration was applied;
- production `assessment-access` remains Edge Function version **32**;
- no production Edge Function deployment was performed from this branch;
- no assessment content/version/routing mutation was performed.

**Overall reconciliation gate for WP-05/06/07: RESOLVED at implementation, verification, and documentation boundaries.**

Production rollout is still a separate authorization boundary. No WP-08 production migration, routing change, deletion, or content mutation is authorized by this record.


## 12. Functional naming and technical-ownership forensic investigation — 2026-10-08

This investigation was restarted from repository/runtime evidence after the owner reaffirmed the following engineering rule:

- technical files and behavior-defining components are named by responsibility/function, not by work-plan stage;
- stage labels remain permitted in documentation and deliberate traceability artifacts;
- existing responsibilities are repaired by modifying/extending their established owner;
- a new technical file requires an independently justified responsibility and explicit ownership boundary;
- no abandoned, disabled, dead, or duplicate implementation may be left as an unintended second owner;
- migration filenames are executable migration identities and must be reconciled against live history before any rename/delete action.

**Scope of this checkpoint:** forensic investigation only. No rename, deletion, migration mutation, Edge Function deployment, or production mutation was performed.

### 12.1 Classification of repository artifacts

**PROVEN — direct technical naming violations**

The current repository contains **12 stage-named runtime/config artifacts** under the assessment-access calculation boundary:

- `p3-scorer-v1.mts`
- `p3-aggregation-engine.mts`
- `p3-consistency-engine.mts`
- `p3-criticality-coverage-engine.mts`
- `p3-integrated-scorer-v1.mts`
- `p3-structured-result-v1.mts`
- `p3-result-persistence-v1.mts`
- `p3-economic-model-v1.mts`
- `p3-consistency-rule-registry-v2.json`
- `p3-consistency-pair-registry-v1.json`
- `p3-response-interpretation-registry-v1.json`
- `p3-response-interpretation-registry-v2.json`

These are not all separate authorities: the repository evidence shows that they are composed dependencies beneath the canonical `engine.ts`. The defect is their use of the work-plan stage as part of technical identity, not automatic proof that each is a competing engine.

**UNVERIFIED / reference-only candidate**

`p3-historical-reconciliation.mts` is stage-named but no active runtime import was found. Its current use is through dedicated test/documentation evidence. It must not be deleted or renamed until its complete dependency/usage boundary is verified.

**PROVEN — new executable migrations carry stage names**

The repository contains three current, unapplied migrations whose executable filenames use WP stage identities:

- `20261008090000_wp03_canonical_axis_weights.sql`
- `20261008100000_wp04_structured_result_authority.sql`
- `20261008120000_reconstruct_final_assessment_versions.sql`

Production migration history currently ends at `20261005143243 / p5_public_options_projection_recovery`; therefore these three files are not applied in Production. They are direct functional-naming violations and are technically safer rename candidates than already-applied migrations, but no rename was performed in this investigation.

**PROVEN — stage-named live database completion identities**

Live Supabase still contains stage-named completion functions:

- `complete_p4_assessment_session`
- `complete_p4_public_assessment_session`
- `complete_p3_assessment_session`
- `complete_p3_public_assessment_session`

The current repository `assessment-access/index.ts` completion path selects the `complete_p4_*_from_result` boundary after submission preparation. The older `complete_p3_*` functions remain present in the live database with `service_role`-only ACLs and are not shown as current repository call targets.

This proves a technical-identity/ownership problem at the database API layer, but it does **not** by itself authorize deletion or renaming. Complete dependency verification is still required.

**PROVEN — stage identity leaks into runtime result/schema contracts**

The runtime still uses identifiers such as:

- `P3_STRUCTURED_RESULT_V1`
- `P3_SCORER_V1`
- `P3_AGGREGATION_V1`
- `P3_RECURSIVE_REFERRAL_V1`
- `P3_BANDS_V1`
- `P3_REPORT_SOURCE_V1`

The most significant finding is that the P3 label is not limited to filenames: it crosses the Structured Result, report transport/projection, scoring provenance, and persistence/DB validation boundaries.

This is a deeper technical identity issue than filename style. Reconciliation would require a coordinated contract/code/test/DB plan rather than text replacement.

**PROVEN — legacy executable scorer remains an active CI dependency**

`supabase/functions/assessment-access/score-engine-legacy.ts` remains an executable scoring implementation. It is explicitly marked compatibility/reference-only, but `tests/server-scoring-parity.test.js` imports and executes it, and the P3 verification workflow includes that test.

Therefore the repository currently retains a second executable scoring implementation for parity/reference purposes. It is not the official runtime authority, but it is a concrete technical-debt surface and requires an explicit lifetime/disposition. The current user rule does not permit indefinite accumulation of such parallel executable implementations.

**PROVEN — migration filename/live-history divergence**

Production currently reports **27 P5 migration history rows**, while only **15 repository P5 migration files** were found by normalized stage-name matching. Multiple live migration versions use the same migration name with a repository filename carrying a different leading timestamp.

Additionally, repository filenames currently contain duplicate leading migration timestamps:

- `20261003233000_*` — two files;
- `20261004150000_*` — two files.

Historical commits already document migration filename/history reconciliation. This is a migration-provenance integrity issue, not a cosmetic naming issue, and must be handled separately from ordinary file renaming.

### 12.2 Artifacts that are NOT a naming problem

The following are intentionally permitted for traceability and do not constitute the same defect:

- governance/audit/handoff documentation named by WP/P stage;
- dedicated stage-specific tests;
- CI workflows;
- branch names, PR titles, commit messages, and tracking records.

Their stage labels serve auditability and do not by themselves create a runtime technical owner.

### 12.3 Current technical-debt priorities

**Highest priority:** eliminate ambiguity around executable ownership: canonical `engine.ts`, legacy scorer lifetime, and the stage-named live completion API surface.

**High priority:** reconcile stage-coded runtime/result identities such as `P3_STRUCTURED_RESULT_V1` and related model IDs without breaking stored-result compatibility or creating aliases that perpetuate duplicate ownership.

**High priority:** establish a migration-provenance map before any migration filename cleanup or new migration sequencing.

**Direct naming cleanup candidates:** the 12 current runtime/config artifacts and the three unapplied WP-named migration files, subject to ownership/dependency review.

### 12.4 Investigation conclusion

The confirmed problem is **not** “all files containing P/WP are wrong.” The actual boundary is:

**stage labels are valid traceability; stage labels are not valid runtime technical identities.**

The repository currently violates that boundary in runtime/config filenames, new unapplied migration filenames, live database completion identities, and several cross-layer result/model identifiers.

No implementation correction was authorized or performed by this checkpoint. The next engineering action, when authorized, must be one coordinated ownership-preserving reconciliation: inspect consumers and live dependencies, modify the existing owner where possible, rename only safe/unapplied artifacts, and disposition legacy duplicates without creating replacement parallel paths.

**Production state remains unchanged.**


### 12.5 Production/runtime deployment divergence discovered during the investigation

**PROVEN — Production does not currently run the repository canonical engine path**

Read-only retrieval of the live Supabase `assessment-access` Edge Function shows:

- live Edge Function version: **32**;
- deployed digest: `950467bed27b99961ea46177e654be2cacacf4f867ad884549de9d7dc0198edb`;
- live `index.ts` imports `./score-engine.ts`;
- live completion selection uses `complete_p4_assessment_session` / `complete_p4_public_assessment_session`;
- live function bundle still contains `score-engine.ts` and the stage-named `p3-*` calculation modules.

This is inconsistent with the current repository target, where `assessment-access/index.ts` imports `./engine.ts` and the canonical ownership contract states that `engine.ts` is the sole official calculation entrypoint.

The live database also contains no `complete_p4_*_from_result` functions in the inspected public function inventory, while the repository branch code calls those names. This confirms a repository-to-production deployment/API drift that must be resolved before any claim that the current repository ownership architecture is production-effective.

**Engineering consequence:** this is not a cosmetic filename issue. It is a release/ownership boundary issue. No production deployment or database aliasing should be used as a shortcut. The repository runtime owner, database completion boundary, deployed Edge Function bundle, and migration state must be reconciled as one controlled change.

**Production state:** no mutation was performed by this investigation.


### 12.6 Production artifact is also carrying superseded ownership/transport semantics

**PROVEN — live Edge Function v32 is not the current repository implementation**

The live `assessment-access` bundle contains `index.ts` importing `./score-engine.ts`, while the current repository canonical entrypoint is `engine.ts`.

The live bundle also contains:

- `score-engine.ts` with a `legacyProjection` compatibility-shaped return;
- `P3_INTEGRATED_SCORER_V1` as the engine identity inside the live calculation;
- `P3_SCORER_V1` as the reported scoring-engine version;
- `P3_AGGREGATION_V2` as the live scoring-contract version;
- stage-named `p3-*` implementation modules.

The live completion response also returns:

- `...computed.legacyProjection`;
- the full `structuredResult`;
- a technical `provenance` object.

This means the currently deployed runtime still reflects the superseded ownership/transport architecture that the current repository reconciliation was designed to correct.

**PROVEN — repository production-boundary code and live database API are not yet aligned**

Current repository code calls `complete_p4_assessment_from_result` / `complete_p4_public_assessment_from_result`, but the inspected live `public` function inventory contains no functions with those names. The live database instead contains the older `complete_p4_assessment_session` / `complete_p4_public_assessment_session` pair.

This is a deployment/migration synchronization gap. It must be resolved as one controlled release boundary; it must not be “fixed” by creating indefinite aliases or parallel completion paths merely to make the branch executable against production.

**Engineering consequence:** the naming/debt investigation has exposed a production-correctness boundary: repository ownership, deployed Edge Function source, database completion API, Structured Result transport policy, and migration state currently describe different generations of the system.

**No production mutation was made during this investigation.**
