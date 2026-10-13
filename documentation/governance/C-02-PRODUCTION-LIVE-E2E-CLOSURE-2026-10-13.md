# Audit Finding C-02 — Production Live E2E Closure

**Date:** 2026-10-13  
**Repository:** `core-system-md/clinic-evaluator`  
**Supabase project:** `oaqpzaarppccbnepffxx`  
**Finding:** C-02 — acceptance, interpretation, and scoring of answer value `70`  
**Status:** FUNCTIONAL SCORING = PRODUCTION VERIFIED for both affected published final V1 families; latest rerun cleanup is PENDING (run #38469121966). The earlier run's cleanup proof remains valid only for that earlier run.

> This closes audit finding C-02 only. It does not close C-01, does not start C-03, and does not mark work-package labels C0/C1/C2 closed by implication.

## Closure evidence

### 1. Production implementation

- Persistence constraint `answers_answer_value_compat_check` is present and allows `0, 1, 2, 3, 4, 5, 40, 70, 100`.
- `assessment-access` is ACTIVE at Edge Function version **37**.
- Deployment bundle SHA-256: `bd73200ea55c8f3682c2af80a1ccb57dc3e227f43563cfe28ce2e226b2005c36`.
- PR #91 ([completion family-context handoff](https://github.com/core-system-md/clinic-evaluator/pull/91), merge commit `5ef071a234e6f1c90f075eca6f12dc7daaa0e15b)) passes the pinned assessment-family slug to the completion report projection. This fixed a live HTTP 500 that occurred after the result had already been persisted. The persisted Structured Result schema was not changed and no migration was added.
- PR #93 ([Patient Journey semantic-only fallback](https://github.com/core-system-md/clinic-evaluator/pull/93), merge commit `4dfd91deeab3ba7b794195b3d3a33d322052df5c)) corrected the harness to answer required semantic-only questions with valid non-trap options while retaining the 21 explicit value-70 anchors.
- PR #90 removed the unavailable GitHub Actions service-role-secret dependency from the test runner and established the agent-coordinated SQL verification/cleanup gate.

### 2. Live Production execution

GitHub Actions [run #38387901746](https://github.com/core-system-md/clinic-evaluator/actions/runs/38387901746) completed **SUCCESS** on 2026-10-13. It invoked the deployed version 37 Edge Function and completed both public assessment flows. Evidence artifact: [`c02-value70-live-e2e-evidence`](https://github.com/core-system-md/clinic-evaluator/actions/runs/38387901746/artifacts/11807522611).

| Verified property | Comprehensive Clinic final V1 | Patient Journey final V1 |
|---|---:|---:|
| Published questions / saved answers | 36 / 36 | 25 / 25 |
| Saved answer value `70` | 36 | 21 |
| Persisted response lineage entries | 36 | 25 |
| Persisted lineage entries with source value `70` | 36 | 21 |
| Value-70 entries with non-empty semantic state key | 36 | 21 |
| Answer-to-result-lineage mismatches | 0 | 0 |
| Result schema | `P3_STRUCTURED_RESULT_V1` | `P3_STRUCTURED_RESULT_V1` |
| Persisted interpretation version | 2 | 2 |
| Result status | `PRODUCTION` | `PRODUCTION` |
| Completion API | HTTP 200 | HTTP 200 |
| Numeric overall score | 69.99999999999999 (floating-point representation of 70) | 65.8 |

**Comprehensive Clinic scoring evidence:** all six axes scored 70; the `COMPREHENSIVE_CLINIC_V2` component's `P/M` layer scored 70 with full coverage (36/36 interpretable answers). The overall score was 69.99999999999999 due to floating-point arithmetic, within the expected tolerance for 70.

**Patient Journey scoring evidence:** the 21 available eligible value-70 anchors were all accepted and persisted with V2 response lineage. The four other required questions were answered using valid registry options, including semantic-only options with a null numeric anchor. The resulting score was 65.8, as expected for a mixed answer set; axes were A1=64, A2=70, A3=58, A4=70, A5=70.

The post-run database verification confirmed for both sessions:
- every saved answer has a corresponding result-lineage response with matching question code, option index, and source option value;
- the response array count equals the number of saved answers;
- every source-value-70 response has a non-empty `semanticStateKey`;
- every result is `P3_STRUCTURED_RESULT_V1`, status `PRODUCTION`, interpretation version 2, and has a numeric overall score.

The V2 registry used by the runner contains 36 eligible value-70 anchors for Comprehensive Clinic and 21 for Patient Journey. The published product version remains V1; interpretation version 2 is intentionally pinned by the production engine.

### 3. Test-owned records and cleanup

The run created exactly two tagged synthetic sessions, then the connected Supabase SQL operator verified persisted scoring before deleting only the records belonging to this run.

| Assessment | Session ID | Result ID | Lead ID |
|---|---|---|---|
| Comprehensive Clinic | `e8dc1f3e-1ea7-457b-b114-c5d5434fc9dd` | `5eb177c8-3b19-4d0d-839f-2b4b897d6619` | `fbc9f15e-b770-4176-aa4b-d161d79cf179` |
| Patient Journey | `a2b1011a-fbb2-4d51-a916-b17b97a9ffd1` | `1a7020d9-1695-4f51-95cd-7750c690de1f` | `bd4b0304-d637-468d-aab2-1d6ab1d68453` |

Cleanup deleted:
- 2 access-token rows, selected by the exact SHA-256 hashes emitted by this run;
- 2 assessment results;
- 11 score rows;
- 61 answer rows;
- 2 sessions;
- 2 synthetic leads.

A read-only post-cleanup query returned **zero rows** for each of the six checked tables, both by exact run-specific identifiers and globally: `sessions`, `answers`, `scores`, `assessment_results`, `leads`, and `assessment_session_access`. No test records remain in these tables.

No Production migration, DDL change, or schema modification was executed during this live E2E or its cleanup.

### 4. CI and regression gates

- PR #93 CI [run #38387798824](https://github.com/core-system-md/clinic-evaluator/actions/runs/38387798824): **PASS** — P3 isolated kernel, full Node suite, P4 disposable PostgreSQL completion gate, and C-02 answer-save RPC on disposable PostgreSQL.
- PR #91 P3 verification [run #38387272419](https://github.com/core-system-md/clinic-evaluator/actions/runs/38387272419): **PASS** across all four jobs.
- PR #91 WP-05 report interpretation [run #38387272395](https://github.com/core-system-md/clinic-evaluator/actions/runs/38387272395): **PASS**.
- PR #91 WP-04 [run #38387272424](https://github.com/core-system-md/clinic-evaluator/actions/runs/38387272424), WP-02 [run #38387272439](https://github.com/core-system-md/clinic-evaluator/actions/runs/38387272439), and WP-09 [run #38387272495](https://github.com/core-system-md/clinic-evaluator/actions/runs/38387272495): **PASS**.
- **Unrelated CI note:** WP-03 configuration semantics [run #38387272452](https://github.com/core-system-md/clinic-evaluator/actions/runs/38387272452) reported a contract assertion expecting only `DIRECT_ANCHOR` where the current configuration returned `DIRECT_ANCHOR` and `SEMANTIC_ONLY`. No WP-03 implementation or test file was changed for C-02. This remains a separate configuration-contract issue and is not evidence against the passing C-02-specific Production E2E.

## Final gate status

| Gate | Final state |
|---|---|
| Compatibility constraint permits value 70 | VERIFIED |
| Both published final V1 families accept and persist value 70 | PRODUCTION VERIFIED |
| Interpretation registry V2 lineage | PRODUCTION VERIFIED |
| Component/layer, axis, and overall scoring persisted | PRODUCTION VERIFIED |
| Completion API returns success | PRODUCTION VERIFIED |
| Run-scoped cleanup and zero-residue checks | VERIFIED for run #38387901746; PENDING for latest run #38469121966 |
| Audit finding C-02 | **PRODUCTION VERIFIED for scoring behavior; latest-run cleanup pending before clean-state closure** |
| Audit finding C-01 | OPEN — separate next item in the established sequence |
| Audit finding C-03 | NOT STARTED — remains blocked until C-01 is resolved |

The earlier trigger/secret failure report remains a historically accurate record of the failed attempt at that time. The earlier clean closure was valid for run #38387901746 only; it does not establish cleanup for the later run #38469121966.


## Latest repeat-run reconciliation — 2026-10-14

This section supersedes any implication above that Production currently has zero test records. It does not invalidate the successful scoring evidence or the earlier run's cleanup evidence; it records that a later run created a new, separately scoped test dataset.

- Latest run: [#38469121966](https://github.com/core-system-md/clinic-evaluator/actions/runs/38469121966), event `push`, head commit `b2cf8b3f66ddf4e3da7ec34ab97ac8b45deb2cd4`, workflow result **SUCCESS**.
- Exact command: `node .github/scripts/c02-value70-live-e2e.mjs`.
- Artifact: [c02-value70-live-e2e-evidence, artifact 11850662078](https://github.com/core-system-md/clinic-evaluator/actions/runs/38469121966/artifacts/11850662078).
- Both flows passed the answer-save and completion checks. Comprehensive Clinic: 36/36 value-70 answers, interpretation V2, score `69.99999999999999`. Patient Journey: 25/25 answers, including 21 eligible value-70 answers, interpretation V2, score `65.8`.
- The artifact explicitly reports `cleanup.status=PENDING_AGENT_SQL_CLEANUP`, `cleanup.verified=false`. Cleanup is not complete for this run.

### Latest run-owned Production records (read-only verified)

| Family | Session ID | Result ID | Lead ID | Answer rows | Score rows |
|---|---|---|---|---:|---:|
| Comprehensive Clinic | `37e39b82-0fc6-42ea-889f-b759d32f9dc6` | `05f1fe0f-a70e-48d3-ac8f-ab95f7c8828c` | `5673535d-d167-4c92-a29f-4c057907b63c` | 36 | 6 |
| Patient Journey | `eb0bc8cf-7f19-45dc-95f6-6dea2422d509` | `f943d24d-4b6b-4c78-82f7-f0fb6bdf0156` | `4663754d-4aed-4169-a247-98a2400fad65` | 25 | 5 |

Access-token hashes:
- `96dcf286c531f4d04f9c35085ea590cd9c24c06a4d70ed886e5f139753a0a1e5`
- `2c8cc5879026d60922cc5f8db3cd621efb78950dd22546933fa94eea2662882b`

A read-only aggregate query after the run returned 52 migration-ledger rows, latest migration `20261013110000 / c02_allow_answer_value_70`, and current counts: leads=2, sessions=2, assessment_results=2, answers=61, scores=11, assessment_session_access=2. Those counts match the two record sets above; the prior global-zero claim was true after run #38387901746 but is no longer current.

Production `assessment-access` was observed serving version **37**, bundle SHA-256 `bd73200ea55c8f3682c2af80a1ccb57dc3e227f43563cfe28ce2e226b2005c36`. No migration, deployment, or Production write was performed during the 2026-10-14 documentation closeout.

**Current gate:** value-70 scoring behavior is **PRODUCTION VERIFIED**. Cleanup of run #38469121966 is **PENDING / NOT VERIFIED**, so current Production zero-residue/clean-state closure is **BLOCKED**. Do not execute cleanup, rerun E2E, deploy, migrate, or start C-03 during this session. After the owner authorizes resumption, clean only the identifiers above and prove zero residue.


## Latest cleanup closure — 2026-10-14

This section supersedes the previous cleanup-pending conclusion for run #38469121966.

- Owner authorization: explicit instruction to clean the run-owned synthetic records and close C-02.
- Pre-delete identity verification: exact two session IDs, two result IDs, two lead IDs, C-02 source marker, example.invalid emails, expected 36/25 answer counts, expected 6/5 score counts, and two runner-emitted token hashes were confirmed by read-only Production queries.
- Cleanup: deleted exactly the two lead rows using exact IDs plus the exact C-02 source marker and synthetic email suffix. Foreign-key cascades removed the associated sessions and dependent answers, scores, results, access rows, and historical snapshots.
- Delete output: exactly two expected lead IDs/emails returned.
- Post-cleanup verification: zero rows for exact lead IDs, session IDs, result IDs, session-linked answers/scores, token hashes, and session-linked historical snapshots.
- Global counts: leads=0, sessions=0, assessment_results=0, answers=0, scores=0, assessment_session_access=0.
- No repeat E2E, migration, DDL, Edge deployment, or manual Pages deployment occurred. Migration ledger remains 52 rows, latest 20261013110000 / c02_allow_answer_value_70; Edge remains ACTIVE v37 with SHA-256 bd73200ea55c8f3682c2af80a1ccb57dc3e227f43563cfe28ce2e226b2005c36.

C-02 FINAL STATUS: CLOSED — scoring is PRODUCTION VERIFIED and the latest run cleanup/zero-residue gate is VERIFIED.

## Owner-directed C-03 transition — 2026-10-14

Owner explicitly directs C-03 instead of C-01. Implementation is blocked by a scope contradiction: current owner prompt §7 defines C-03 as Git/database synchronization (D11) plus safe completion of published admin assessments; the existing handoff index defines C-03 as interpretation binding/option identity coverage; the P3 architecture document calls D11 “Classification / grade semantics”. No C-03 implementation or Production operation was started. Obtain one authoritative scope definition before coding or changing data.
