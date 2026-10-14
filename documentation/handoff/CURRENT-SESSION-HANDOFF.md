# C-03 — Current Session Handoff (2026-10-14)

> **Current override:** This block supersedes contradictory status statements in the historical handoff text below. C-02 is closed and its exact-ID cleanup was verified. C-01 must not be reopened. The owner resolved the C-03 scope by confirming that Guardrails decision 11 is the hybrid Git/Supabase configuration model with explicit synchronization/release; P3 Architecture D11 is a separate numbering scheme.

## C-03 continuation update — 2026-10-14 (supersedes older C-03 status below)

- **Status:** implementation in progress; PR #96 remains Draft/open. No merge, Production migration/RPC, Edge deployment, or Pages deployment.
- **Branch:** `work/c03-publication-release-gate-20261014`. Latest code commit tested: `5242dc88d82263e434bbd19b25adf9c98088aa29`; latest documentation commit at this update: `532b482e6fbcaf0063ef5a4a1b8c199bebf592a5`. Re-check the remote branch head before resuming.
- **Deterministic generator:** `.github/scripts/c03-generate-release-payload.cjs`. It accepts a versioned assessment snapshot, selected interpretation registry, an explicitly supplied source commit SHA, and the runtime Edge reference; it emits exactly the argument object for `register_assessment_interpretation_release_secure`. It sorts the complete DB option manifest deterministically and fails if the selected runtime registry identities do not exactly equal the snapshot's option identities. The digest algorithm is cross-tested against `interpretation-release-provenance.mjs`.
- **Tests/fixtures:** `tests/c03-release-payload-generator.test.js`, `tests/fixtures/c03-release-snapshot.json`, and `tests/fixtures/c03-release-registry.json`. The disposable PostgreSQL harness now consumes the generator's emitted RPC arguments via a psql variable; the synthetic SHA/IDs in this path are test fixtures only, not release provenance.
- **CI evidence:** run [38528344318](https://github.com/core-system-md/clinic-evaluator/actions/runs/38528344318) passed the full Node suite, P3 kernel, generator unit test, and payload generation but its C-03 SQL step failed on the harness stub delimiter before migration execution. After correcting the delimiter and audit stub, run [38528447473](https://github.com/core-system-md/clinic-evaluator/actions/runs/38528447473) passed the C-03 generated-payload PostgreSQL harness, full Node suite, and P3 kernel. After the environment-specific UUID handling and published-version fail-closed guard, run [38529295166](https://github.com/core-system-md/clinic-evaluator/actions/runs/38529295166) passed the full Node suite, P3 kernel, C-03 generated-payload PostgreSQL harness, and P4 disposable PostgreSQL job.
- **Broader live-schema inspection (read-only):** Production has five assessment versions. Relevant live types include `questions.code varchar NOT NULL`, `options.option_index integer NOT NULL`, `options.option_value integer NOT NULL`, and `assessment_types.family_id uuid NOT NULL`. The live `public.write_admin_audit` declares eight arguments, but `p_success` and `p_failure_reason` have defaults, so the original six-argument call was already valid. The migration now passes `true, null` explicitly, and the disposable harness stub mirrors the full live signature. This is explicitness, not a discovered production-call failure; it does not prove full live-schema compatibility.
- **Additional read-only identity reconciliation:** compared all live Production option identities against the exact runtime-selected registry for each of the five current assessment families. Logical identities `(question_code, option_index, source_option_value)` match 100% across all five: 33/33 admin reception, 45/45 clinic performance, 152/152 comprehensive clinic, 44/44 medical team, 96/96 patient journey. Exact option UUIDs match for admin reception, clinic performance, and medical team; they differ for all 152 Comprehensive Clinic V2 entries and all 96 Patient Journey V2 entries. This confirms that registry UUIDs are environment-specific, while the logical mapping is complete. The generator and runtime attestation were updated so the registry is compared by logical identity while the registered UUID-bearing manifest is independently compared against the live DB option IDs. A new unit test deliberately uses different registry UUIDs and asserts both successful logical matching and rejection of an incorrect live DB UUID.
- **Remaining gates:** the bounded read-only schema review covered relevant live column types, uniqueness/foreign-key constraints, audit function defaults, and the publication/restore dependency on the shared validator; no additional incompatibility was found in those inspected dependencies. This is not a full migration run against a cloned Supabase schema. All five current Production assessment versions are `published`, and the RPC intentionally refuses registration for `published` versions. A real payload therefore requires an authorized draft/archived target and an actual Edge build whose source SHA/reference are known. Neither is currently available without additional owner-authorized release/deployment work. C-03 remains **NOT READY TO CLOSE**. C-03 is **NOT READY TO CLOSE** until these gates are evidenced.
- **Safety:** no Production writes or schema changes were made; no RPC was invoked against Production; no Edge/Pages deployment or PR merge occurred.

## Current execution point
- Repository: `core-system-md/clinic-evaluator`; Supabase project: `oaqpzaarppccbnepffxx`; production branch: `main`.
- Baseline `main`: `b8bc22dd68815d1fdb56fe9a76cd9f05c35f5a8d`.
- Working branch: `work/c03-publication-release-gate-20261014`.
- C-02: **CLOSED**. E2E run #38469121966 was cleaned by a bounded DELETE; post-cleanup checks returned zero for the exact synthetic identities and related records.
- C-01: **OUT OF SCOPE / DO NOT REOPEN**, per explicit owner instruction.
- C-03: **IMPLEMENTATION IN PROGRESS — repository-only, not production-applied**.
- Read-only inspection found that `publish_assessment_version_secure` and `restore_public_assessment_secure` call `validate_assessment_version_secure`, but that validator currently checks structural integrity only; it does not require a versioned interpretation release or complete option-identity manifest.
- Current C-03 change prepared on the working branch: migration adds an owner-only release-registration RPC and makes the shared publication validator require an exact manifest of all live option IDs, indices and source values, with registry digest, source commit SHA and Edge release reference recorded for traceability. A dedicated static contract test is added.
- This is a **prepared implementation**, not yet verified by running the test suite, not merged, not applied to Supabase, and not deployed to Cloudflare/Edge.
- No Production write, migration application, Edge deployment, or Pages deployment was performed as part of this C-03 implementation step.

## Release sequence intended by the change
1. Update the version-controlled interpretation registry/binding for the exact assessment family and version.
2. Run registry/option identity coverage tests against the target version.
3. Deploy the matching `assessment-access` Edge code and record the actual release reference.
4. As owner, register the release manifest for the draft version, including the Git commit SHA and registry SHA-256.
5. Run the database publication validator; publish only if the manifest still matches every live option identity.
6. Verify the published version can complete before declaring the release operationally closed.

## Remaining verification gates
- Run the new C-03 test plus relevant existing tests in a repository-capable runner.
- Review the migration for SQL syntax and compatibility with the live schema.
- Obtain explicit authorization before applying the migration or invoking the release-registration RPC in Production.
- After approval and application, verify direct publish and restore both reject absent/stale manifests and accept an exact complete manifest in a controlled test environment.
- Verify the Edge runtime's registry binding matches the release manifest and that the published assessment completes successfully.
- Do not merge to `main` until repository tests and migration review pass; a push to `main` triggers Cloudflare Pages auto-deployment.

---

# نقطة الاستئناف الحالية (آخر تحديث: 2026-10-14، المحادثة الحالية)

## 1. الموضع
- المرحلة: إغلاق C-02 ثم بوابة C-03 — الحالة: C-02 = CLOSED؛ C-03 = BLOCKED (scope conflict).
- آخر خطوة منجزة: تنظيف سجلات التشغيل الاصطناعية الخاصة بـ #38469121966 بعد مطابقة المعرفات والمصدر والبريد والنتائج والهاشات. DELETE أعاد السجلين المتوقعين؛ استعلامات ما بعد الحذف أثبتت صفراً لكل المعرفات والعدادات العامة للجداول الستة.
- الخطوة التالية بالضبط: حسم تعريف C-03 قبل التنفيذ. تعارض: برومبت المالك §7 = Git↔DB sync (D11) + منع crash عند إكمال تقييم منشور من الإدارة؛ handoff index = interpretation-binding/option-identity coverage؛ وثيقة P3 architecture تسمي D11 “Classification / grade semantics”. لا تبدأ C-01 ولا كود C-03 قبل إزالة التعارض.
- الميزانية الزمنية: حد C-02 ثلاثة ساعات وفق العقد؛ الزمن الفعلي الكامل غير متاح بدليل موثوق. C-03 لم يبدأ تنفيذياً.

## 2. حالة المستودع
- آخر commit على main قبل توثيق هذه المحادثة: 5e443a0183ef6fa9c126e384cdb08619eb412c61.
- تغييرات التوثيق قيد التجهيز على فرع تجميعي مؤقت بسبب عدم إتاحة tree SHA من واجهة GitHub؛ الهدف نقلها إلى main بعملية fast-forward واحدة والتحقق من SHA النهائي. لا توجد تغييرات تطبيقية.
- الاختبارات: لا اختبارات جديدة بعد التنظيف؛ لا حاجة لإعادة E2E. الدليل السابق: Actions #38469121966، artifact 11850662078.

## 3. حالة الإنتاج (آخر فحص حي: 2026-10-14؛ وقت الدقيقة غير متاح)
- الهجرات: 52، آخرها 20261013110000 / c02_allow_answer_value_70.
- Edge assessment-access: ACTIVE v37، SHA-256 bd73200ea55c8f3682c2af80a1ccb57dc3e227f43563cfe28ce2e226b2005c36.
- counts: leads/sessions/results = 0/0/0؛ answers/scores/access = 0/0/0؛ historical_snapshots للجلستين = 0.
- عملية الإنتاج: DELETE واحد محدود بالمعرفين الدقيقين للـleads مع source marker وsynthetic email suffix؛ cascades أزالت السجلات التابعة. موافقة المالك: «تابع التنظيف و اغلاق c02، و قم بعدها بالانتقال إلى c03 not c01».

## 4. جدول البنود
| المعرّف | الحالة | الدليل | ملاحظة |
|---|---|---|---|
| C-02 | CLOSED | #38469121966 + artifact 11850662078؛ exact-ID/hash checks all zero | لا تعِد تشغيل E2E |
| C-01 | OPEN | لم يُنفذ في هذه المحادثة | المالك وجّه صراحةً إلى C-03 لا C-01 |
| C-03 | BLOCKED | تعارض تعريف النطاق بين برومبت المالك، handoff index، وP3 architecture D11 | احسم التعريف قبل التنفيذ |

## 5. قرارات المالك الجديدة
- 2026-10-14: «تابع التنظيف و اغلاق c02، و قم بعدها بالانتقال إلى c03 not c01» — تم تنظيف C-02؛ التنفيذ في C-03 متوقف فقط بسبب تعارض نطاقه الموثق.

## 6. سؤال مفتوح
هل تعريف C-03 الملزم هو تعريف البرومبت الحالي §7 (Git↔DB sync + حماية إكمال تقييم منشور من crash) ويُعد تعريف handoff index القديم متجاوزاً؟ أم المقصود interpretation binding/option identity؟ يلزم تعريف واحد.

## 7. الانحرافات والمخاطر
- تعارض توثيقي في تعريف C-03؛ سُجل صراحة ولم يُحسم بصمت.
- انحراف توثيق: تحديثات الوثائق تُجمع على فرع مؤقت ثم fast-forward واحد إلى main بسبب عدم إتاحة tree SHA في الموصل. لا PR ولا تغييرات تطبيقية.

## 8. تحذيرات الاستئناف
- لا تبدأ C-01 خلافاً لتوجيه المالك الحالي.
- لا تبدأ تنفيذ C-03 قبل توحيد تعريف النطاق.
- لا E2E جديد، ولا هجرة، ولا Edge deployment، ولا Production write آخر دون موافقة مستقلة محددة.

## سجل المحادثات
| # | التاريخ | ما أُنجز | الحالة عند الإغلاق | commit |
|---|---|---|---|---|
| غير متاح | 2026-10-14 | تنظيف #38469121966؛ إثبات الصفر؛ إغلاق C-02؛ توثيق تعارض نطاق C-03 | C-02 CLOSED؛ C-03 BLOCKED | ينتظر التحقق من main |

## أمر الاستئناف
«المتابعة. اقرأ هذا الملف، تحقق من main والإنتاج قراءة فقط، ثم اعرض سؤال حسم نطاق C-03؛ لا تبدأ C-01 أو أي تنفيذ قبل إزالة التعارض.»

---

# CURRENT SESSION HANDOFF

**Date:** 2026-10-14 (local UTC+03:00; latest tool clock observed at 2026-10-14 00:32:56 local)  
**Repository:** `core-system-md/clinic-evaluator`  
**Supabase project:** `oaqpzaarppccbnepffxx`  
**Cloudflare Pages project:** `clinicevaluat`  
**Production branch:** `main`

## نقطة الاستئناف الحالية

- **المرحلة / البند / الحالة:** Audit finding **C-02 — value-70 acceptance and scoring**: scoring behavior **PRODUCTION VERIFIED** for both published final V1 assessment families; latest repeat-run cleanup **PENDING / NOT VERIFIED**. Do not conflate audit finding C-02 with work-package label C2.
- **آخر commit على main قبل توثيق الإغلاق:** `b2cf8b3f66ddf4e3da7ec34ab97ac8b45deb2cd4` — **مدفوع: نعم**؛ the GitHub `refs/heads/main` ref matched this SHA. The documentation-only closeout commit supersedes it; on resumption, verify the current remote ref before any work.
- **الخطوة التالية بالضبط:** after the owner explicitly confirms resumption, perform run-scoped cleanup for Production E2E run **#38469121966** only, using the exact two session IDs, two lead IDs and two access-token hashes in this handoff; then run read-only verification showing zero rows for those identifiers and no residual tagged rows. Do not execute this step before the owner confirms.
- **ينتظر قرار المالك:** confirmation to resume and authorize the narrowly scoped cleanup of the two synthetic datasets created by run #38469121966. No other product/architecture decision is required for this cleanup.
- **تحذير حالة:** the E2E assertions passed, but the runner's own artifact states `cleanup.status=PENDING_AGENT_SQL_CLEANUP` and `cleanup.verified=false`. Production currently contains 2 test leads, 2 sessions, 2 results, 61 answers, 11 scores and 2 access rows. Do not claim current zero-residue closure. No C-03 work, new E2E, deployment, migration or unrelated Production operation before explicit resumption.
- **ملف الاستئناف:** `documentation/handoff/CURRENT-SESSION-HANDOFF.md`

## 1. Latest verified reality

### Source control

- At the start of closeout, `GET /repos/core-system-md/clinic-evaluator/commits/main` and `GET /repos/core-system-md/clinic-evaluator/git/ref/heads/main` both returned `b2cf8b3f66ddf4e3da7ec34ab97ac8b45deb2cd4`; remote `main` was pushed/current.
- That commit changed only one comment line in `.github/workflows/c02-value70-live-e2e.yml`. Because the workflow is configured to trigger on pushes touching that file, the push triggered a Production-writing E2E. The run completed before this closeout request; it was not initiated during this documentation-only closeout.
- No application-code files were modified by this closeout. The repository connector does not expose a local working tree, so local filesystem untracked/dirty state cannot be asserted. All repository edits made in this closeout are the documentation files committed together in the closeout commit.
- Existing open PRs were read-only inventoried and left untouched: #85, #84, #82, #79, #56. Do not merge, close, or delete them as part of C-02 cleanup.

### Latest Production E2E

- Run: [#38469121966](https://github.com/core-system-md/clinic-evaluator/actions/runs/38469121966), event `push`, head SHA `b2cf8b3f66ddf4e3da7ec34ab97ac8b45deb2cd4`, conclusion **SUCCESS**.
- Exact command: `node .github/scripts/c02-value70-live-e2e.mjs`.
- Evidence artifact: [c02-value70-live-e2e-evidence, artifact 11850662078](https://github.com/core-system-md/clinic-evaluator/actions/runs/38469121966/artifacts/11850662078).
- Comprehensive Clinic final V1: 36 questions and 36 saved answers; all 36 use source option value 70; completion HTTP 200; interpretation version 2; overall score `69.99999999999999` (floating-point representation of 70).
- Patient Journey final V1: 25 questions and 25 saved answers; 21 available eligible value-70 anchors plus four valid non-trap answers where an eligible 70 anchor is not defined; completion HTTP 200; interpretation version 2; overall score `65.8`.
- **Important:** workflow success means the scoring assertions passed; it does not mean cleanup passed. The uploaded evidence says `PENDING_AGENT_SQL_CLEANUP` and `verified=false`.

### Latest read-only Production state

- Migration ledger: **52** rows; latest `20261013110000 / c02_allow_answer_value_70`.
- `assessment-access`: ACTIVE, version **37**; bundle SHA-256 `bd73200ea55c8f3682c2af80a1ccb57dc3e227f43563cfe28ce2e226b2005c36`. Version 37 was confirmed by Edge logs for the latest run.
- Counts: `leads=2`, `sessions=2`, `assessment_results=2`, `answers=61`, `scores=11`, `assessment_session_access=2`.
- The two current datasets correspond exactly to the latest test run:

| Family | Session ID | Result ID | Lead ID | Answers | Scores |
|---|---|---|---|---:|---:|
| Comprehensive Clinic | `37e39b82-0fc6-42ea-889f-b759d32f9dc6` | `05f1fe0f-a70e-48d3-ac8f-ab95f7c8828c` | `5673535d-d167-4c92-a29f-4c057907b63c` | 36 | 6 |
| Patient Journey | `eb0bc8cf-7f19-45dc-95f6-6dea2422d509` | `f943d24d-4b6b-4c78-82f7-f0fb6bdf0156` | `4663754d-4aed-4169-a247-98a2400fad65` | 25 | 5 |

Access token hashes emitted by the runner:
- Comprehensive Clinic: `96dcf286c531f4d04f9c35085ea590cd9c24c06a4d70ed886e5f139753a0a1e5`
- Patient Journey: `2c8cc5879026d60922cc5f8db3cd621efb78950dd22546933fa94eea2662882b`

The latest run created two completed sessions, two `PRODUCTION` results with interpretation version 2, 61 answer rows, 11 score rows and two access rows. The previous run #38387901746 was cleaned and verified at that time; this later run created a new dataset and invalidated the current global-zero assertion.

## 2. Implementation and verification status

| Item | Status | Evidence |
|---|---|---|
| Persistence compatibility accepts value 70 | PRODUCTION VERIFIED | Constraint allows `0,1,2,3,4,5,40,70,100`; latest live run saved value-70 answers |
| Interpretation V2 routing for both final V1 families | PRODUCTION VERIFIED | Latest run #38469121966; 36 Comprehensive Clinic 70 answers and 21 Patient Journey 70 anchors |
| Completion/result persistence | PRODUCTION VERIFIED | Both calls HTTP 200; both results persisted with `PRODUCTION` status and interpretation version 2 |
| Latest test cleanup | BLOCKED / PENDING | Artifact says `cleanup.verified=false`; exact records still present in Production |
| C-02 finding | FUNCTIONAL SCORING PRODUCTION VERIFIED; CLEAN-STATE CLOSURE PENDING | Latest-run cleanup remains open |
| C-01 | OPEN | Existing governance sequence |
| C-03 | NOT STARTED | Must not start before C-01 is resolved and owner authorizes continuation |

## 3. Exact next action after owner confirmation

1. Re-run a **read-only** query for the exact two session IDs, two lead IDs, two result IDs and two token hashes above.
2. Confirm the lead IDs match the exact synthetic emails and latest run evidence before any write. Do not infer or repair IDs from memory.
3. If the rows still match the latest runner-created synthetic dataset, delete only run #38469121966's access rows by the exact token hashes, result/score/answer/session rows by the exact session IDs, and synthetic leads by the verified lead IDs, in dependency-safe order.
4. Run read-only verification that each exact identifier has zero rows and that `sessions`, `answers`, `scores`, `assessment_results`, `leads`, and `assessment_session_access` have no residual rows from this run.
5. Only after evidence is recorded, reconcile the C-02 status register and execution log. Do not rerun E2E as part of cleanup.

**Do not perform steps 1–5 before the owner confirms resumption.** The present owner instruction is documentation-only closure.

## 4. Owner decisions and restrictions

The owner instruction received on 2026-10-14, quoted verbatim:

> **أغلق هذه الجلسة الآن.** المطلوب تحديث الوثائق وملفات الـHandoff في المستودع، وليس كتابة تقرير في المحادثة. لا تبدأ أي عمل جديد، ولا تنفّذ عملية إنتاج، ولا تنشر، ولا تنشئ ميزة أو إصلاحاً إضافياً أثناء الإغلاق.

Additional required boundaries from that instruction:
- Do not run production cleanup during this closeout.
- Do not deploy Edge or apply migrations.
- Do not create a new feature or fix.
- Update existing status register and existing C-02 execution record in place; do not delete historical evidence.
- Make one documentation commit and one push to `main`, then verify remote `main` matches the pushed commit.
- In the next conversation, run the startup protocol and announce the resume point; **do not begin work before owner confirmation**.

## 5. Files changed by this closeout and worktree limits

The exact handoff path did **not** exist on `main` when checked (GitHub contents endpoint returned 404). This single canonical handoff file is therefore being created at the owner's explicitly requested path; no older lines in that exact file existed to delete. Existing historical continuity remains in `documentation/governance/CURRENT-HANDOFF-INDEX-2026-10-12.md` and its linked records.

Documentation-only files in the closeout commit:
- `documentation/governance/IMPLEMENTATION-STATUS-REGISTER-2026-10-08.md` — append current evidence/status and supersede outdated global-zero claims.
- `documentation/governance/C-02-PRODUCTION-LIVE-E2E-CLOSURE-2026-10-13.md` — append latest run and cleanup-pending reconciliation.
- `documentation/governance/CURRENT-HANDOFF-INDEX-2026-10-12.md` — add a current-handoff pointer and latest run state; all previous lines retained.
- `documentation/handoff/CURRENT-SESSION-HANDOFF.md` — create the one canonical current-session handoff because the requested target was absent.

No application code, tests, workflow definitions, migrations, or deployment configuration are changed by this closeout. GitHub connector does not expose a local working tree; local untracked files cannot be inspected. No source-code changes are being committed.

Existing open PRs left untouched: #85, #84, #82, #79, #56.

## 6. Time accounting and risks

- Latest E2E workflow: about 81 seconds from GitHub run creation to completion; runner interval about 68.7 seconds.
- Maximum package budget documented in the existing handoff index: three hours.
- Full C-02 package start time and this closeout session's start time were not captured in accessible execution logs; full elapsed time versus budget is **UNVERIFIED** and must not be invented.
- Primary risk: the latest E2E dataset remains in Production until the owner confirms resumption and exact-ID cleanup is performed.
- Migration ledger records 52 rows and latest migration `20261013110000 / c02_allow_answer_value_70`; migration actor/time provenance remains unknown.
- No operation is currently running; latest Actions run completed.

## 7. سجل المحادثات

- **2026-10-14:** Owner ordered immediate session closure, documentation-only; prohibited new work, Production operations, deployments, migrations, features and fixes during closure. Read-only reconciliation found main `b2cf8b3f66ddf4e3da7ec34ab97ac8b45deb2cd4`, latest E2E run #38469121966 successful for scoring but with cleanup pending. The requested `CURRENT-SESSION-HANDOFF.md` did not exist on main, so it is created as the single canonical current handoff; no prior entries existed in that exact file. Historical state is preserved in the existing handoff index and C-02 closure report.

## 8. أمر الاستئناف

```text
المتابعة. استأنف من documentation/handoff/CURRENT-SESSION-HANDOFF.md ونفّذ بروتوكول البدء (القسم 1) كاملاً، وطابق الملف مع الواقع الحي، وأعلن نقطة الاستئناف، ولا تبدأ العمل قبل تأكيدي.
```


---

## Latest continuation update — C-03 engineering verification (2026-10-14)

This section supersedes the older closeout-only resume instruction and stale C-03 status statements elsewhere in this file. The owner subsequently explicitly authorized continued engineering verification of PR #96.

- Repository: `core-system-md/clinic-evaluator`
- PR: https://github.com/core-system-md/clinic-evaluator/pull/96 (still **DRAFT**, not merged)
- Branch: `work/c03-publication-release-gate-20261014`
- Tested source commit: `760f73a74c90bf3b63e0b88429749714c5eba799`
- CI run: https://github.com/core-system-md/clinic-evaluator/actions/runs/38477746577 — **SUCCESS**
- Full Node suite: **36 passed, 0 failed**.
- Disposable PostgreSQL 17 C-03 harness: **passed**. It applies the migration against an isolated fixture and checks rejection of an incomplete manifest, acceptance of a complete manifest, validator acceptance, and validator rejection after an option identity/value becomes stale.
- First harness runs exposed and then fixed two test-environment defects: the psql relative migration path and missing `anon`/`authenticated` roles. The latest run above includes those fixes.
- Read-only inspection of the live Supabase validator showed the pre-existing validation conditions match the baseline logic retained by the C-03 replacement; the live `options.option_value` type is `integer`, now matched by the disposable fixture. This was read-only and did not alter Production.\n- No production migration, release RPC, Edge deployment, Pages deployment, or merge occurred. Main remains unchanged by this work.

### Engineering boundary / next gate

The harness is intentionally a minimal fixture, not a full clone of the live Supabase schema. It verifies SQL parsing and the targeted release-gate behavior, but does not prove full live-schema compatibility.

**C-03 is not ready to close:** `registry_digest`, `source_commit_sha`, and `edge_release_ref` are accepted and stored, but the current implementation does not independently prove that the deployed Edge runtime's registry digest matches the registered manifest. Design and test that provenance linkage before considering the release/synchronization contract complete. Also review the validator replacement against the complete intended validation contract.

Keep PR #96 draft; do not merge, apply to Production, invoke the release RPC, or deploy without explicit authorization for that exact operation. C-01 remains out of scope.


Verification provenance note: the successful CI run above tested implementation commit `760f73a74c90bf3b63e0b88429749714c5eba799`. Subsequent commits in this PR update documentation only; no migration, test, workflow, or application source changed after that verified implementation commit.


Verification provenance — latest check (2026-10-14): CI run [#38477746577](https://github.com/core-system-md/clinic-evaluator/actions/runs/38477746577) succeeded on implementation commit `760f73a74c90bf3b63e0b88429749714c5eba799`, including the PostgreSQL 17 C-03 migration harness and the full Node test suite. A read-only inspection of Production confirmed the baseline validator conditions match the validation logic being replaced and `options.option_value` is `integer`; no Production write was performed. Subsequent commits in this PR update documentation only.


---

## C-03 runtime provenance gate — latest verified state (2026-10-14)

- PR #96 remains DRAFT: https://github.com/core-system-md/clinic-evaluator/pull/96. Implementation under test: `a5f5b24f0e8283c93891541ab411a022542f3139`.
- CI run [#38480654971](https://github.com/core-system-md/clinic-evaluator/actions/runs/38480654971): C-03 disposable PostgreSQL 17 harness **PASS**; full Node suite **47 passed / 0 failed**; changed Edge files passed Node syntax checks.
- Runtime digest is SHA-256 over stable serialization of the selected assessment's registry entries, using the same slug + interpretation-version selection as the engine binding. Runtime verification checks digest, exact option identity coverage, assessment/family/version identity, registered Edge release marker, and deployed source commit.
- New owner-only Edge action: `verify_interpretation_release`. It requires an owner JWT via `is_owner`, then uses the service-role client to record verification. The DB RPC is service-role-only; publication/restoration validation now requires successful attestation. Re-registering a release clears the previous attestation.
- `C03_SOURCE_COMMIT_SHA` must be set to the exact commit deployed to Edge. `edge_release_ref` must equal the code marker `assessment-access-c03-registry-attestation-v1`. The runtime rejects a missing/mismatched source SHA, digest, marker, or manifest.
- Validator parity was checked read-only against the current live `validate_assessment_version_secure(uuid)`: the original baseline conditions are preserved, with the release/attestation gate added.
- A full `deno check` attempt surfaced 30 pre-existing type errors across unrelated engine modules. To avoid expanding C-03 into unrelated repairs, the CI gate uses syntax checks plus the full Node suite and isolated SQL harness; this is not a claim that the full Edge dependency graph type-checks.
- Production boundary unchanged: live `assessment_interpretation_releases` table is absent; Edge `assessment-access` remains ACTIVE v37 with SHA-256 `bd73200ea55c8f3682c2af80a1ccb57dc3e227f43563cfe28ce2e226b2005c36`; `main` remains `b8bc22dd68815d1fdb56fe9a76cd9f05c35f5a8d`. No Production migration, release RPC, Edge/Pages deployment, or merge occurred.

**C-03 remains IN PROGRESS / NOT READY TO CLOSE.** The runtime attestation mechanism is implemented and isolated-tested, but it is not deployed or exercised against the live release table. The release-manifest generation/sync operation and full live-schema compatibility still require bounded verification. Next exact task: add/test a deterministic release-payload generator for the chosen registry + option identities, then validate its payload against the disposable PostgreSQL harness. Do not merge, migrate, register releases, or deploy without explicit authorization. C-01 remains out of scope.
