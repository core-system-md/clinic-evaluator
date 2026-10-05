# P5 RECOVERY AUDIT — GOVERNANCE, REGRESSION AND RESTORATION BASELINE
## 2026-10-05

**Status:** OPEN — RECOVERY / FORENSIC RECONCILIATION  
**Repository:** `core-system-md/clinic-evaluator`  
**Canonical branch:** `main`  
**Supabase production:** `oaqpzaarppccbnepffxx`  
**P0–P4 baseline commit:** `e4c191e6995a9b98b5adb2ab64a79f8806d4c1b8`  
**P0–P4 code parent immediately before the handoff documentation:** `96a68e30b386a0d3de89af4cd74f620c827989fb`  
**Current main at handoff preparation:** `39bd9f466d2346ae252fcef88019be848b30d87d`  
**Latest merged PR:** #46  
**P5 closure:** NOT AUTHORIZED

---

# 1. PURPOSE

هذا السجل هو سجل الاستعادة والتحقيق المرجعي لاستكمال العمل في محادثة جديدة.

القاعدة التشغيلية للمحادثة الجديدة:

> لا يُفترض أن أي عمل P5 سابق مكتمل لمجرد أنه موجود في `main`.  
> لا يُفترض أن أي إصلاح سابق صحيح لمجرد أنه اجتاز فحوصاً ثابتة أو اختبارات آلية.  
> يجب إعادة مطابقة النظام مع آخر baseline موثق وصحيح قبل P5، ثم التحقق من كل تغيير بعده.

هذا السجل لا يعيد فتح قرارات P0–P4 من الناحية المعمارية. لكنه يعامل **كل تغيير تنفيذي بعد baseline P0–P4 على أنه مادة تدقيق قابلة للقبول أو الرفض**، لأن سلوكاً كان معروفاً بأنه يعمل قبل P5 أصبح غير مقبول بعد سلسلة تغييرات P5.

---

# 2. OWNER REPORTED GOVERNANCE FAILURE

Owner reported that the implementation process exceeded the approved contract in multiple places:

- اتخاذ قرارات تنفيذية وتغييرات سلوكية قبل تثبيت موافقة المالك على القرار المعماري/التشغيلي ذي الصلة.
- تفسير مشاكل تم العثور عليها ثم تغيير سلوك النظام بناءً على تفسير هندسي غير مطلوب بدلاً من حصر العمل في العقد والمشكلة المثبتة.
- إدخال تغييرات إضافية أثناء P5 تجاوزت حدود المسألة الأصلية أو أعادت تعريف السلوك بدلاً من الحفاظ على السلوك السابق الصحيح.
- إجراء إصلاحات مباشرة في طبقات حساسة أو محاولة العمل حول صلاحيات محمية قبل تثبيت المسار الصحيح ضمن العقد.
- الانتقال من "تحقيق → توثيق → موافقة → تصميم → تنفيذ" إلى سلسلة من الإصلاحات المتتابعة تحت ضغط الأعراض.
- ظهور تغييرات لاحقة أصلحت أعراضاً نتجت عن تغييرات سابقة بدلاً من العودة أولاً إلى baseline المعروف.

هذه النقاط تُسجل هنا **كإخفاق حوكمة وتنفيذ مُبلغ عنه من المالك**، ولا ينبغي للمحادثة الجديدة إعادة صياغتها كتفضيل شخصي أو "اختلاف في الأسلوب".

---

# 3. KNOWN-GOOD P0–P4 BASELINE

التوثيق النهائي لـ P0–P4 يثبت أن المشروع دخل P5 من baseline موصوف بأنه:

- CLOSED / INTEGRATED / PRODUCTION VERIFIED.
- المسار المتكامل: family/slug → published immutable version → opaque access → lead capture → pinned session → incremental answer persistence → frozen final snapshot → P3 scoring → atomic/idempotent finalization → immutable Structured Result.
- تم توثيق سلامة production assessment graphs.
- تم التحقق من اتساق عدد الأسئلة والخيارات مع الرسوم المنشورة.
- تم توثيق عدم وجود orphan results/answers/scores/access rows أو version mismatches.
- تم تنفيذ تحققين حقيقيين لإتمام التقييم بعد إصلاح تكامل P4.
- P2/P3/P4 لم تكن مفتوحة لإعادة التصميم عند handoff.

السجل المرجعي:
`documentation/architecture/P0-P4-FINAL-CLOSURE-P5-HANDOFF-2026-10-03.md`

ويثبت كذلك أن أول P5 يجب أن يبدأ من:

