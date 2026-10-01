# P3 — Item Scale Selection & Encoding Disposition — Draft 1
## التاريخ: 2026-10-02
## الحالة: Design Input / غير إنتاجي

## 1. الهدف

تحويل قرار المالك الأخير حول الانتقال الانتقائي من 0/40/100 إلى 0/30/50/80/100 إلى قرار منهجي على مستوى البند، مع الحفاظ على مبدأ:

selected option -> semantic interpretation -> construct-specific representation

هذه الوثيقة لا تغيّر نصوص الأسئلة أو الإجابات، ولا تغيّر scorer الإنتاجي.

---

## 2. النتيجة التنفيذية

بعد فحص بنية الخيارات الفعلية في قاعدة البيانات الحالية:

- admin-reception-assessment: 11 سؤالًا × 3 خيارات.
- clinic-performance: 9 أسئلة × 5 خيارات.
- medical-team-assessment: 12 سؤالًا، منها أسئلة بـ3 و4 خيارات.
- comprehensive-clinic-assessment: 36 سؤالًا × 3 خيارات.
- patient-journey: 25 سؤالًا × 3 خيارات.

النتيجة المنهجية الحالية:

| الفئة | العدد | القرار |
|---|---:|---|
| 3-state ordered anchors | 74 | الاحتفاظ بمرساة 0/40/100 عند صلاحيتها، داخل construct/component مناسب |
| 5-state maturity candidates | 9 | اعتماد 0/30/50/80/100 كمرشح تصميمي للاختبار، وليس كقاعدة أداء عامة |
| Context / non-monotonic / mixed response states | 10 | لا تحويل عددي مباشر؛ تحفظ semantic state + context/consistency/evidence role |

مهم: عدد الـ9 لا يعني أن 0/30/50/80/100 سيصبح «المقياس الجديد للنظام». بل هو مقياس مرشح لأسئلة clinic-performance التسعة لأن بنيتها نفسها تحتوي خمس حالات متتابعة في معظمها، ولأن هدفها الرئيسي maturity/capability أكثر من observed outcome.

---

## 3. الفئة الجديدة: 0/30/50/80/100

### 3.1 لماذا هذه المراسي؟

المعنى المقترح:

- 0 = غياب القدرة/النظام
- 30 = ممارسة أو قدرة أساسية
- 50 = قدرة منظمة جزئيًا
- 80 = نظام متكامل قابل للتشغيل والقياس
- 100 = قدرة متقدمة/محسّنة/مغلقة الحلقة

هذه المراسي semantic anchors وليست ادعاءً بأن الفواصل متساوية أو أنها مقياسًا سيكومتريًا مثبتًا.

### 3.2 clinic-performance — التسعة

كل سؤال من الأسئلة التالية يدخل هذه الفئة مبدئيًا، على أن يكون score الناتج مقياسًا للمكوّن الخاص به لا «جودة العيادة» مباشرة:

| Item | Component | Proposed anchors | Interpretation basis |
|---|---|---|---|
| Q1 | C09 Digital Capability + C08 Data Governance | 0/30/50/80/100 | من الورق → الجداول → برنامج أساسي → تكامل → نظام ذكي |
| Q2 | C04 Follow-up System Maturity | 0/30/50/80/100 | غياب النظام → متابعة يدوية → رسائل يدوية → أتمتة → أتمتة + تحليل + تحسين |
| Q3 | C09 Digital Scheduling Capability | 0/30/50/80/100 | هاتف → تسجيل إلكتروني بسيط → حجز إلكتروني → جدولة متكاملة → تحسين ذكي |
| Q4 | C12 Conversion/Commercial Process Capability | 0/30/50/80/100 | لا إطار → قائمة أسعار → قائمة + تدريب → سكريبت/CRM → نظام + تحليل تحويل |
| Q5 | C10 Measurement/Evidence Maturity | 0/30/50/80/100 | لا قياس → تقدير → تسجيل → تتبع رقمي → تحليل تفصيلي |
| Q6 | C11 Training-System Maturity | 0/30/50/80/100 | لا برنامج → تدريب تأسيسي → غير منتظم → برنامج مقنن → تدريب مستمر + ممارسة + أرقام |
| Q7 | C04 No-Show Recovery Maturity + C09 | 0/30/50/80/100 | لا إجراء → تسجيل → تذكير يدوي → أتمتة → تنبؤ + إعادة جدولة |
| Q8 | C10 Performance-Management Measurement Maturity | 0/30/50/80/100 | لا أدوات → مراجعة مالية → مؤشرات أساسية → KPIs → dashboard + أهداف + مراجعة |
| Q9 | C13 Retention/Referral System Maturity | 0/30/50/80/100 | لا برنامج → تذكير → ولاء → إحالة → منظومة متكاملة |

