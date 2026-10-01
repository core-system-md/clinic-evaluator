# P3 — Response Interpretation Contract — Draft 1
## التاريخ: 2026-10-02
## الحالة: Design Input / غير إنتاجي

## 1. الهدف

إنشاء طبقة ثابتة بين option identity وبين scoring بحيث لا يعتمد scorer النهائي على option_value وحده.

المسار:

selected option
→ response interpretation
→ construct-specific representation
→ aggregation

---

## 2. لماذا هذه الطبقة إلزامية؟

البيانات الحالية تثبت وجود حالات مثل:

- 0/0/40/100/100
- 0/40/100/40
- 0/40/100/0
- 100/40/0/0

لذلك لا يمكن استخدام الرقم وحده لمعرفة:
- هل الحالة أفضل؟
- هل هي أسوأ؟
- هل هي مجرد context؟
- هل هي evidence gap؟
- هل هي digital maturity؟
- هل هي critical signal؟

---

## 3. Stable response identity

كل option يجب أن يُفسر بواسطة هوية مستقرة:

- assessment_family
- assessment_version
- question_code
- option_index
- option_id
- semantic_state_key

الـsemantic_state_key لا يعتمد على ترتيب العرض فقط.

مثال:

Q1 + option 4
قد يصبح:

semantic_state_key = DIGITAL_ADVANCED_INTEGRATED

والـnumeric anchor:

100

داخل C09 maturity فقط.

---

## 4. Response interpretation fields

### Required

- semantic_state_key
- measurement_type
- primary_construct
- component
- measurement_layer
- direction
- score_mode
- anchor_score
- score_eligible
- context_required
- criticality
- consistency_role
- evidence_role

### Recommended

- secondary_components
- semantic_class
- scoring_rationale
- provenance
- interpretation_version

---

## 5. measurement_type

الأنواع المقترحة:

- ORDINAL_PRACTICE
- ORDINAL_MATURITY
- DIGITAL_MATURITY
- MEASUREMENT_MATURITY
- BINARY_STATE
- FREQUENCY
- EVIDENCE_STATE
- CONTEXTUAL_STATE
- CONSISTENCY_SIGNAL
- CRITICAL_STATE
- OUTCOME_STATE

ليس من الضروري أن يكون كل option من النوع نفسه؛ لكن يجب أن تتطابق الخيارات داخل السؤال مع construct واضح أو أن يصنف السؤال mixed/contextual.

---

## 6. score_mode

### DIRECT_ANCHOR

الحالة تستخدم anchor رقميًا داخل construct واضح.

مثال:
0 / 40 / 100

### MATURITY_5_STATE

خمس حالات فعلية:

0 / 30 / 50 / 80 / 100

تستخدم فقط عندما يكون السؤال maturity/capability progression.

### SEMANTIC_ONLY

لا يوجد direct numeric score.

يستخدم للحالات context-dependent أو mixed غير القابلة للترتيب.

### EVIDENCE_ONLY

الرد يثبت وجود/غياب/نضج القياس أو الدليل، وليس outcome.

### SIGNAL_ONLY

الحالة تغذي consistency أو criticality أو diagnostic logic ولا تدخل average مباشرة.

---

## 7. direction

القيم المقترحة:

- POSITIVE — الأعلى دلاليًا أعلى داخل construct.
- NEGATIVE — الأعلى دلاليًا أقل داخل construct، عندما يكون construct نفسه مصاغًا عكسيًا.
- NON_MONOTONIC — لا يوجد ترتيب خطي.
- CONTEXTUAL — يعتمد على السياق.
- NOT_APPLICABLE — لا توجد دلالة رقمية.

مثال:

إذا كان السؤال يقيس «جودة إدارة التأخير»:

option:
«ينتظر المرضى حتى تتحسن الظروف»

قد يكون POSITIVE/low anchor.

لكن خيار:
«حسب الحالة»

لا يصبح تلقائيًا 60 أو 80؛ بل CONTEXTUAL.

---

## 8. anchor_scale_id

الـscale يجب أن يكون معرفًا ككيان مستقل.

أمثلة:

- ANCHOR_0_40_100_V1
- ANCHOR_0_30_50_80_100_MATURITY_V1
- NO_NUMERIC_ANCHOR

وذلك يمنع دفن منطق المقياس داخل scorer.

---

## 9. قاعدة 0/30/50/80/100

لا يستخدم إلا عندما:

1. السؤال يملك خمس response states فعلية.
2. الحالات تمثل progression واضحًا في construct واحد.
3. المجال المقاس هو capability/maturity/measurement maturity أو ما يماثله.
4. لا يعتمد الترتيب على «وجود تقنية» وحدها إذا كانت النتيجة المقصودة جودة ممارسة مختلفة.
5. الرقم يمثل anchor designed for the construct، وليس نسبة مئوية تجريبية مدعاة.

الـ9 أسئلة الحالية في clinic-performance تحقق الشرط الهيكلي، ولذلك هي المجموعة الأولى المرشحة.