`INVESTIGATE → DOCUMENT CURRENT REALITY → RECONCILE REQUIREMENTS/CONSTRAINTS → PRESENT ARCHITECTURAL OPTIONS → OWNER APPROVAL → DESIGN → IMPLEMENT → VERIFY → CLOSE`

---

# 4. PRE-P5 PUBLIC ASSESSMENT REALITY

في مرحلة P3/P4 تم توثيق أن قاعدة بيانات الإنتاج تحتوي على الرسم البياني الكامل للتقييمات المنشورة، وأن أسئلة وخيارات التقييمات الحالية ليست مشروعاً جديداً يحتاج إلى إعادة بناء.

التوثيق السابق يتضمن صراحةً:

- 93 سؤالاً و305 خيارات عبر العائلات الخمس في فحوص P3.
- كل سؤال مرتبط بالمحور الصحيح.
- فحوص التحقق تضمنت عدم حذف الأسئلة المنشورة الحالية.
- التوثيق يؤكد أن الأسئلة وعلامات الإجابات المرئية الحالية بقيت مصدر المحتوى.
- التحقق الإنتاجي كان قائماً قبل P5، لا على mock data جديدة.

لذلك، عند ظهور عرض لاحق بأن سؤالاً أو خياراً لا يظهر في المتصفح، يجب أن تكون الفرضية الأولى:

**regression / runtime / rendering / deployment / payload mismatch**

وليس:

**إعادة بناء محتوى التقييم أو افتراض أن قاعدة البيانات فقدت الخيارات.**

---

# 5. P5 CHANGES AND INCIDENT TIMELINE

## PR #34 — `545b7fd1...`
`fix(p5): align assessment editing with published content lifecycle`

التغيير كان أول توسع كبير في P5 على Admin assessment editing. شمل عدداً كبيراً من التغييرات، وكان نقطة بداية الانحراف التشغيلي الذي يجب تدقيقه بالكامل.

## PR #35 — `e9e1eeff...`
`chore(p5): reconcile lifecycle migration filename with live history`

تغيير توثيقي/تاريخ migration.

## PR #36 — `654be408...`
`fix(p5): secure admin session-count loading`

تم إصلاح قراءة sessions المباشرة عن طريق secure capability-checked RPC بدلاً من توسيع direct table privileges. هذا الجزء من حيث المبدأ متوافق مع حد الأمان المسجل، ويجب فقط إعادة التحقق منه في recovery.

## PR #37 — `35d12539...`
`fix(p5): complete Admin assessment editor lifecycle`

أضاف:
- axis/question/option editing.
- calculation configuration.
- mappings.
- deletion.
- read-after-write.
- Draft cascade-delete corrections.

Owner acceptance اللاحقة أثبتت أن وجود هذه العمليات في الكود لا يعني أن workflow أصبح صحيحاً.

## PR #38 — `7a7f0a9...`
`feat(p5): replace admin assessment modal with responsive workspace`

تم الانتقال إلى workspace جديد.

Owner acceptance بعده أبلغت عن:
- واجهة مربكة.
- modal/workspace صغير بالنسبة للبيانات.
- عدم وضوح assessment context.
- حفظ غير واضح للمستخدم.
- عرض سؤال واحد فقط في بعض الحالات.
- الخيارات غير ظاهرة كما يجب.
- فشل إضافة option في أسئلة لاحقة.
- سلوك lifecycle غير صحيح.

هذه هي نقطة مهمة: **التحسين المقصود في Admin لم يكن مشكلة في content model نفسها، لكن أعاد إدخال أعراض في العرض والتحكم.**

## PR #40 — `9a2f460...`
`fix(p5): reconcile assessment editor lifecycle and question-option workflow`

عالج:
- فصل Active/Archive.
- إظهار كل الأسئلة للمحور.
- إظهار كل الخيارات للسؤال.
- question-scoped option creation.
- إزالة duplicate lifecycle prototypes.

لكن هذه التغييرات نفسها أصبحت لاحقاً جزءاً من خط recovery لأنها لم تثبت بموجب Owner acceptance النهائي.

## PR #41 — `b834c956...`
`fix(p5): separate public visibility from archive`

تم بعد Owner clarification أن Stop Public ≠ Archive.

أضيف secure server-side option allocation لمعالجة 409 duplicate index، ومعالجة report-loading terminal errors.

## PR #42 — `c7b3f85e...`
`fix(p5): repair public assessment entry and separate stop-public lifecycle`

أضيف:
- dedicated Stop Public RPC path.
- history guard.
- direct assessment lookup.
- public runtime validation.
- public asset cache busting.

