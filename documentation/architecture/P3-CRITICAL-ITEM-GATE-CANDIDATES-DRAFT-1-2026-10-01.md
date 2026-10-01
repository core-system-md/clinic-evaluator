# P3 — Critical Item / Gate Candidates
## Draft 1 — 2026-10-01
## الحالة: تحليل/مادة قرار — غير معتمد

## 1. لماذا نحتاج هذه الطبقة؟

الوزن وحده يفترض أن أثر البند **تدريجي وقابل للمقاصة**.

لكن بعض موضوعات الرعاية لها طبيعة مختلفة: إذا كان عنصر أساسي للخصوصية أو فهم القرار أو سلامة المعلومات ضعيفًا، فقد يكون من المضلل أن يعوضه أداء مرتفع في التسويق أو النمو أو سهولة التشغيل.

لذلك يجب التمييز بين:

- **Semantic weight:** مقدار مساهمة البند في construct.
- **Critical gate candidate:** بند قد يحتاج تنبيهًا/حاجز تفسير مستقلًا لأن انخفاضه لا ينبغي أن يختفي داخل المتوسط.
- **Diagnostic finding:** خلل أو تناقض يحتاج تفسيرًا، وليس بالضرورة خفضًا رقميًا.

## 2. Candidate critical domains

### A. Privacy / Confidentiality

مرشحو criticality:
- patient-journey Q12 — الخصوصية أثناء الجلسة.
- patient-journey Q13 — ما يمكن سماعه خارج غرفة الكشف.
- medical-team Q6c6668 — إجراءات الخصوصية.
- comprehensive Q16bab1 — إجراءات الخصوصية.

الأساس: WHO ومبادئ حقوق المريض والرعاية المحترمة تضع الخصوصية والسرية ضمن عناصر الرعاية الجيدة، وليست مجرد feature تجميلي.

### B. Informed Decision / Understanding

مرشحو criticality:
- patient-journey Q14 — شرح المشكلة والحل والنتيجة المتوقعة.
- patient-journey Q15 — التحقق من الفهم بأسلوب قريب من teach-back.
- medical-team Q8b0866 — شرح الخيارات ومزايا/قيود البدائل.
- medical-team Q03dc5a — التحقق من الفهم.
- comprehensive Q52ce1e — شرح الخطة والبدائل.

الأساس: AHRQ يصف teach-back بأنه تدخل مبني على الأدلة للتحقق من فهم المريض، ويضع shared decision making ضمن إشراك المرضى في الخيارات والمنافع والمخاطر.

### C. Clinical Information Continuity

مرشحو criticality:
- medical-team Q5893f3 — توثيق المعلومات والخطط.
- medical-team Qe603f6 — سهولة استرجاع المعلومات لاحقًا.
- comprehensive Q63167e — توافر المعلومات عند المراجعة اللاحقة.
- comprehensive Q9e24da — توثيق موحد وواضح.
- comprehensive Q48ff74 — إدارة البيانات والملفات.

الأساس: WHO يربط التوثيق المنظم بالاستخدام الآمن والمستمر للمعلومات، ودعم الرعاية والتحليل وإعادة الاستخدام.

## 3. لماذا لا نعطي كل critical item معاملًا أكبر وخلاص؟

مثال:

لنفترض محورًا من 5 بنود، أحدها privacy = 0 والأربعة الأخرى = 100.

في متوسط بسيط:
Overall axis = 80

قد يبدو الرقم جيدًا، رغم وجود فشل في موضوع أساسي.

هذا يوضح أن:

**Criticality ≠ Weight only**

وقد نحتاج:
- weight + flag؛
- أو weight + interpretation constraint؛
- أو gate مستقل.

## 4. Candidate gate semantics

لا نقترح الآن عتبة رقمية.

لكن يمكن أن تكون الحالات المستقبلية:

### PASS
العنصر الأساسي ضمن المستوى المقبول المحدد.

### ATTENTION
العنصر أقل من المستوى المستهدف، لكن يمكن عرض النتيجة العامة مع تنبيه.

