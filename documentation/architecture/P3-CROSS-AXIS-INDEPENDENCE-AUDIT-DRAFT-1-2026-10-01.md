# P3 — Cross-Axis Independence Audit
## التاريخ: 2026-10-01
## الحالة: Draft / Design Input — غير معتمد

## 1. السؤال

قبل اعتماد `axisScore → overall`، لا يكفي أن يكون كل محور متماسكًا داخليًا. يجب معرفة هل المحاور داخل التقييم تقيس أبعادًا متميزة، أم أنها:

- مراحل متتابعة في نفس الرحلة؛
- قدرات سببية متداخلة؛
- outcomes ناتجة عن قدرات أخرى؛
- أو مكونات formative يُقصد جمعها معًا رغم عدم استقلالها.

هذا التدقيق لا يتطلب أن تكون المحاور مستقلة إحصائيًا بالكامل. المطلوب هو أن تكون **علاقة المحاور بالـoverall واضحة ومقصودة**.

## 2. قاعدة القراءة

### Reflective-like
المحور يفترض construct كامنًا واحدًا، والعناصر مؤشرات له.

في هذا الشكل، الخلط بين constructs مختلفة داخل المحور يضر بالتجميع.

### Formative-like
المحاور/المكونات تساهم معًا في تكوين مؤشر أكبر. قد تكون المكونات مختلفة، ولا يشترط أن تكون مترابطة.

هذا الشكل يناسب بعض تقييمات الأنظمة والقدرات، لكنه يحتاج تعريفًا صريحًا حتى لا يُفهم overall كأنه «متوسط سمة واحدة».

### Sequential / pathway
المحاور تمثل مراحل مختلفة في رحلة واحدة، مثل الوصول → الاستشارة → الالتزام → الاستمرارية.

يمكن جمعها في مؤشر رحلة، لكن يجب التصريح بأن العلاقة **مراحل** وليست أبعادًا مستقلة متساوية المعنى.

---

## 3. Patient Journey

| المحور | construct | علاقته بالمحاور الأخرى | القراءة |
|---|---|---|---|
| A1 | pre-booking engagement | يسبق A2–A5 في التسلسل | stage |
| A2 | arrival/emotional safety | مرحلة الوصول قبل/حول الخدمة | stage |
| A3 | consultation trust | مرحلة الاستشارة | stage |
| A4 | treatment commitment | نتيجة/مرحلة لاحقة متأثرة بـA1/A3 | downstream capability/outcome |
| A5 | continuity management | مرحلة ما بعد الخدمة والاستمرار | stage/outcome-adjacent |

### الاستنتاج

هذا التقييم لا يبدو كخمسة محاور مستقلة بالمعنى الضيق. هو أقرب إلى **مسار رحلة المريض**.

لذلك يمكن أن يكون overall مفهومًا كمؤشر لقدرة إدارة الرحلة عبر مراحلها، لكن يجب عدم تقديمه كأنه «متوسط خمس صفات مستقلة».

أهم نقطة: A4 (الالتزام بالخطة) وA5 (الاستمرارية/الولاء) قد يتأثران بما يقاس في المراحل السابقة. هذا ليس خطأً إذا كان النموذج تكوينيًا، لكنه يصبح مشكلة إذا فُسر overall كقياس سببي مستقل لكل محور.

---

## 4. Clinic Performance

| المحور | construct | التداخل الرئيسي | القراءة |
|---|---|---|---|
| A1 | process maturity | بنية/قدرة تمكّن الممارسات الأخرى | capability |
| A2 | engagement + measurement + enablement | يتصل بالتحويل وبالقدرة البشرية | mixed |
| A3 | recovery + measurement + retention | يحتوي outcome-adjacent elements | mixed |

### الاستنتاج

هذا التقييم هو الأكثر حساسية لمشكلة **مستويات القياس المختلفة**:

- A1 يقيس قدرة تشغيلية/نضج نظام.
- A2 يجمع ممارسة تواصلية مع القياس والتدريب.
- A3 يجمع الاستعادة والقياس والاحتفاظ.

لذلك لا ينبغي تثبيت وزن 50/30/20 قبل حسم construct للمحورين A2 وA3.

وجود وزن 50% لـA1 قد يكون مقصودًا إذا كان «نضج العمليات» هو الأساس البنيوي للتقييم، لكنه لا يمكن إثبات ذلك من DB وحدها.

---

## 5. Medical Team

| المحور | construct | التداخل | القراءة |
|---|---|---|---|
| A1 | clinical communication/trust | قريب من professionalism في السلوك والتواصل | partial overlap |
| A2 | professionalism + resilience | يحتوي عنصر resilience التشغيلي | mixed |
| A3 | documentation/continuity compliance | أكثر تميزًا بنيويًا | distinct-ish |
| A4 | teamwork/reliability | يتقاطع مع coordination/resilience | distinct-ish |