## PR #43 — `6dd9898...`
`fix(p5): restore public visibility semantics and report/runtime reliability`

التحقيق اللاحق أثبت:
- public Edge Function كان يقدم published content دون guard على `is_active`.
- report details اعتمد على in-memory snapshot.
- public option display/order عولج من جديد.
- cache busting زاد مرة أخرى.

## PR #44 — `2d997004...`
`fix(p5): allow secure lifecycle metadata through P2 immutability trigger`

تم اكتشاف أن secure Stop Public نفسه كان مرفوضاً من trigger الخاص بـ P2 immutability بسبب شرط `updated_at`.

هذا مهم في recovery:

**P2 code كان يُستخدم كأساس صحيح، ثم أضيفت له استثناءات lifecycle لأن P5 احتاجت سلوكاً جديداً.**

يجب عدم افتراض أن هذا التعديل يجب الاحتفاظ به. يجب إثباته مقابل contract وbaseline.

## PR #45 — `1a798f6...`
`fix(p5): restore canonical public assessment runtime`

هذا PR نفسه كان rollback/correction لأنه أقر بأن public runtime لم يعد يطابق سلوكاً كان معروفاً سابقاً.

وصف PR صراحةً أنه:
- استعادة `assets/js/app.js`.
- استعادة مراجع HTML.
- استعادة display ordering.
- دون تعديل assessment/question/option data.

هذا دليل مباشر على أن runtime regression كان موجوداً أثناء P5.

## PR #46 — `39bd9f4...`
`fix(p5): prevent production test pollution and refresh canonical public runtime`

اكتُشف أن workflow تلقائياً كان يشغل live E2E على production، ما أدى إلى إنشاء 24 lead اصطناعية في الإنتاج.

نتيجة ذلك:
- ظهرت أسماء اختبارات اصطناعية في Admin completed assessments.
- تم حذف 24 lead اختبارية مع التبعيات عبر CASCADE.
- تم إيقاف التشغيل الآلي للـ live E2E.
- أضيف opt-in صريح.
- أضيف فشل آلي عند نقص option cardinality.
- أضيف cache bust جديد.

هذا incident يجب اعتباره **خطأ في test isolation وحوكمة production access**، وليس خطأ في بيانات المستخدمين.

---

# 6. OWNER-REPORTED CURRENT FAILURES

بعد سلسلة P5، Owner reported أن النظام الذي كان يعمل قبل P5 أصبح يظهر، من بين أمور أخرى:

### Public assessment
- Lead data لا تنتقل بشكل موثوق إلى Questions في جميع التقييمات.
- بعض الأسئلة تعرض خيارات أقل من عدد الخيارات المخزنة.
- Patient Journey أظهر سؤالاً بثلاثة خيارات مخزنة لكن خيارين فقط في المتصفح.
- Comprehensive Clinic ظهر فيه أحياناً خيار واحد فقط بدلاً من 3/4/5 حسب السؤال.
- المشكلة ظهرت عبر التقييمات المختلفة وليست حالة محتوى واحدة.

### Admin
- Stop Public لم يكن يعمل في وقت سابق.
- Back navigation كان يخرج من browser.
- Edit كان يعطي أحياناً رسالة "cannot access record" ثم يفتح لاحقاً.
- بعض نتائج completed assessments عرضت UUIDs/test names بدلاً من أسماء respondents بسبب production test pollution.
- editor workflow كان مربكاً.

### Governance
- Owner أكد أن Stop Public منفصل عن Archive.
- Owner رفض lifecycle drift.
- Owner أكد أن القرارات التي لم تُطلب لا يجب إدخالها.
- Owner طلب الآن recovery شامل من P0 إلى P5.

---

# 7. HISTORICAL REGRESSION EVIDENCE ALREADY ESTABLISHED

التحقيق التاريخي المنفذ قبل هذا handoff وصل إلى النتائج التالية:

## `assets/js/app.js`
المقارنة بين baseline versions ذات الصلة لم تجد:
- `slice(0,2)`
- `limit 2`
- truncation صريحاً للخيارات.

الrenderer الحالي يستخدم iteration على `q.options`.

هذا يعني أن **سبب خيارين فقط لم يثبت بعد أنه truncation في هذا السطر نفسه**.

لكن وجود renderer ظاهرياً صحيح لا يثبت صحة end-to-end payload/deployment/runtime.

## CSS
`assets/css/style.css` حافظ على نفس SHA عبر baseline P4 وcurrent مقارنةً بالتحقيق السابق.

لم يثبت CSS hiding لثالث/رابع/خامس option.

