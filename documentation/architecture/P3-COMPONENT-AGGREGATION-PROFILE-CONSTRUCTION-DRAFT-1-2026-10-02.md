# P3 — Component Aggregation & Profile Construction — Draft 1
## التاريخ: 2026-10-02
## الحالة: Design Input / غير إنتاجي

## 1. الغرض

تحديد كيفية انتقال النظام من:

Item Response
→ Construct
→ Component
→ Profile

دون إعادة إنتاج مشكلة المتوسط العام الذي يخلط:
- Performance
- Maturity
- Measurement/Evidence
- Digital Capability
- Criticality
- Consistency
- Development Opportunity

هذه الوثيقة لا تغير production scorer.

---

## 2. المبدأ الأساسي

**النتيجة الأساسية = Profile متعدد الأبعاد.**

ليس الهدف اختزال MD Code إلى:
"one number = clinic quality"

بل إنتاج ملف تشخيصي يوضح:

1. ماذا يحدث فعليًا؟
2. مدى نضج النظام الذي يدعم الممارسة.
3. أين توجد قدرة قياس/تعلم.
4. أين توجد قدرة رقمية/أتمتة.
5. هل توجد إشارات اتساق أو variability؟
6. هل توجد critical findings؟
7. أين توجد فرصة تطوير/تحول؟

---

## 3. طبقة المكوّن Component

لكل component يوجد سجل مستقل.

مثال C04 — Follow-up & Continuity:

- performance_score
- performance_coverage
- maturity_score
- maturity_coverage
- evidence_state
- consistency_signals
- critical_flags
- development_signals

لا يُفرض وجود كل الحقول لكل component إذا لم يقسه assessment.

---

## 4. قاعدة Aggregation

### 4.1 داخل construct/component

عندما تكون البنود قابلة للمقارنة داخل construct واحد:

component_score = mean(eligible_item_scores)

بشرط:
- item eligible
- response interpretable
- item mapped إلى نفس construct/component
- لا يكون semantic-only
- لا يكون missing
- لا يكون outcome غير متاح

### 4.2 الأوزان

حتى هذه المرحلة:

**لا يوجد وزن رقمي نهائي جديد للمكونات.**

جميع التأثيرات السابقة مثل impact=medium أو semantic influence matrix لا تتحول تلقائيًا إلى mathematical weights.

الخط الأساس للتحليل:
- equal primary-item weighting داخل construct/component.

بعد اكتمال المراجعة يمكن اعتماد semantic weights منفصلة إذا ثبتت ضرورتها.

---

## 5. Performance وMaturity لا يندمجان

### Performance

يجيب:
«ما مستوى الممارسة/التنفيذ الذي يصفه السؤال؟»

أمثلة:
- إدارة التأخير.
- التواصل.
- المتابعة الفعلية.
- الخصوصية.
- وضوح الخطوة التالية.

### Maturity

يجيب:
«ما مدى نظامية وقابلية التكرار والقياس والتكامل في الطريقة؟»

أمثلة:
- SOP.
- برنامج تدريب.
- CRM.
- أتمتة.
- Dashboard.
- closed-loop review.

### قاعدة

وجود maturity مرتفع لا يرفع performance تلقائيًا.

وجود performance مرتفع يدويًا لا يخفضه تلقائيًا.

---

## 6. Evidence / Measurement

أسئلة القياس والتوثيق لا تتحول إلى performance outcomes.

مثال:

Qf3c0c2 CAC

إذا كانت الإجابة «نقيس CAC بدقة»:

measurement_maturity ↑

ولا يعني:

CAC ↓

ومثلها:
- LTV
- Conversion
- Retention
- Referral
- Patient experience measurement

Observed outcome يحتاج data منفصلًا.

---

## 7. Digital Capability

Digital ليس score بديلًا عن الأداء.

النموذج يمكن أن ينتج:

digital_capability = 80

مع:

practice_performance = 55

وهذا ليس تناقضًا.