### الاستنتاج

البناء أكثر وضوحًا من clinic-performance، لكن A1/A2 لهما حد مشترك حول السلوك المهني والتواصل.

A4 منخفض الوزن 15% ومع بندين فقط؛ لذلك أي وزن نهائي يحتاج مبررًا يفسر هل teamwork أقل أهمية فعلًا أم أن عدد البنود فقط هو سبب انخفاض تأثيره — ولا يجوز افتراض الثاني.

---

## 6. Admin & Reception

| المحور | construct | التداخل | القراءة |
|---|---|---|---|
| AX765ca8 | front-desk entry experience | يتصل بالتدفق والجدولة | partial overlap |
| AX85a6e9 | scheduling/flow + recovery | Q9a86a8 يمتد إلى retention/recovery | mixed |
| AXa23fa3 | administrative process control | أكثر تميزًا | distinct-ish |
| AXc39190 | internal coordination | قريب من operational flow | partial overlap |

### الاستنتاج

المحاور مناسبة مبدئيًا كأدوار تشغيلية مختلفة، لكن scheduling/flow وcoordination قد يتداخلان.

AX85a6e9 يحمل 35%؛ وQ9a86a8 داخل نفس المحور يضيف construct استعادة المريض. لذلك لا يصح اعتبار المحور «جدولة فقط» عند تقييم الوزن.

---

## 7. Comprehensive Clinic

| المحور | construct | التداخل | القراءة |
|---|---|---|---|
| AX6f5aa5 | patient journey management | يتصل conversion وretention | broad/formative |
| AX80c09a | treatment-start pathway | يتصل journey وretention | mixed/formative |
| AXaadfb4 | operations | يدعم journey وteam | capability |
| AX2572cc | team governance/reliability candidate | يتصل operations وcompliance | mixed |
| AX6a52b4 | continuity/retention + measurement | downstream من journey | mixed |
| AX15afd8 | economic/strategic sustainability | outcome/strategy layer | outcome-adjacent |

### الاستنتاج

التقييم الشامل يبدو أقرب بوضوح إلى **مؤشر تكويني متعدد المجالات** منه إلى مقياس reflective واحد.

أكثر نقطة حساسة هي أن:
- journey
- treatment-start
- retention

مرتبطة كمسار زمني/سببي، بينما operations/team هي capabilities، وgrowth/sustainability طبقة استراتيجية.

لذلك المتوسط المرجح بينها يمكن أن يكون صحيحًا فقط بعد تعريف overall على أنه **composite management index**، لا باعتباره قياسًا واحدًا لنفس السمة.

---

## 8. Consequence for weighting

الوزن له معنى مختلف حسب شكل النموذج:

### في نموذج مراحل الرحلة
الوزن = أهمية المرحلة في الرحلة.

### في نموذج capabilities
الوزن = الأهمية البنيوية للقدرة.

### في نموذج outcomes
الوزن = أهمية النتيجة.

لا يجوز مزج هذه المعاني ضمن overall واحد دون تعريف واضح للعلاقة.

---

## 9. ما تم إثباته الآن

1. أوزان المحاور لها provenance تاريخي، لكنها لا تحمل rationale منهجيًا تفصيليًا.
2. المحاور ليست كلها من النوع نفسه.
3. بعض التقييمات أقرب إلى pathway/series of stages.
4. بعض التقييمات أقرب إلى formative composite.
5. بعض المحاور المختلطة تحتاج components قبل أن يكون وزن المحور ذا معنى.
6. لذلك **الوزن لا يمكن تثبيته بمعزل عن نوع overall construct**.

---

## 10. لا ينبغي فعله

- لا نساوي الأوزان تلقائيًا قبل تعريف overall.
- لا نحتفظ بالأوزان التاريخية فقط لأنها «الأصلية».
- لا نعدل الأوزان لإجبار overall على رقم مرغوب.
- لا نستخدم الاختبارات الحسابية وحدها لتحديد أهمية المجال.
- لا نحذف محورًا فقط لأنه يتداخل مع محور آخر؛ قد يكون التداخل مقصودًا في نموذج formative/pathway.

---

## 11. القرار المنهجي التالي

قبل تثبيت axis weights، يجب تعريف **Overall Construct لكل تقييم** في سطر واحد:

> «ما الذي يُفترض أن يعنيه overall هذا التقييم؟»

ثم لكل محور:

> «كيف يساهم هذا المحور في overall: مرحلة، قدرة، نتيجة، أم مكون تكويني؟»

بعد ذلك فقط يمكن كتابة `weight rationale` بصورة صحيحة.

## 12. حالة P3

لا توجد تغييرات إنتاجية.

الحالة:

`overall construct → axis role → component boundaries → axis weight rationale → sensitivity → scorer contract`

وهذا يسبق إعادة بناء scorer الإنتاجي.
