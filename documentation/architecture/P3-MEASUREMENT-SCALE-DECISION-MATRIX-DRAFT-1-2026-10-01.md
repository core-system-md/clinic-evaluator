# P3 — Measurement Scale Decision Matrix — Draft 1

التاريخ: 2026-10-01
الحالة: Draft / Design Input — غير معتمد كتهيئة إنتاجية
الغرض: تحويل نتائج Item Semantic Scoring Spec وAxis Coherence Audit إلى قرار منهجي أولي حول صلاحية 0/40/100، دون تغيير الإنتاج.

## 1. الخلاصة التنفيذية
بعد مراجعة المواصفات الدلالية للأسئلة الـ93 وربطها بالمحاور والمكونات، لا يوجد دليل منهجي يبرر أحد القرارين المتطرفين:
- الإبقاء على 0/40/100 كقاعدة قياس عالمية.
- حذف 0/40/100 من النظام بالكامل.

النتيجة الأدق هي اعتماد طبقة تفسير للاستجابة Response Interpretation، ثم تحديد أهلية كل بند للدخول في القياس العددي.

القرار الحالي: 0/40/100 مرساة قياس صالحة عندما تمثل الحالات الثلاث construct واحدًا باتجاه واضح، لكنها ليست مقياسًا عامًا لكل الحالات.

## 2. تصنيف صلاحية المراسي
| الفئة | الوصف | التعامل مع 0/40/100 |
|---|---|---|
| S1 — Direct Ordinal | الحالات تمثل درجات متتابعة من نفس construct | يمكن الإبقاء على 0/40/100 |
| S2 — Ordinal + Semantic Layer | الحالات مرتبة، لكن بعضها يضيف digital/measurement/capability layer | يمكن الاحتفاظ بالمرساة داخل component مناسب، وليس كدرجة أداء موحدة |
| S3 — Mixed Construct | الإجابات تجمع أكثر من construct | لا يجوز جمعها مباشرة؛ تفصل إلى components أو أدوار قياس |
| S4 — Context/Variability | الحالة تعتمد على الطبيب/الحالة/الظرف | ليست درجة خطية بذاتها؛ تحفظ كـcontext/consistency signal |
| S5 — Evidence/Measurement | السؤال يقيس وجود القياس أو القدرة على معرفة النتيجة | يمكن استخدام 0/40/100 لقياس نضج القياس، لكنه لا يمثل النتيجة التي يتم قياسها |
| S6 — Critical | السؤال يتصل بالخصوصية/الفهم/استمرارية المعلومات | قد يحمل درجة، لكن criticality تبقى طبقة مستقلة عن المتوسط |
| S7 — Outcome Claim | السؤال يوحي بنتيجة مثل conversion/retention/LTV/CAC | يجب فصل capability عن observed outcome |

## 3. ما الذي أصبح واضحًا؟
### 3.1 المقياس صالح عندما تكون المسألة مستوى ممارسة واحدًا
أمثلة واضحة: وجود إجراء واضح ومنظم، متابعة منتظمة، وضوح الخطوة التالية، توحيد إجراء، إدارة التأخير، وضوح المسؤولية، واستمرار العملية تحت الضغط.
في هذه الحالات لا توجد حاجة لتغيير المرساة لمجرد أنها 0/40/100.

### 3.2 لا يمثل الرقم بالضرورة مسافة متساوية
في مسار مثل ممارسة يدوية ثم رقمنة أولية ثم نظام متكامل ثم أتمتة وتحليل ذكي، الحالات تمثل مراحل قدرة. لا يجوز افتراض أن المسافة بين كل مرحلة والأخرى متساوية.
هذا لا يجعل 0/40/100 خطأ؛ بل يجعله anchor coding أكثر من كونه interval scale.

### 3.3 بعض البنود تحتاج فصلًا لا إعادة ترقيم
وجود قياس conversion أو dashboard أو CAC أو LTV أو أسباب عدم البدء يقيس Measurement/Evidence Maturity. حصول البند على 100 يعني نضج القياس، وليس أن النتيجة المقاسة مرتفعة.

### 3.4 بعض الحالات ليست درجات أصلًا
عبارات مثل حسب الحالة، حسب الطبيب، حسب مقدم الخدمة، أو حسب نوع العلاج لا يمكن ترتيبها رياضيًا من الرقم وحده. يجب أن يستطيع النموذج حفظ context_required أو variability_signal.