---

## 10. قاعدة 0/40/100

تبقى صالحة عندما:

1. توجد ثلاث حالات واضحة.
2. يوجد اتجاه واضح.
3. الحالة الوسطى تمثل مستوى intermediate داخل نفس construct.
4. لا توجد حالة context-dependent متخفية داخل السلم.
5. لا يتم استخدام الرقم كـoutcome عندما يكون السؤال measurement/capability.

---

## 11. Semantic-only examples

### Medical

«حسب الطبيب/الحالة»

لا يعني:
- أفضل
- أسوأ
- 80
- 40

بل:

context_required = true
direction = CONTEXTUAL

وقد ينتج لاحقًا:
- variability signal
- need for review
- evidence requirement

### Patient Journey

Q7:
الاختيارات تمثل آليات مختلفة للاستقبال أكثر من كونها مستويات متتالية.

إذن:
score_mode = SEMANTIC_ONLY

إلى أن يثبت construct عددي واضح.

---

## 12. Criticality

Criticality ليست وزنًا.

مثال:

Q15 patient understanding

قد يكون:

anchor_score = 100
criticality = HIGH
measurement_layer = PRACTICE

الـ100 هنا لا يعني أن الحالة «أكثر من الحرجة».

Criticality تبقى قناة مستقلة للـdiagnostics/gates.

---

## 13. Consistency role

كل response interpretation يمكن أن يكون:

- NONE
- SUBJECT_TO_RULE
- VALIDATOR
- TARGET
- CONTEXT_SIGNAL

وفي Rule Engine لاحقًا يمكن ربط:
validator + target

لكن response interpretation نفسه لا يخصم شيئًا.

---

## 14. Evidence role

القيم المقترحة:

- NONE
- PRACTICE_CLAIM
- MEASUREMENT_CLAIM
- DOCUMENTATION_CLAIM
- OBSERVED_OUTCOME
- EVIDENCE_GAP

مثال Q5 clinic-performance:

«تحليل تفصيلي لمعدلات التحويل...»

هو:
MEASUREMENT_CLAIM

وليس:

OBSERVED_OUTCOME

---

## 15. قاعدة outcome

Observed outcome لا يصنعه option scoring.

أمثلة:

- conversion rate
- CAC
- LTV
- retention rate
- no-show rate
- satisfaction score

لا تُستنتج من:
«لدينا نظام يقيسها».

يتم ربطها لاحقًا ببيانات outcome فعلية عندما تكون متاحة.

---

## 16. حفظ البيانات التاريخية

عند الانتقال للنظام الجديد:

- raw option identity تبقى.
- current option_value تبقى لأغراض audit/history.
- semantic interpretation الجديدة تصير المصدر authoritative للقياس الجديد.
- historical results لا يعاد تعريفها صامتًا.

إذا احتاجت النتائج التاريخية إعادة حساب:
يجب أن يكون ذلك migration/recalculation operation واضحًا ومُسجلًا.

---

## 17. Versioning

كل interpretation يجب أن يكون قابلًا للإصدار.

مثال:

interpretation_version = 1

وعند إعادة تصحيح سؤال:

interpretation_version = 2

هذا مهم لأن:

published assessment version
≠
measurement interpretation version

ولكن كلاهما يجب أن يكون pinable عند حساب session result.

---

## 18. Pinned scoring integrity

الجلسة المكتملة يجب أن يمكن إثبات:

- assessment_type_id
- assessment_version
- interpretation_version
- scoring_engine_version

وبذلك يصبح من الممكن معرفة أي نموذج أنتج النتيجة.

هذا يتكامل مع foundation الحالية التي تثبت assessment version داخل session.

---

## 19. Implementation-facing Type Shape

الشكل المنطقي:

ResponseInterpretation {
  assessmentTypeId
  questionCode
  optionId
  optionIndex
  semanticStateKey
  measurementType
  primaryConstruct
  component
  measurementLayer
  direction
  scoreMode
  anchorScaleId
  anchorScore
  scoreEligible
  secondaryComponents[]
  criticality
  consistencyRole
  evidenceRole
  contextRequired
  scoringRationale
  interpretationVersion
}

وليس:

Option {
  value
}

فقط.

---

## 20. Safety / quality invariants

يجب أن تمنع طبقة interpretation:

1. option_index as score
2. option_value as universal score
3. automatic interpolation between arbitrary states
4. automatic penalty from trap metadata
5. automatic role imputation
6. missing → zero
7. context → linear rank
8. digital maturity → clinical outcome
9. measurement maturity → business outcome
10. criticality → arbitrary penalty

---

## 21. Gate before implementation

لا يتم تنفيذ schema/scorer production قبل أن يكون لكل option في الـ93:

- semanticStateKey
- measurementType
- primary construct
- component
- layer
- direction
- scoreMode
- score eligibility
- criticality
- context rule
- evidence role

وأن تكون هذه البيانات قابلة للمراجعة diff-by-diff.

**Production impact: documentation only.**