### 3.3 قيد حاسم

هذه المراسي لا تعني:

- Q1 = جودة البيانات.
- Q2 = جودة المتابعة البشرية.
- Q3 = انخفاض الـNo-Show.
- Q5 = ارتفاع conversion.
- Q7 = انخفاض الـNo-Show.
- Q8 = أداء جيد.
- Q9 = ولاء مرتفع.

بل تعني مستوى القدرة/النظام/النضج الذي يصفه الخيار.

Observed outcomes يجب أن تأتي من بيانات مستقلة عندما تكون متاحة.

---

## 4. الفئة 0/40/100

### 4.1 القرار

تظل 0/40/100 صالحة عندما تكون الخيارات الثلاثة تمثل مستويات مرتبة من construct واحد.

ويكون ذلك داخل component محدد، وليس بالضرورة في overall مباشرة.

### 4.2 التقييمات

#### admin-reception-assessment
جميع البنود الـ11 يمكن مبدئيًا إبقاء 0/40/100 في component الأساسي:

Qfdbbe8, Qaf9f02, Q47b317, Q25f133, Qefa857, Qa60da0, Q0fea0b, Qa5eb11, Qa6d3c0, Q386668, Q9a86a8.

#### comprehensive-clinic-assessment
البنود الـ36 تبقى مبدئيًا على 0/40/100 داخل construct/component المناسب.

سبب عدم الحاجة إلى خمسة مراسٍ هنا: السؤال نفسه غالبًا يقدم ثلاثة حالات دلالية واضحة، ولا توجد خمس response states يمكن إعادة ترميزها دون تعديل المحتوى.

#### patient-journey
23 من أصل 25 بندًا تبقى مبدئيًا على 0/40/100 داخل constructها.

الأمثلة القوية:
Q3, Q4, Q8, Q11, Q12, Q13, Q15, Q18, Q19, Q20, Q21, Q22, Q23, Q24, Q25.

---

## 5. الفئة غير القابلة للتحويل الخطي

### 5.1 medical-team-assessment

البنود التالية تتطلب semantic state مستقلًا:

- Q8b0866 — «حسب الطبيب/الحالة»
- Q03dc5a — «حسب خبرة مقدم الخدمة»
- Q0a8cea — «يختلف من مقدم خدمة لآخر»
- Q2c9f29 — حالات غير متوازية + evidence-gap state
- Q6c6668 — «حسب الحالة/المقدم»
- Q76b7ab — اختلاف المعالجة حسب نوع الشكوى
- Q8e7ea4 — «حسب عدد أفراد الفريق»
- Q4084c8 — اختلاف المتابعة حسب نوع العلاج والطبيب

هذه الحالات لا يجوز تحويلها إلى رقم أعلى أو أدنى لمجرد وجودها كخيار رابع.

### 5.2 patient-journey

البندان التاليان يحتاجان semantic handling قبل أي direct average:

- Q7 — حالات استقبال مختلفة نوعيًا وليست مراحل متتالية من construct واحد.
- Q10 — الضيافة، التفاعل، وإبقاء المريض على اطلاع تمثل آليات دعم مختلفة أكثر من كونها سلم نضج واحد.

سيتم حفظ option identity + semantic state، ويمكن اشتقاق مؤشرات فرعية عندما يكون construct واضحًا.

---

## 6. الاستثناء المهم: Q2c9f29

السؤال:

«ما السبب الأكثر شيوعاً لإعادة شرح الخطة العلاجية للمريض؟»

لا ينبغي أن تكون map ساذجة مثل:

0 -> 0
40 -> 40
100 -> 100
الخيار الرابع -> رقم إضافي

لأن السؤال يحتوي على:

- حالة تشير إلى عدم تكرار الحاجة للشرح.
- حالة تشير إلى حاجة بعض التفاصيل لتوضيح إضافي.
- حالة تشير إلى تكرار أسئلة أساسية.
- حالة «لا يتم تتبع هذا الأمر».

إذن لدينا هنا على الأقل:
- communication signal
- comprehension signal
- evidence gap

والخيار الثالث الذي حُسم سابقًا كـ40 يبقى تصحيحًا مطلوبًا في النسخة التصحيحية القادمة.

---

## 7. العلاقة بين semantic state والرقم

النموذج النهائي يجب أن يحتفظ بمستويين معًا:

### Semantic layer
يجيب:
«ماذا تعني هذه الإجابة؟»

### Numeric layer
يجيب:
«كيف ستُمثل هذه الحالة رقميًا داخل construct المحدد؟»