## 4. قاعدة تفسير الخيار
لا ينبغي أن يكون المسار option_value إلى score مباشرة.
المسار المقترح هو:
selected_option → response_interpretation → construct-specific score

ويجب أن تحتفظ الاستجابة المفسرة على الأقل بـ:
- measurement_type
- primary_construct
- secondary_constructs
- direction
- anchor_score
- semantic_role
- digital_role
- business_role
- evidence_role
- criticality
- context_required
- consistency_signal

## 5. قرار أولي حسب عائلة القياس
### Practice / Process Maturity
أقرب عائلة للاستخدام المباشر لـ0/40/100. القرار: يمكن الاستمرار بالمرساة بشرط تعريف construct وعدم خلطه بطبقات أخرى.

### Digital / Automation Maturity
يمكن الاحتفاظ بالمرساة، لكن يجب ألا تتحول تلقائيًا إلى جودة خدمة. يمكن أن تكون Digital Capability مستقلة أو component داخل محور مناسب.

### Measurement / Evidence Maturity
يمكن استخدام 0/40/100 لقياس نضج القياس، لكن لا يجوز تحويله إلى نتيجة الأداء الذي يتم قياسه.

### Clinical / Professional Communication
بعض البنود مناسبة جدًا للمرساة، بينما البنود السياقية تحتاج تفسيرًا خاصًا. القرار: استخدام انتقائي، وليس إعادة ترقيم شاملة.

### Critical / Safety / Privacy
يمكن أن تحمل قيمة عددية، لكن لا ينبغي أن تختفي داخل المتوسط. القرار: score + criticality layer مع دراسة gates لاحقًا.

### Business / Strategic
CAC وLTV وconversion وreferral وretention وgrowth أهداف مشروعة ضمن MD Code، لكنها ليست كلها outcomes فعلية. يجب فصل business capability/measurement maturity عن observed business outcome.

## 6. ماذا عن 0/0/40/100/100؟
هذه الأنماط لا ينبغي اعتبارها خطأ.
الخيار يحتفظ بهويته الدلالية، ثم يحدد registry معنى الحالة وهل هي مستوى جديد من نفس construct، أو إضافة digital capability، أو measurement maturity، أو حالة سياقية.
قد تتحول حالتان مختلفتان إلى نفس anchor score مع بقاء option identity محفوظة.

## 7. اختبار استبدال 0/40/100 بالكامل
استبدالها الآن بسلم 0/50/100 لن يحل مشكلة الأسئلة متعددة الأبعاد، أو الحالات السياقية، أو الخلط بين measurement وoutcome، أو digital maturity مقابل service quality، أو criticality.
إذن تغيير الأرقام وحدها لا يعالج أصل المشكلة.

## 8. اختبار الإبقاء عليها عالميًا
الإبقاء عليها كقاعدة عالمية سيحوّل بعض capability stages إلى مسافة رقمية مصطنعة، ويخلط measurement maturity مع performance، ويجبر الحالات السياقية على درجات، ويخفي critical signals داخل المتوسط.
إذن الإبقاء العالمي أيضًا غير صحيح.

## 9. القرار المنهجي الحالي
| القرار | الحالة |
|---|---|
| Universal 0/40/100 | مرفوض |
| Universal replacement scale | غير مبرر |
| Contextual/construct-specific anchors | الاتجاه المدعوم حاليًا |
| Response Interpretation Layer | ضرورية قبل scorer الجديد |
| Production implementation | موقوفة حتى اكتمال تصميم construct/aggregation |

## 10. البحث التالي
قبل الحسم النهائي للأرقام، يجب اختبار:
1. Construct-to-Component Mapping للمحاور المختلطة.
2. Aggregation validity: هل المتوسط المرجح صالح داخل كل construct/component؟
3. Sensitivity analysis على المراسي: هل تغيير anchor mapping يغير النتائج بطريقة مفهومة ومبررة، أم أن اختلاف construct هو العامل المسيطر؟

بعد هذه الاختبارات يمكن اتخاذ قرار نهائي بشأن الإبقاء على 0/40/100 في مواضعه، أو تعديل مراسٍ لبنود محددة، أو إنشاء أكثر من نوع scoring model داخل scorer واحد.

## 11. حدود الوثيقة
لا تعتمد هذه الوثيقة أوزانًا جديدة، ولا تغير الأسئلة أو الإجابات، ولا تعدل scorer الإنتاجي، ولا تنشئ penalties أو KPI thresholds أو economic formulas.

Production impact: documentation only.