# ADR-007 — قرار المالك: Server-authoritative scoring

**الحالة:** Accepted
**قرار المالك:** Option B
**التاريخ:** 2026-10-01

## القرار

يعتمد Clinic Evaluator الحساب الخادمي كالمصدر الرسمي والوحيد للنتيجة.

المتصفح يرسل الإجابات الأصلية وإصدار التقييم/السياق اللازم، ولا يستلم أوزان التقييم أو قواعد الـTraps أو خرائط KPI/EV أو المنهجية السرية اللازمة لإعادة بناء النتيجة.

## تعديل ADR-002

يُعدّل الجزء الذي كان يعتمد على الحساب الفوري داخل المتصفح. لا يعود حساب المتصفح مصدرًا للنتيجة الرسمية.

## متطلبات التنفيذ

- الحفاظ على تجربة استجابة سريعة.
- قياس زمن الاستجابة الفعلي لمسار الإكمال.
- استخدام محرك حساب خادمي واحد كمصدر حقيقة.
- جعل عملية الإكمال idempotent.
- تخزين النتيجة والـscores بعد الحساب الرسمي فقط.
- عدم إعادة إدخال قواعد الحساب السرية إلى JavaScript/JSON العام.
- عدم إعلان نجاح الإنتاج قبل اختبار runtime للمسار الكامل.

## ما لا يتغير

- الاستخدام المحمي يُستهلك عند إكمال التقييم، وليس عند تسجيل الدخول أو بدء الجلسة.
- يمكن استئناف نفس الجلسة.
- الاستخدام لا يُستهلك أكثر من مرة لنفس الجلسة.
- قرارات الملكية والصلاحيات ونطاق المنتج تبقى كما اعتمدت سابقًا.

## الخطوة التالية

تنفيذ محرك scoring خادمي يستقبل الإجابات الخام من الجلسة، يعيد بناء البيانات اللازمة من قاعدة البيانات، يحسب النتيجة، ثم يكمل الجلسة والمعاملة الذرية لاستهلاك الاستخدام.


---

## Current implementation correction — 2026-10-01

The accepted architectural decision remains valid, but the original implementation-step wording is now historical. The server-authoritative scoring path is implemented in production: `assessment-access` invokes `calculateAssessment` from `score-engine.ts` during `complete`, and persistence is performed by the protected/public completion RPCs. The browser no longer calculates the official score.

The earlier reference to `complete_assessment_with_server_scoring(...)` does not describe the final production implementation; that RPC is not present in the live database. P3 is now responsible for consolidating the active scoring implementation, removing ambiguity among legacy/reference paths, and defining deterministic engine versioning/reproducibility.