مثال:

clinic Q1 / option 4

semantic:
- advanced digital capability
- high automation
- integrated information flow

numeric:
- 100 داخل Digital Capability maturity

لكن:
- لا تضاف تلقائيًا 100 إلى Clinical Quality.
- لا تُعتبر Data Quality = 100 دون evidence مستقل.

---

## 8. Preliminary scoring family map

| Scoring family | Representation | Main use |
|---|---|---|
| Practice / Process | 0/40/100 أو semantic state | أداء الممارسة والتنفيذ |
| Maturity / Capability | 0/30/50/80/100 عندما توجد خمس حالات فعلية | تطور النظام والقدرة |
| Measurement / Evidence | 0/40/100 أو 0/30/50/80/100 حسب states | نضج القياس والأدلة |
| Context / Variability | semantic state | حسب الحالة/المقدم/الظرف |
| Critical | numeric + critical flag/gate candidate | لا يُختزل في average |
| Consistency | numeric input + separate signal | لا penalty تلقائي |
| Outcome | observed metric only | نتيجة فعلية من بيانات مستقلة |

---

## 9. Sensitivity analysis للترميز الحالي في clinic-performance

الترميز الحالي:

0 / 0 / 40 / 100 / 100

الترميز المقترح:

0 / 30 / 50 / 80 / 100

الفروقات حسب option index:

| Option index | Current | Proposed | Delta |
|---:|---:|---:|---:|
| 0 | 0 | 0 | 0 |
| 1 | 0 | 30 | +30 |
| 2 | 40 | 50 | +10 |
| 3 | 100 | 80 | -20 |
| 4 | 100 | 100 | 0 |

هذا يحقق هدفًا منهجيًا مهمًا: يمنع وضع option 1 وoption 3 تلقائيًا في نفس الطرف الرقمي عندما تمثل كل منهما مرحلة مختلفة من capability.

لكن هذا التحول سيغير النتائج الرقمية التاريخية لأي إجابات موجودة على هذه الأسئلة. لذلك لا يجوز إعادة كتابة نتائج تاريخية دون migration/recalculation policy واضحة.

### ملاحظة بيانات حالية

الفحص read-only لقاعدة الإنتاج أظهر أن جلسات clinic-performance الحالية لها score rows، لكن answers المرتبطة بالجلسات ليست موجودة في answers.session_id لهذه الجلسات. لذلك لا يوجد حاليًا أساس علائقي كامل لإجراء إعادة حساب تاريخية موثوقة من answer-level data لهذه العائلة.

هذا يعتبر forensic/data-retention limitation وليس دليلاً على أن النموذج المقترح أفضل بسبب البيانات التاريخية.

---

## 10. ما الذي أصبح محسومًا

1. لا يوجد universal scoring scale.
2. 0/40/100 لا يُحذف.
3. 0/30/50/80/100 أصبح مرشحًا مشروعًا عندما تكون هناك خمس response states فعلية تصف progression واضحًا.
4. clinic-performance هي أول عائلة واضحة لتطبيق هذا المبدأ على maturity/capability.
5. semantic state يبقى محفوظًا حتى عندما يوجد numeric anchor.
6. context-dependent responses لا تتحول إلى درجات خطية مصطنعة.
7. performance، maturity، measurement، digital capability، consistency، criticality، وoutcome ليست طبقة واحدة.
8. عدم وجود نظام يخفض النتيجة عندما يكون السؤال عن system capability؛ أما manual excellence فلا يخفض تلقائيًا.
9. critical issues لا تحتاج penalty رقمي اعتباطي.

---

## 11. ما يزال غير محسوم حسابيًا

لم يتم حتى الآن اعتماد:
- أوزان المكونات.
- طريقة بناء profile النهائي.
- طريقة اشتقاق overall composite الثانوي.
- حد أدنى للتغطية.
- طريقة التعامل مع missing داخل كل component.
- تحويل critical flags إلى gates.
- معادلة consistency.
- KPI derivation.
- economics model.
- thresholds/grades.

---

## 12. بوابة التنفيذ التالية

بعد هذا القرار، المرحلة التالية هي **Component Aggregation & Profile Construction**:

1. حساب score لكل component.
2. حساب coverage وevidence لكل component.
3. فصل performance عن maturity.
4. بناء profile متعدد الأبعاد.
5. تحديد هل وكيف يُسمح بوجود overall composite ثانوي.
6. اختبار sensitivity بين:
   - current legacy mapping
   - proposed semantic mapping
   - 0/30/50/80/100 maturity encoding
7. بناء migration/rollback contract قبل أي production change.

**Production impact: documentation only.**