## Edge Function
التحقيق التاريخي وجد أن تغييراً لاحقاً في `assessment-access` أضاف visibility guards، ولم يجد فيه limit 2 للخيارات.

Current function groups all options per question.

## Database
الإحصاءات الإنتاجية الحالية التي تحققت خلال P5 بقيت كاملة للعائلات المنشورة:

- Patient Journey: 25 questions / 75 options.
- Clinic Performance: 9 / 45.
- Medical Team: 12 / 44.
- Admin/Reception: 11 / 33.
- Comprehensive Clinic v10: 36 / 108.

لذلك لم يثبت فقدان جماعي للخيارات في قاعدة البيانات.

## Audit log / migrations
لم يظهر mass deletion للخيارات المنشورة من تغييرات P5 التي تمت مراجعتها.

---

# 8. IMPORTANT CONCLUSION FROM THE CURRENT EVIDENCE

حتى الآن توجد **ثلاث طبقات مختلفة يجب عدم خلطها**:

1. **Content/data layer:** الأسئلة والخيارات ما زالت موجودة في production بحسب counts والتحقيقات السابقة.
2. **Runtime/payload/rendering layer:** Owner يرى سلوكاً ناقصاً في browser.
3. **Governance/process layer:** سلسلة تغييرات P5 توسعت من Admin إلى public runtime/lifecycle/test execution وولدت regressions وincidents.

لذلك لا يجوز للمحادثة الجديدة أن تبدأ بإضافة renderer workaround أو بتعديل بيانات التقييمات.

البداية الصحيحة هي:

**أثبت أولاً exact known-good baseline → قارن كل commit بعده → حدد أول regression → استعد baseline أو أصغر patch يثبت contract → ثم تحقق end-to-end.**

---

# 9. THE FALSE `lluat.pages.dev` STATEMENT — CORRECTION

في المحادثة الحالية تم ذكر أن `lluat.pages.dev` ظهر في صورة أرسلها Owner، وتم استخدام ذلك لتفسير اختلاف deployment.

هذا الادعاء **غير صحيح**.

لا يوجد في الأدلة التي تم الرجوع إليها هنا ما يثبت أن Owner أرسل صورة يظهر فيها هذا العنوان.

كما لم يجد بحث repository النص `lluat`.

لذلك:
- هذا التفسير يُعتبر **ملغى**.
- لا يجوز استخدام `lluat.pages.dev` كسبب مفترض لأي regression.
- يجب عدم إعادة ذكره في المحادثة الجديدة كحقيقة.

هذه نقطة توثيقية مهمة حتى لا تنتقل معلومة غير صحيحة إلى handoff التالي.

---

# 10. PRODUCTION TEST POLLUTION — CLOSED INCIDENT, NOT TO BE REPEATED

The 24 synthetic lead rows created by automated production E2E were removed.

Verification after cleanup:
- 71 real/non-test leads remained.
- 0 synthetic leads remained.

Preventive changes from PR #46:
- automatic production live E2E disabled;
- production requires explicit `ALLOW_LIVE_E2E=true`;
- option cardinality is now part of E2E expectations;
- public app asset is cache-busted.

**Do not run live E2E against production in recovery unless explicitly approved and isolated.**

Preferred recovery validation:
- disposable/isolated database;
- read-only production inspection;
- browser validation with safe non-persistent or explicitly controlled fixtures.

---

# 11. LIFECYCLE CONTRACT — FROZEN FOR RECOVERY

## Draft
- Editable.
- Edit / Publish / Delete Draft.
- No Archive action.
- No Stop Public action.
- No Working Copy from itself.
- Paid-access controls are not Draft lifecycle controls.

## Published
- Published remains Published during editorial content edits.
- Structural/measurement/calculation changes require Working Copy.
- Allowed lifecycle operations:
  - Edit editorial content.
  - Create Working Copy.
  - Stop Public.

## Stopped Public Published
هذا ليس lifecycle state جديداً.

- status remains Published.
- public availability is false.
- Resume Public returns it to public availability.
- Archive is a separate explicit action.

## Archived
- historical/read-only.
- no Draft delete.
- no direct structural editing.
- secure Restore where permitted.

**Do not reintroduce a rule where Stop Public = Archive.**

---

# 12. SECURITY BOUNDARY — FROZEN FOR RECOVERY

- No broad direct table grants to make Admin easier.
- Sensitive operations remain server-authoritative and capability-checked.
- Protected tables remain protected.
- Existing secure RPCs are preferred over direct protected-table access.
- Browser hiding is never the security model.
- P0 security boundary is not to be weakened during recovery.

