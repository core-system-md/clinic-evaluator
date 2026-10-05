# P5 RECOVERY — ADDENDUM TO FORENSIC AUDIT
## 2026-10-05 — REVISION AFTER PR #47

This document supersedes the option-projection portion of:
`documentation/audit/P5-RECOVERY-AUDIT-2026-10-05.md`

## 1. NEW VERIFIED ROOT CAUSE — PUBLIC OPTIONS

A critical new fact was established by PR #47:

`production assessment-access v20 returned exactly two options per question` while the protected database contained the complete option graph.

The frontend renderer was therefore **not** the primary cause of the two-option symptom.

PR #47 identifies the failure as a **server-side Data API projection/truncation boundary**.

The fix changed `assessment-access` from a direct `options` Data API collection read to:

`get_public_assessment_options_secure(assessment_type_id)`

The function aggregates the complete option graph into a single JSONB value and the browser-facing `assessment-access/get_content` contract remains unchanged.

## 2. WHY THIS MATTERS TO THE RECOVERY

The previous forensic conclusion that "no truncation was found in app.js, therefore the cause remained unknown" is now superseded.

The actual chain is:

`protected DB complete options
→ assessment-access v20 Data API projection
→ exactly 2 options/question
→ app.js receives incomplete q.options
→ browser correctly iterates the incomplete array`

This exactly matches the Owner's observation:
- DB contains more options;
- browser shows fewer;
- different assessments are affected according to their option cardinality.

## 3. PR #47

PR:
`#47 — fix(p5): restore complete public option projection`

Merge commit:
`c15e75be8a0501516c28c1c34bb459363d015ab6`

The PR records verification of:
- Patient Journey: 25 questions / 75 options.
- Clinic Performance: 9 / 45.
- Comprehensive Clinic: 36 / 108.
- Clinic Performance: 5 options per question.
- Comprehensive Clinic: 3 options per question.

No assessment content was edited.
No public table grant was expanded.

The new RPC is revoked from:
- public;
- anon;
- authenticated.

It is granted only to:
- service_role.

## 4. ROOT-CAUSE RESPONSIBILITY

This is a real P5 regression.

The public runtime had been known-good before the P5 chain, and the P5 implementation sequence subsequently changed the server-side option projection.

The recovery record must therefore treat the option projection change as a concrete P5 regression rather than a mysterious production/data inconsistency.

The next recovery work must identify exactly which earlier P5 change introduced the projection/truncation behavior and why that change was made, not merely retain PR #47 as the final implementation.

## 5. REQUIRED FOLLOW-UP

PR #47 is a corrective patch, not P5 closure.

The next conversation must compare:

`last-known-good P0–P4 public runtime
vs.
first P5 assessment-access option projection change
vs.
current v21 projection`

and determine:
- the first commit that introduced the two-option response;
- whether the change was intentional;
- whether it was authorized;
- whether a smaller restoration to the old known-good query is preferable to the new RPC;
- whether any other P5 changes caused analogous projection regressions.

## 6. CURRENT MAIN

The current main after recovery documentation and PR #47 is:

`244c541c37b27a3a73acc9925c0cf21e36cad22c`

The immediate code parent of the documentation-only recovery PR chain includes:
`c15e75be8a0501516c28c1c34bb459363d015ab6`

This means any new recovery investigation must start from the actual current `main`, while using `96a68e30b386a0d3de89af4cd74f620c827989fb` as the P0–P4 code reconstruction baseline.

## 7. GOVERNANCE REMAINS UNCHANGED

PR #47 does not authorize reopening P2/P3/P4 architecture.

Do not:
- reinterpret option data;
- change scoring semantics;
- add public privileges;
- alter lifecycle semantics;
- close P5 based only on PR #47.

Owner browser acceptance remains mandatory.