قد يعني:
- بنية رقمية قوية.
- لكن التنفيذ أو الممارسة بحاجة تطوير.

والعكس صحيح:
practice_performance = 90
digital_capability = 30

قد يعني:
- ممارسة بشرية ممتازة.
- لكن النظام غير مؤتمت.

هذه النتيجة مفيدة لـMD Code بدل معاقبة أحد البعدين بالآخر.

---

## 8. Coverage

لكل component:

coverage = answered_and_interpretable / applicable_expected_items

ويجب فصل:

- Answered
- Missing
- Not applicable
- Unsupported by this assessment
- Semantic-only
- Critical but unresolved

### قاعدة مهمة

Missing ≠ 0

Not applicable ≠ 0

Unsupported ≠ 0

عدم القياس لا يُحوّل إلى أداء ضعيف إلا إذا كان السؤال نفسه يقيس **غياب نظام القياس**.

---

## 9. Evidence state

بدل اختلاق confidence رقمي دقيق من self-report، يحتفظ النظام بحالة evidence:

- DIRECT_RESPONSE — الرد يصف ممارسة أو قدرة مباشرة.
- SELF_REPORTED_MEASUREMENT — يصف وجود نظام قياس كما يقرره المستخدم.
- OBSERVED_OUTCOME — بيانات فعلية مستقلة عند توفرها.
- CONTEXTUAL — النتيجة تحتاج تفسيرًا مرتبطًا بالسياق.
- UNVERIFIED — claim موجود لكن لا يوجد دليل مستقل.
- NOT_AVAILABLE — لا يوجد ما يسمح بالاستنتاج.

هذا يمنع مساواة «نحن نقيس» مع «النتيجة جيدة».

---

## 10. Consistency layer

Consistency ليست component مستقلًا بالضرورة، بل طبقة تحليلية عابرة للمكونات.

### مثال

Q0f8102:
«تنفيذ متسق»

ومقابله:
Q12f297:
وجود/غياب تحليل أسباب عدم البدء

قد تظهر العلاقة بين الردود كإشارة consistency.

### الناتج

بدل:

score - penalty

النموذج ينتج:

- signal_type
- severity
- related_items
- affected_components
- explanation
- review_required

ولا يوجد numeric penalty تلقائي قبل اعتماد Rule Catalog مستقل.

---

## 11. Criticality layer

Criticality لا تستخدم كـbonus ولا penalty تلقائي.

للبنود الحرجة:

- privacy
- patient understanding
- information continuity
- potentially safety/professional conduct

يحتفظ النظام بـ:

critical_status

مثل:

- CLEAR
- ATTENTION
- CRITICAL_FINDING
- UNVERIFIED

والـprofile يظل ظاهرًا حتى لو ظهرت critical finding.

### لماذا؟

حتى لا تختفي مشكلة حرجة داخل متوسط مرتفع.

ولا نريد في المقابل اختراع معادلة خصم لمجرد وجود finding.

---

## 12. Development / Transformation Opportunity

هذا البعد لا يُشتق حاليًا من:

100 - score

لأن ذلك يفترض أن كل انخفاض = فرصة تطوير متساوية.

بدل ذلك، يُبنى من إشارات:

- low practice signal
- low maturity signal
- evidence gap
- consistency/variability signal
- digital opportunity
- training opportunity
- business process opportunity
- critical finding

### المخرج الأول

development_signals[]

كل إشارة تحمل:
- domain
- source_items
- current_state
- evidence_state
- suggested_pathway

مثل:
- Training
- Consulting
- Operational redesign
- Digital enablement
- Measurement setup
- Management review

ولا تتحول هذه الإشارات إلى ترتيب «أفضل فرصة» دون نموذج تجاري/مرجعي معتمد.

---

## 13. Profile Structure

التمثيل المنطقي المقترح:

profile
├── components
│   ├── C01
│   │   ├── performance
│   │   ├── maturity
│   │   ├── evidence
│   │   ├── coverage
│   │   └── signals
│   ├── C02
│   └── ...
├── critical
│   ├── findings
│   └── status
├── consistency
│   └── signals
├── transformation
│   └── development_signals
├── outcomes
│   └── observed_metrics
└── composites
    ├── performance_profile
    └── maturity_profile