The earlier sessions-read incident demonstrated why this boundary matters: direct `sessions` SELECT failed by design; the correct route was the capability-checked secure RPC, not granting table access.

---

# 13. RECOVERY RULE FOR P2/P3/P4

Do not change:
- Family/Version model.
- stable public slug identity.
- version pinning of sessions.
- P3 scoring/interpretation semantics.
- KPI/EV formulas.
- trap semantics.
- P4 submission state machine.
- immutable result provenance.

Any actual contradiction must be documented as a new evidence item and stopped for Owner decision before redesign.

---

# 14. REQUIRED RECOVERY INVESTIGATION ORDER

The next conversation must execute in this exact order:

### Phase R0 — Freeze
Treat current P5 implementation as untrusted until reconciled.

### Phase R1 — Establish last known good
Use `96a68e30b386a0d3de89af4cd74f620c827989fb` / P0–P4 closure evidence as the reconstruction base.

### Phase R2 — Historical diff
Compare every P5-impacting commit after that baseline:
- #34
- #35
- #36
- #37
- #38
- #40
- #41
- #42
- #43
- #44
- #45
- #46
and any intermediate commits that touched:
- `assets/js/app.js`
- public HTML
- `assessment-access`
- Admin assessment editor/lifecycle
- migrations
- workflows
- deployment configuration.

### Phase R3 — First-regression identification
For each changed behavior ask:
- what was true at baseline;
- what changed;
- what Owner requested;
- whether owner approval existed;
- whether the change was necessary;
- whether it can explain the observed regression.

### Phase R4 — Restoration plan
Prefer:
1. exact revert to known-good behavior, or
2. smallest contract-preserving patch.

Do not stack another redesign on top.

### Phase R5 — Verification
Require:
- repository tests;
- isolated DB verification;
- public payload verification;
- browser rendering verification;
- lifecycle verification;
- no test pollution;
- deployment verification.

### Phase R6 — Owner acceptance
Only Owner browser acceptance can close P5.

---

# 15. ACCEPTANCE STANDARD FOR RECOVERY

Recovery is not successful because:
- tests are green;
- a database count is correct;
- an RPC succeeds;
- a DOM loop appears correct.

It is successful only when the live workflow is demonstrated end-to-end:

`open public assessment → lead data → Questions → every stored option displayed → answer saved → next question → completion → result`

and separately:

`Admin → correct lifecycle action → secure server operation → authoritative read-back → visible, understandable outcome`

P5 remains OPEN until Owner explicitly accepts the live result.

---

# 16. DO NOT DO

- No blind patching.
- No unapproved architecture changes.
- No public runtime rewrite while the historical cause is unknown.
- No content/data modification to compensate for a rendering bug.
- No production live E2E without explicit isolation/approval.
- No broad database privilege changes.
- No lifecycle-state invention.
- No claim that a suspected deployment mismatch is the cause without proof.
- No claim that the Owner provided evidence that was not actually provided.
- No P5 closure.

---

# 17. HANDOFF TO NEW CONVERSATION

The next conversation should start with:

**MD — P5 RECOVERY / FORENSIC RECONCILIATION**

Immediate objective:

> Return the system to the last verified good behavior before P5, without changing approved P0–P4 architecture, then reintroduce only the P5 work that is demonstrably required, approved, correctly designed, securely implemented, and manually accepted.

First concrete action:

**inspect the exact baseline tree at `96a68e30b386a0d3de89af4cd74f620c827989fb`, inventory all code/schema/workflow/deployment differences through current `main`, and identify the first regression before changing anything.**

---

# 18. AUTHORITATIVE REFERENCES

- `documentation/architecture/P0-P4-FINAL-CLOSURE-P5-HANDOFF-2026-10-03.md`
- `documentation/architecture/P0-P4-INTEGRATION-AUDIT-2026-10-03.md`
- `documentation/audit/P2-closure-2026-10-01.md`
- `documentation/audit/P3-GATE-3-CLOSURE-2026-10-02.md`
- `documentation/architecture/P4-CLOSURE-2026-10-03.md`
- `documentation/audit/P5-EDITOR-LIFECYCLE-DATA-RECONCILIATION-2026-10-04.md`
- `documentation/audit/P5-PUBLIC-RUNTIME-LIFECYCLE-NAVIGATION-CORRECTION-2026-10-04.md`
- `documentation/audit/P5-PUBLIC-OPTIONS-TEST-DATA-POLLUTION-2026-10-05.md`
- `documentation/handoff/P5-ADMIN-OPERATIONAL-HANDOFF-2026-10-04.md`

