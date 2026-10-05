# P5 — FINAL RECOVERY HANDOFF
## 2026-10-05 — REVISION 2

**Authoritative handoff for the next conversation**

Repository:
`core-system-md/clinic-evaluator`

Supabase:
`oaqpzaarppccbnepffxx`

Current main:
`244c541c37b27a3a73acc9925c0cf21e36cad22c`

Latest production-option correction:
PR #47 / commit `c15e75be8a0501516c28c1c34bb459363d015ab6`

P0–P4 reconstruction baseline:
`96a68e30b386a0d3de89af4cd74f620c827989fb`

Formal P0–P4 closure record:
`e4c191e6995a9b98b5adb2ab64a79f8806d4c1b8`

P5:
**OPEN — RECOVERY / FORENSIC RECONCILIATION**

---

# 1. NON-NEGOTIABLE STARTING RULE

اعتبر أن **إنجازات P5 السابقة غير مقبولة حتى يعاد إثباتها**.

لا تبدأ بتصميم جديد.
لا تبدأ بتعديل المحتوى.
لا تبدأ بتغيير lifecycle.
لا تبدأ بإضافة privileges.

ابدأ بإعادة بناء آخر حالة صحيحة قبل P5 ثم trace كل regression.

---

# 2. KNOWN-GOOD BASELINE

P0–P4 كانت موثقة كـ CLOSED / INTEGRATED / PRODUCTION VERIFIED.

التوثيق السابق سجل:
- complete published assessment graphs;
- 93 questions / 305 options across the five families in P3 verification;
- public flow through completion/result;
- no historical result/session version mismatch;
- no mass replacement of published questions/options.

Owner confirms that question/option presentation was not the known original problem before P5.

---

# 3. MOST IMPORTANT NEW FACT

PR #47 أثبت السبب المباشر لمشكلة "تظهر خيارات أقل من المخزن":

**assessment-access v20 كان يعيد خيارين بالضبط لكل سؤال من production Data API projection.**

قاعدة البيانات نفسها كانت تحتوي الخيارات كاملة.

إذن:

**المشكلة كانت في server-side public projection، وليس في فقدان البيانات وليس في `app.js` renderer.**

PR #47 نقل retrieval إلى secure JSONB aggregation RPC، وأبقى public response contract دون تغيير.

هذا يجب أن يكون نقطة البداية الجديدة للتحقيق.

---

# 4. WHAT MUST STILL BE INVESTIGATED

PR #47 أصلح العرض، لكنه لا يجيب السؤال التاريخي بالكامل:

**ما التغيير السابق في P5 الذي أدخل projection/truncation؟**

يجب تحديد:
1. أول commit غيّر option retrieval في `assessment-access`.
2. مقارنة هذا commit مع P0–P4 baseline.
3. سبب التغيير.
4. هل كان مطلوباً ومصرحاً؟
5. هل هناك تغييرات أخرى في P5 سببت regressions مشابهة؟
6. هل الاستعادة الصحيحة هي الرجوع للسلوك السابق أو الإبقاء على secure aggregated projection؟

---

# 5. COMPLETE P5 CHANGE CHAIN

`#34 → #35 → #36 → #37 → #38 → #40 → #41 → #42 → #43 → #44 → #45 → #46 → #47`

يجب تدقيق كل commit يؤثر في:
- `assets/js/app.js`
- public HTML
- `supabase/functions/assessment-access`
- admin assessment manager/lifecycle/editor
- migrations
- workflows
- deployment configuration.

---

# 6. OWNER-REPORTED REGRESSIONS TO PRESERVE IN THE RECORD

Public:
- lead data did not reliably enter Questions.
- incomplete option sets were visible.
- behavior differed across assessments.

Admin:
- Stop Public failed before its later correction.
- Back navigation exited browser.
- Edit transiently reported inaccessible records.
- editor workflow was confusing.
- completed list was polluted by synthetic E2E names.

Governance:
- Owner reports unrequested decisions were made.
- P5 exceeded the intended contract in places.
- fixes were stacked on symptoms instead of returning to a known-good baseline.

---

# 7. PRODUCTION E2E INCIDENT

24 synthetic production leads were created by automatic live E2E.

They were removed with their dependent records.

Prevention:
- production live E2E no longer automatic;
- explicit `ALLOW_LIVE_E2E=true`;
- no live E2E during recovery without explicit approval/isolation.

---

# 8. FALSE CLAIM — MUST NOT PROPAGATE

The previous claim that `lluat.pages.dev` appeared in a screenshot supplied by Owner was false.

No evidence establishes that claim.

Do not use it as a deployment diagnosis.

---

# 9. FROZEN LIFECYCLE

Draft:
Edit / Publish / Delete Draft.

Published:
Edit approved editorial content / Create Working Copy / Stop Public.

Stopped Public:
still Published, but `is_active=false`.

Resume Public:
`is_active=true`.

Archive:
separate explicit operation.

Archived:
historical/read-only.

**Stop Public never means Archive.**

---

# 10. FROZEN SECURITY BOUNDARY

No:
- broad protected-table grants;
- browser-authoritative security;
- privilege expansion to bypass UI problems;
- direct protected-table mutation from browser.

Secure capability-checked RPCs remain authoritative.

---

# 11. FROZEN P0/P2/P3/P4 BOUNDARIES

Do not change:
- family/version architecture;
- stable public URL identity;
- session-to-version pinning;
- P3 scoring/interpretation;
- KPI/EV semantics;
- trap semantics;
- P4 submission/result provenance.

Any contradiction requires a documented evidence item and Owner decision.

---

# 12. REQUIRED FIRST WORK IN NEW CONVERSATION

**Step A — Baseline**

Inspect:
`96a68e30b386a0d3de89af4cd74f620c827989fb`

**Step B — First public projection regression**

Trace `assessment-access` history until the first change that made production return only two options/question.

**Step C — Compare**

Record exact:
- code diff;
- RPC/query diff;
- deployment;
- expected cardinality;
- actual cardinality.

**Step D — Broader sweep**

Search for other P5 changes that changed previously working behavior unnecessarily.

**Step E — Only after evidence**

Present:
- root cause;
- affected commits;
- authorized vs unauthorized changes;
- restoration/reversion options;
- safest minimal path.

Then wait for Owner approval before any new architectural implementation.

---

# 13. CLOSURE CONDITION

P5 is not closed.

Closure requires Owner browser acceptance of:
- lead → Questions;
- complete stored option rendering;
- answer progression;
- completion and result;
- correct Admin lifecycle;
- understandable persistence/error states;
- phone workflow;
- desktop workflow;
- preserved security boundaries.

---

## Authoritative recovery documents

`documentation/audit/P5-RECOVERY-AUDIT-2026-10-05.md`

`documentation/audit/P5-RECOVERY-AUDIT-UPDATE-2026-10-05.md`

`documentation/handoff/P5-RECOVERY-HANDOFF-2026-10-05-REV2.md`

Earlier operational handoff:
`documentation/handoff/P5-ADMIN-OPERATIONAL-HANDOFF-2026-10-04.md`

The REV2 handoff is the document to use for the next conversation.