---

## 14. Overall Composite

### الحالة الحالية

لا يوجد overall composite موحد ومُلزم.

الـprofile هو النتيجة الأساسية.

### Composite محتمل لاحقًا

يمكن اشتقاق composites ثانوية فقط عندما تكون المكونات:
- comparable
- construct-valid
- adequately covered
- semantically aligned

مثال مشروع:

Performance Profile Composite

ومنفصل عنه:

Maturity Profile Composite

لكن:

Clinic Quality = weighted average of everything

غير مقبول في هذا النموذج.

---

## 15. كيف تتأثر العائلة بالـProfile

### Patient Journey

يمكن أن ينتج:
- communication performance
- understanding
- continuity
- experience
- consultative process
- privacy critical

دون ادعاء أنه «معدل تجربة المريض الكلي».

### Medical Team

يمكن أن ينتج:
- communication performance
- understanding
- privacy critical
- follow-up performance
- team resilience
- documentation maturity
- evidence/consistency signals

### Clinic Performance

يركز بقوة على:
- maturity
- digital capability
- measurement
- commercial/retention systems

ولهذا هو المرشح الطبيعي لاستخدام 0/30/50/80/100.

### Admin Reception

يركز على:
- operational performance
- process maturity
- coordination
- resilience
- continuity

### Comprehensive Clinic

يجمع أوسع profile عبر المكونات، لكن لا يجوز أن يحول الاتساع إلى «average of unrelated things».

---

## 16. Interaction with current axes

المحاور التاريخية لا تحذف تلقائيًا.

العلاقة المقترحة:

Axis = presentation/legacy container

Component = semantic measurement unit

وبعد validation يمكن أن يصبح التقرير:

Assessment
→ Sections/legacy axes
→ Components
→ Profile dimensions

بحيث لا نكسر الهوية القديمة دون حاجة.

---

## 17. Impact of all-medium items

حاليًا جميع الـ93 items تحمل impact=medium.

إلى أن يعتمد semantic weighting:

- لا multiplier إضافي.
- لا item gets 1.5 بسبب high غير موجود فعليًا.
- لا item gets 0.5 بسبب low غير موجود فعليًا.

هذا يمنع fake precision.

---

## 18. Example

إجابة عيادة على تقييم ما:

- practice performance: 88
- system maturity: 42
- digital capability: 20
- measurement maturity: 35
- critical privacy: ATTENTION
- consistency: 2 review signals
- development signals:
  - process standardization
  - digital continuity
  - follow-up measurement

هذا profile أكثر فائدة من:

Overall = 47

لأنه يبين أن المشكلة ليست «الجودة كلها»، بل فجوة بين الممارسة الحالية ونظامها الداعم.

---

## 19. قواعد منع التحيز الحسابي

النظام لا يجب أن:

- يخفض اليدوي فقط لأنه يدوي.
- يرفع automation فقط لأنه automation.
- يعتبر dashboard دليل أداء جيدًا.
- يحول measurement إلى outcome.
- يعاقب critical findings رقميًا بلا rule.
- يمتلئ missing بأصفار.
- يملأ role غير مقاس بمتوسط عام.
- يعتبر option index score.
- يجمع repeated semantic effects من نفس السؤال ثلاث مرات.

---

## 20. بوابة العمل التالية

قبل scorer implementation:

1. تثبيت component membership لكل item.
2. تثبيت measurement layer لكل item.
3. تنفيذ response interpretation.
4. تحديد eligible items لكل result.
5. إنشاء component aggregation utility.
6. إنشاء coverage/evidence utility.
7. إنشاء critical/consistency signal layer.
8. إجراء sensitivity analysis.
9. ثم تصميم profile persistence/API.
10. وبعد ذلك فقط بناء scorer النهائي.

**Production impact: documentation only.**
