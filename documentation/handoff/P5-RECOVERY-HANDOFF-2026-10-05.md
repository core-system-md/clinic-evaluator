# P5 — RECOVERY HANDOFF
## انتقال العمل إلى محادثة جديدة — 2026-10-05

**الحالة:** P5 OPEN / RECOVERY MODE  
**Repository:** `core-system-md/clinic-evaluator`  
**Supabase:** `oaqpzaarppccbnepffxx`  
**Current main at handoff preparation:** `39bd9f466d2346ae252fcef88019be848b30d87d`  
**Known-good P0–P4 reconstruction baseline:** `96a68e30b386a0d3de89af4cd74f620c827989fb`  
**Formal P0–P4 closure record:** `e4c191e6995a9b98b5adb2ab64a79f8806d4c1b8`

---

## 1. STARTING RULE

ابدأ من الصفر في تقييم P5 التنفيذي.

لا تعتبر أي PR أو migration أو runtime correction من P5 مكتملًا لمجرد أنه merged.

اعتبر كل ما بعد baseline أعلاه **provisional and subject to forensic reconciliation**.

الهدف ليس إضافة إصلاح جديد فوق إصلاحات متراكمة؛ الهدف أولاً تحديد ما الذي انكسر ومتى ولماذا، ثم استعادة السلوك الصحيح.

---

## 2. WHAT WAS KNOWN-GOOD

وثائق P0–P4 أغلقت baseline باعتباره production verified.

ضمن الأدلة:
- assessment graphs المنشورة متسقة.
- الأسئلة والخيارات كانت جزءاً من production content model المتحقق منه.
- P3 verification سجل 93 سؤالاً و305 خيارات عبر العائلات الخمس.
- لا توجد نتيجة تاريخية أو session provenance مكسورة بحسب checkpoint.
- public flow تم التحقق منه إلى completion/result قبل دخول P5.

لذلك يجب افتراض أن **الأسئلة/الخيارات لم تكن المشكلة الأصلية** إلى أن يثبت العكس.

---

## 3. OWNER'S CURRENT POSITION

المالك أكد:
- كانت التقييمات تعمل جيداً قبل دخول P5 من ناحية عرض الأسئلة والخيارات.
- مشاكل سابقة كانت في مجالات أخرى، وليست في question/option rendering.
- لا يريد قرارات تقنية غير مطلوبة.
- كل تغيير architectural/behavioral يجب أن يعود إلى العقد والموافقة.
- Stop Public منفصل عن Archive.
- لا يجب إعادة تعريف lifecycle.
- P5 لا يغلق إلا بعد browser acceptance.

---

## 4. CURRENT REPORTED REGRESSIONS

### Public
- lead data لا تصل دائماً إلى Questions.
- بعض الأسئلة تظهر بعدد خيارات أقل من العدد المخزن.
- عدة assessments affected.
- Comprehensive Clinic يظهر سلوكاً أسوأ في بعض الأسئلة.
- render behavior no longer matches the previously accepted user journey.

### Admin
- Stop Public فشل في مراحل سابقة.
- Back navigation خرج من browser.
- Edit أعطى أحياناً transient access/record error.
- editor workflow كان مربكاً وصغيراً.
- completed list تلوثت بأسماء E2E اصطناعية؛ تم تنظيف 24 lead اصطناعية.
- workflow السابق لم يكن مطابقاً لتوقع المالك.

---

## 5. MAJOR P5 CHANGE CHAIN

`#34 → #35 → #36 → #37 → #38 → #40 → #41 → #42 → #43 → #44 → #45 → #46`

أهمها:

- #34 lifecycle/editor foundation
- #37 editor completeness
- #38 workspace replacement
- #40 question/option rendering correction
- #41 Stop Public separation + server option allocation
- #42 public entry/navigation corrections
- #43 public visibility/runtime/report correction
- #44 P2 immutability compatibility change
- #45 rollback-style public runtime restoration
- #46 production E2E isolation + cache bust