### CRITICAL
العنصر في حالة تستوجب إبرازًا مستقلًا في التقرير وربما تمنع تصنيف النتيجة الكلية كحالة «جاهزة/مستقرة» إذا كان هذا هو المقصود في النموذج.

### UNKNOWN
لا توجد أدلة كافية أو البند غير قابل للتفسير بسبب صياغته/البيانات.

هذه الحالات ليست Q1–Q4، وليست penalties.

## 5. Candidate gate vs penalty

لا نوصي بالقاعدة:

critical item low → subtract 20 points

لأن قيمة «20» لا معنى لها علميًا بحد ذاتها.

الأقرب للمنهج القابل للتفسير:

critical item low
→ preserve axis score
→ emit critical finding
→ potentially constrain overall interpretation

أي أن التشخيص والتفسير يأتيان قبل العقوبة العددية.

## 6. Candidate critical items with current wording risks

بعض البنود ذات الأهمية العالية ما زالت تحتاج مراجعة دلالية:

| Item | لماذا هو مهم | المخاطرة الحالية |
|---|---|---|
| patient Q12/Q13 | privacy/confidentiality | تعريف «خصوصية كاملة» أو المسموع قد يحتاج معيارًا عمليًا قابلًا للملاحظة. |
| patient Q14/Q15 | informed decision | Q14 يحتاج مراعاة اختلاف الحالات؛ Q15 قوي دلاليًا لأنه قريب من teach-back. |
| medical Q8b0866 | options/limitations | «يعتمد على الطبيب أو الحالة» ليس صفرًا تلقائيًا؛ التفصيل يجب أن يتناسب مع القرار. |
| medical Q03dc5a | understanding | سؤال «هل لديك استفسارات؟» أضعف من teach-back، لكن البدائل الحالية لا تميز كل درجات الفهم. |
| medical Q2c9f29 | re-explanation | لا يصلح حاليًا كدرجة مباشرة؛ يجمع حاجة إعادة الشرح مع عدم التتبع. |
| medical Q8e7ea4 | resilience | trap flag يتعارض مع الدلالة الظاهرة للخيار 100. |
| medical Qe603f6 | record retrieval | وجود trap على الخيار 100 يمنع استخدام flag كجزء من score semantics. |
| comprehensive Q52ce1e | treatment plan | «البدائل» ليست شرطًا لكل قرار علاجي. |
| comprehensive Q63167e | information availability | trap flag لا ينسجم مع الدلالة الإيجابية الظاهرة. |
| comprehensive Q9e24da | documentation | يجب أن يميز بين توحيد التوثيق وجودة/اكتمال محتواه. |

## 7. العلاقة مع Semantic Weight

التسلسل المقترح:

1. item semantic importance
2. item role
3. item score/anchor
4. semantic item weight
5. axis/component score
6. critical gate evaluation
7. overall interpretation

لكن gate لا يستخدم لإخفاء الوزن ولا لتحويل score إلى عقوبة غير موثقة.

## 8. المرجعية المهنية المستخدمة في هذا التحليل

- WHO: جودة الرعاية تشمل الفعالية والسلامة والتمحور حول المريض والتوقيت المناسب، وتقوم على المعرفة المهنية المبنية على الأدلة.
- WHO: الخصوصية والسرية عناصر أساسية في الرعاية المحترمة وحقوق المريض.
- WHO: التوثيق المنظم يدعم الرعاية والسلامة وإعادة استخدام المعلومات.
- AHRQ: teach-back يتحقق من فهم المريض، وshared decision making يركز على الخيارات والمنافع والمخاطر وما يهم المريض.

## 9. حالة P3

لا gate مطبق في الإنتاج.

لا thresholds جديدة.

لا penalties جديدة.

هذا المستند يحول الملاحظة إلى **candidate gate layer** فقط حتى لا نستخدم متوسطًا واحدًا لإخفاء إخفاق في عنصر أساسي.

القرار المطلوب لاحقًا: تحديد أي البنود critical فعلًا، وما أثر انخفاضها على interpretation، بعد مراجعة construct والخيارات.