تفاصيل وتحليل كل نقطة في:
`documentation/audit/P5-RECOVERY-AUDIT-2026-10-05.md`

---

## 6. GOVERNANCE RECOVERY

المحادثة الجديدة MUST follow:

`INVESTIGATE → DOCUMENT EVIDENCE → RECONCILE → ARCHITECTURAL OPTIONS → OWNER APPROVAL → DESIGN → IMPLEMENT → VERIFY → OWNER ACCEPTANCE → CLOSE`

لا تستخدم P5 roadmap كترخيص تلقائي لإعادة تصميم السلوك.

ولا تفسر symptom ثم تنفذ الحل قبل تثبيت evidence.

---

## 7. SECURITY / ARCHITECTURE FREEZE

لا تغيّر:
- P0 authorization boundary.
- P2 family/version architecture.
- P3 scoring/interpretation.
- P4 persistence/result provenance.
- protected-table privileges.
- lifecycle states.

لا تضف privilege لتجاوز UI failure.

---

## 8. LIFECYCLE CONTRACT

### Draft
Edit / Publish / Delete Draft.

### Published
Edit approved editorial content / Create Working Copy / Stop Public.

### Stopped Public Published
Published remains Published; `is_active=false`.

Resume Public returns `is_active=true`.

Archive is explicit and separate.

### Archived
Historical/read-only; secure restore where allowed.

لا تستخدم Stop Public كمرادف لـ Archive.

---

## 9. PUBLIC OPTIONS INCIDENT

Current production counts remained complete in database.

Earlier forensic comparison found no explicit `limit 2` or `slice(0,2)` in the current renderer and no mass deletion of published options.

هذا لا يغلق المشكلة.

التحقيق المطلوب الآن هو exact payload path:

`DB → assessment-access → get_content → app.js state → DOM`

ويجب تسجيل العدد في كل طبقة لسؤال معروف بأن له 3 أو 4 أو 5 خيارات.

---

## 10. PRODUCTION TEST INCIDENT

Automated live E2E created 24 synthetic leads in production.

This incident is cleaned up and the workflow has been changed to explicit opt-in.

لا تعيد تشغيل live E2E على production أثناء recovery بدون approval/isolation.

---

## 11. FALSE DEPLOYMENT CLAIM

تم في المحادثة السابقة ذكر `lluat.pages.dev` كأنه ظهر في صورة من المالك.

هذا **خطأ توثيقي وواقعي**، ولا يُستخدم في التحقيق.

لا يوجد دليل في الأدلة التي تمت مراجعتها يثبت ذلك.

---

## 12. REQUIRED FIRST SESSION

أول جلسة بعد handoff:

### Step 1
استخرج tree baseline:
`96a68e30b386a0d3de89af4cd74f620c827989fb`

### Step 2
اعمل inventory لكل تغييرات P5 اللاحقة.

### Step 3
قارن specifically:
- `assets/js/app.js`
- public HTML pages
- `supabase/functions/assessment-access`
- Admin manager/lifecycle/editor
- migrations
- workflows
- deployment records

### Step 4
حدد أول regression زمنياً، وليس آخر symptom.

### Step 5
لا تصلح بعد؛ اعرض evidence + root cause + restoration choice.

### Step 6
بعد approval فقط: implement minimal correction.

---

## 13. CLOSURE CONDITION

P5 لا يغلق حتى يؤكد Owner في المتصفح:

- Lead data → Questions works.
- Every stored option appears.
- Answers progress correctly.
- Completion/result works.
- Admin lifecycle works exactly as specified.
- No unexplained success/error states.
- Mobile and desktop workflows are usable.
- No production test pollution.
- Security boundaries remain intact.

---

**Next conversation title:**  
**MD — P5 RECOVERY / FORENSIC RECONCILIATION**

**First task:**  
**Reconstruct baseline → diff all P5 changes → identify first regression → document root cause → await/obtain Owner decision before implementation.**
