# P3 — Construct → Component Mapping — Draft 1 — 2026-10-02

**التاريخ:** 2026-10-02  
**الحالة:** Draft / Design Input — غير معتمد كتهيئة إنتاجية  
**النطاق:** جميع الأسئلة الـ93 في الإصدارات المنشورة الحالية  
**الهدف:** نقل النظام من «السؤال ← قيمة رقمية ← محور» إلى «السؤال ← construct ← component ← طبقة قياس»، مع احترام توجيه المالك حول أهداف MD Code التجارية والتدريبية والاستشارية والتقنية.

---

## 1. القاعدة الحاكمة

MD Code هو نموذج متعدد الأهداف. لذلك لا يوجد ترتيب واحد يقول إن:

`Clinical > Operational > Digital > Business`

ولا العكس.

السؤال يُسند إلى **construct أساسي واحد** حتى لا يُحتسب مرتين دون مبرر، ويمكن أن يحمل **أدوارًا ثانوية** في أبعاد أخرى.

### طبقات القياس

| الرمز | الطبقة | المعنى |
|---|---|---|
| P | Practice / Performance | جودة ممارسة أو تنفيذ |
| M | Capability / Maturity | نضج القدرة أو النظام |
| E | Evidence / Measurement | نضج القياس والدليل والتعلم |
| C | Context / Variability | حالة تعتمد على السياق ولا تُرتب خطيًا تلقائيًا |
| X | Consistency | إشارة اتساق/تناقض عبر أكثر من بند |
| K | Criticality | حساسية خاصة مثل الخصوصية أو فهم العلاج |
| O | Outcome | نتيجة فعلية ملاحظة؛ لا توجد حاليًا طريقة كافية لإثباتها من معظم هذه البنود |

**قاعدة:** وجود `M` أو `E` لا يعني أن البند يقيس Outcome.

---

# 2. Taxonomy المقترح للمكونات

| ID | Component | المقصود |
|---|---|---|
| C01 | Clinical Communication & Trust | جودة التواصل المهني وبناء الثقة داخل العلاقة العلاجية |
| C02 | Understanding & Decision Support | التحقق من الفهم ودعم القرار الواعي والتعامل مع التردد |
| C03 | Privacy & Professional Conduct | الخصوصية والسلوك المهني والانضباط في الممارسة |
| C04 | Continuity & Follow-up | المتابعة والاستمرارية والانتقال بين مراحل الرحلة |
| C05 | Access, Scheduling & Flow | الوصول والمواعيد والتدفق وإدارة التأخير |
| C06 | Process Standardization | وجود إجراءات واضحة قابلة للتكرار والتدريب |
| C07 | Resilience & Team Coordination | استقرار الخدمة تحت الضغط وتكامل الفريق والأدوار |
| C08 | Data Governance & Information Continuity | إدارة البيانات وجودتها وإتاحتها واستمراريتها وحوكمتها |
| C09 | Digital Capability & Automation | الرقمنة والتكامل والأتمتة والتحسين التقني |
| C10 | Measurement, Evidence & Learning | القياس والمؤشرات والتحليل والتعلم المغلق الحلقة |
| C11 | Training & Capability Development | نضج التدريب والتطوير والممارسة التدريبية |
| C12 | Conversion & Consultative Commercial Process | التواصل التجاري الاستشاري وتحويل الاستفسار إلى خطوة عملية |
| C13 | Retention, Loyalty & Referral | الاستبقاء والعودة والإحالة وقيمة العلاقة |
| C14 | Business Analytics & Unit Economics | CAC/LTV والنمو وتحليل القيمة التجارية |
| C15 | Patient Experience & Feedback | تجربة المريض وقياس الانطباع والرضا والاستعداد للتوصية |
| C16 | Accountability & Governance | المسؤولية الواضحة، الحوكمة، المراجعة والتحسين الإداري |

هذه المكونات **ليست أوزانًا**، وليست محاور عرض نهائية بالضرورة.

---

# 3. admin-reception-assessment — 11 سؤالًا

| Item | Construct الأساسي | Component | Layer | Secondary |
|---|---|---|---|---|
| Qfdbbe8 — استقبال المريض | Reception process quality | C05 | P | C01, C13 |
| Qaf9f02 — تنظيم المواعيد اليومية | Scheduling/process maturity | C05 | M | C06, C09 |
| Q47b317 — إدارة البيانات والملفات | Data/process governance | C08 | M | C06, C09, C10 |
| Q25f133 — التنسيق بين الإدارة والفريق الطبي | Information coordination | C07 | M | C08, C09 |
| Qefa857 — استقبال المرضى الجدد | Onboarding/process design | C05 | P/M | C01, C13 |
| Qa60da0 — التأخيرات المفاجئة | Delay response control | C05 | P/M | C07 |
| Q0fea0b — الأخطاء الإدارية المتكررة | Closed-loop administrative improvement | C16 | E/M | C06, C10 |
| Qa5eb11 — غياب موظف إداري | Process resilience under absence | C07 | P/M | C06 |
| Qa6d3c0 — معرفة الخطوة التالية | Journey continuity clarity | C04 | P | C05, C01 |
| Q386668 — تأخر الطبيب | Operational delay management | C05 | P/M | C07 |
| Q9a86a8 — عدم حضور الموعد | No-show recovery | C04 | P/M | C13, C10, C09 |

**ملاحظة:** هذه العائلة تدعم بوضوح فصل «التنسيق الداخلي» و«التدفق التشغيلي» عن مجرد الانطباع الأول.

---

# 4. clinic-performance — 9 أسئلة

| Item | Construct الأساسي | Component | Layer | Secondary |
|---|---|---|---|---|
| Q1 — تسجيل وإدارة بيانات المرضى | Digital/technical system maturity | C09 | M | C08, C10, C14 |
| Q2 — متابعة ما بعد الزيارة | Follow-up system maturity | C04 | M | C09, C10, C13 |
| Q3 — حجز وجدولة المواعيد | Scheduling technology maturity | C09 | M | C05, C07 |
| Q4 — استفسارات التسعير | Operational + commercial communication system | C12 | M | C06, C09, C11, C14 |
| Q5 — قياس تحويل الاستفسارات | Conversion measurement maturity | C10 | E/M | C12, C14, C09 |
| Q6 — تدريب الاستقبال على التواصل والمكالمات | Training-system maturity | C11 | M | C12, C10, C06 |
| Q7 — No-Show | Recovery + predictive scheduling capability | C04 | M | C05, C09, C13 |
| Q8 — أدوات قياس ومتابعة الأداء | Performance-management measurement maturity | C10 | E/M | C09, C14, C16 |
| Q9 — العودة والإحالة | Retention/referral program maturity | C13 | M | C15, C14, C10 |

### تصحيح بنيوي مهم

Q8 **لا ينتمي دلاليًا إلى C13 Retention/Loyalty**.  
التحقق من قاعدة البيانات أكد أنه موجود حاليًا في `A3 — استدامة العلاقة مع المرضى`، لكنه ليس Trap. لذلك إعادة تموضعه إلى C10 هي تصحيح للمعنى البنيوي، وليس إنشاء Trap جديد.

---

# 5. medical-team-assessment — 12 سؤالًا

| Item | Construct الأساسي | Component | Layer | Secondary |
|---|---|---|---|---|
| Q8b0866 — شرح الخيارات العلاجية | Treatment communication quality | C01 | P | C02, K |
| Q03dc5a — التأكد من فهم المريض | Understanding verification | C02 | P | C01, C11, K |
| Q0a8cea — المريض المتردد أو القلق | Structured hesitation handling | C02 | P/M | C01, C11, X |
| Q2c9f29 — سبب إعادة شرح الخطة | Communication effectiveness + evidence gap | C01 | P/E | C02, C10, X, K |
| Q6c6668 — الخصوصية أثناء الزيارة | Privacy practice | C03 | P/K | C16, X |
| Q76b7ab — الشكاوى/الملاحظات | Feedback and improvement governance | C16 | E/M | C10, C03 |
| Q8e7ea4 — الضغط/الازدحام | Service resilience under pressure | C07 | P/M | C05, C03 |
| Q5893f3 — توثيق المعلومات والخطط | Documentation standardization | C08 | M | C03, C10 |
| Q4084c8 — المتابعة بعد بدء العلاج | Treatment follow-up process | C04 | P/M | C03, C10, C13, X |
| Qe603f6 — توفر المعلومات بعد أشهر | Information continuity | C08 | P/M | C04, C09, K |
| Q3f4ff0 — تبادل المعلومات مع الإدارة | Team/admin information coordination | C07 | M | C08, C09 |
| Qc4f161 — استمرار العمل عند غياب عضو | Team/process resilience | C07 | M | C06, C08 |

### ملاحظات منهجية

- «حسب الطبيب/الحالة/نوع العلاج» يُحفظ كـC/X وليس كدرجة خطية تلقائيًا.
- Q2c9f29 ليس سؤالًا عاديًا من ثلاثة مستويات: الخيار «لا يحدث غالبًا» يعبّر عن قلة الحاجة لإعادة الشرح، بينما «لا يتم تتبع الأمر» هو فجوة دليل/قياس. لذلك لا يجوز جمعهما فقط على رقم واحد.
- **تصحيح ترميزي مؤكد:** خيار «يعود المرضى غالبًا بأسئلة أساسية حول الخطة نفسها» يجب أن ينتقل من `0` إلى `40` عند إنشاء النسخة التصحيحية التالية.
- Q4084c8 يحتفظ بتمييز أن المتابعة قد تختلف حسب نوع العلاج والطبيب؛ هذا لا يساوي تلقائيًا جودة أقل، لكنه يصبح إشارة مشكلة عندما يناقض وجود نظام متابعة مؤسسي واضح.

---

# 6. comprehensive-clinic-assessment — 36 سؤالًا

| Item | Construct الأساسي | Component | Layer | Secondary |
|---|---|---|---|---|
| Q16bab1 — الخصوصية | Privacy governance | C03 | P/K | C16 |
| Q28dc45 — المتابعة | Follow-up process | C04 | P/M | C13 |
| Q52ce1e — شرح الخطة | Communication quality | C01 | P | C02, K |
| Q6b69ff — تنظيم الجدولة | Process maturity | C05 | M | C06, C09 |
| Q750408 — استقبال المريض | Onboarding/service process | C05 | P/M | C01, C13 |
| Qc4ac3d — قياس العودة/الاحتفاظ | Retention measurement maturity | C10 | E | C13 |
| Q1614ba — تسجيل أسباب عدم البدء | Non-starter measurement | C10 | E | C12, C14, C09 |
| Q1f41c6 — التعامل مع التردد | Hesitation/objection handling quality | C02 | P | C01, C11, C12 |
| Q36b062 — المتابعة/الاطمئنان | Follow-up regularity | C04 | P/M | C13 |
| Q4a30d9 — الاستمرارية/المتابعة | Process policy consistency | C06 | M | C04, X |
| Q63167e — توفر المعلومات | Information continuity | C08 | P/M | C04, C09, K, X |
| Q9e24da — توثيق المعلومات | Documentation standardization | C08 | M | C03, C10 |
| Q005f38 — قياس العودة | Measurement maturity | C10 | E | C13 |
| Q0635c9 — الشكاوى | Complaint-to-improvement process | C16 | E/M | C10, C03 |
| Q0f8102 — الاتساق في التنفيذ | Practice consistency | C06 | M/X | C07 |
| Qc1373b — الخطوة بعد الزيارة | Transition planning | C04 | P/M | C01, C13 |
| Qd46862 — متابعة المريض المتأخر | Recovery/follow-up process | C04 | P/M | C13, X |
| Qf3c0c2 — CAC | Acquisition-cost measurement | C14 | E/M | C10, C09 |
| Q12f297 — أسباب عدم بدء العلاج | Diagnostic/measurement capability | C10 | E | C12, C14, C09, X |
| Q3eb854 — تبادل المعلومات | Internal information exchange | C07 | M | C08, C09 |
| Q96e7e9 — التأخيرات المفاجئة | Delay-response process | C05 | P/M | C07, X |
| Qc324ce — قياس عدم العودة/الانسحاب | Retention-loss measurement | C10 | E | C13, C14 |
| Qc68879 — LTV | Lifetime-value measurement | C14 | E/M | C10, C13, C09 |
| Qf85e36 — No-Show recovery | Recovery process | C04 | P/M | C05, C09, C13 |
| Q49536a — استقرار العمليات | Operational resilience | C07 | P/M | C06 |
| Q8c90a0 — ضغط/ازدحام | Flow resilience | C07 | P/M | C05, C06 |
| Qac52f7 — قياس تجربة المريض | Experience measurement | C15 | E | C10, C13 |
| Qc28969 — قياس/متابعة الأداء | Management measurement | C10 | E/M | C14, C16 |
| Qe11d0f — المراجعة الدورية | Management review cadence | C16 | M/E | C10 |
| Qf2d077 — المسؤولية عن المتابعة | Accountability/ownership | C16 | M | C04, C07 |
| Q320d3c — تحليل أسباب التأخير | Root-cause learning | C10 | E | C05, C07 |
| Q366f3b — قياس أثر المتابعة | Follow-up effect measurement | C10 | E | C04, C13 |
| Qa5fe17 — التحسين المستمر | Closed-loop improvement | C10 | E/M | C16 |
| Q48ff74 — إدارة البيانات والملفات | Data governance | C08 | M | C09, C10, C16, K |
| Q9bbadf — feedback communication | Feedback loop maturity | C15 | E/M | C10, C16 |
| Qd07489 — الوصول إلى البيانات للتحليل | Analytical evidence accessibility | C10 | E/M | C08, C09, C14 |

### ملاحظات

- CAC وLTV هنا **قدرة قياس** وليسا قيمة مالية مثبتة.
- أسئلة القياس لا تدخل تلقائيًا في performance average بنفس طريقة بنود الممارسة.
- البنود ذات العلاقة بالخصوصية والبيانات الحساسة يمكن أن تحمل K مستقلًا.
- بنود الاتساق لا تتحول إلى penalty إلا بقاعدة Consistency منفصلة.

---

# 7. patient-journey — 25 سؤالًا

| Item | Construct الأساسي | Component | Layer | Secondary |
|---|---|---|---|---|
| Q1 — التواصل مع المهتم والسعر | Needs discovery | C12 | P | C01, C13 |
| Q2 — المتابعة بعد التواصل | Follow-up communication | C04 | P/M | C13, C09 |
| Q3 — بدء الحوار | Discovery/communication | C12 | P | C01 |
| Q4 — الاستجابة للرسائل | Access/next-step guidance | C05 | P/M | C04, C09 |
| Q5 — معرفة أسباب عدم الحجز | Conversion evidence maturity | C10 | E | C12, C14 |
| Q6 — الوصول إلى العيادة | Access enablement | C05 | P/M | C09, C13 |
| Q7 — التجربة الأولى | Patient onboarding | C05 | P | C01, C15 |
| Q8 — معلومات المريض قبل الزيارة | Information readiness | C08 | P/M | C01, C03, K |
| Q9 — تجاوز وقت الانتظار | Delay communication | C05 | P | C01, C15 |
| Q10 — الحفاظ على رضا المريض أثناء الانتظار | Transparency/experience | C15 | P | C05, C01 |
| Q11 — بداية المقابلة | Patient-centred consultation | C01 | P | C02 |
| Q12 — خصوصية الجلسة | Privacy practice | C03 | P/K | C01 |
| Q13 — ما يسمعه من خارج الغرفة | Acoustic confidentiality | C03 | P/K | C16 |
| Q14 — تقديم الخطة | Explanation quality | C01 | P | C02, C12 |
| Q15 — التحقق من الفهم | Teach-back/understanding | C02 | P/K | C01, C11 |
| Q16 — «أحتاج إلى التفكير» | Consultative hesitation handling | C02 | P | C12, C01 |
| Q17 — التردد رغم الاقتناع | Needs-based objection handling | C02 | P | C12, C11 |
| Q18 — عدم البدء حاليًا | Reason-based follow-up | C04 | P/M | C12, C13 |
| Q19 — الخطوة التالية | Transition clarity | C04 | P | C01, C13 |
| Q20 — العلاقة المستقبلية مع العيادة | Continuity relationship | C13 | P/M | C04, C15 |
| Q21 — الاطمئنان بعد الزيارة | Follow-up continuity | C04 | P/M | C13, C15 |
| Q22 — الغياب عن الموعد | No-show recovery | C04 | P/M | C05, C13 |
| Q23 — توقيت التواصل | Journey-timed follow-up | C04 | M | C09, C13 |
| Q24 — المرضى المنقطعون | Reactivation/personalization | C13 | P/M | C04, C14 |
| Q25 — معرفة سعادة المرضى واستعدادهم للتوصية | Experience/referral measurement | C15 | E | C13, C10 |

---

# 8. ماذا تكشف الخريطة عن المحاور الحالية؟

## 8.1 Clinic Performance
المحور الحالي A3 يجمع:
- No-Show recovery
- Performance measurement
- Retention/referral

هذه ليست construct واحدة.

**النتيجة:** يحتاج على الأقل إلى فصل C04 + C10 + C13.

## 8.2 Medical Team
بعض المحاور الحالية تجمع:
- Communication
- Privacy
- Complaint governance
- Resilience
- Documentation

وهذه ليست طبقة واحدة قابلة للمتوسط المباشر.

**النتيجة:** يلزم component model قبل أي overall average.

## 8.3 Comprehensive
النسخة الشاملة بالفعل تحتوي على أغلب مكونات MD Code، لكنها موزعة بحيث تتقاطع operational + measurement + business + clinical داخل بعض المحاور.

**النتيجة:** الأنسب أن يصبح المحور الحالي container/assessment section، بينما المكونات الداخلية تحمل المعنى الحقيقي للقياس.

## 8.4 Patient Journey
هذه العائلة أكثر تماسكًا لكنها ما زالت تحتوي على:
- communication
- privacy
- consultative selling
- continuity
- loyalty
- experience measurement

وهذا يؤكد أن «Patient Journey» يمكن أن يكون سياقًا رئيسيًا للتقييم دون أن يكون construct واحدًا لكل بنوده.

---

# 9. قاعدة منع الـDouble Counting

السؤال الواحد يملك:

- **Primary construct/component** = المكان الأساسي الذي تدخل فيه الدرجة.
- **Secondary roles** = metadata أو inputs مشتقة بحذر.
- **Criticality / Consistency** = طبقات مستقلة عندما تكون مطلوبة.

لا يجوز أن:
- تدخل درجة Q15 في communication score ثم decision score ثم overall بنفس الوزن وكأنها ثلاثة أسئلة مستقلة.
- يتحول Qc68879 إلى business outcome لمجرد أنه LTV.
- يتحول Q1 من Digital maturity إلى clinical quality تلقائيًا.
- يتحول Q25 من experience measurement إلى observed loyalty.

---

# 10. القاعدة الجديدة للعلاقة بين Capability وOutcome

### مثال 1 — Automation
وجود automation:
`Capability ↑`

لكن التنفيذ السيئ:
`Outcome` قد لا يتحسن.

### مثال 2 — Manual excellence
متابعة يدوية ممتازة:
`Practice ↑`

وقد تكون أفضل من automation ضعيفة التنفيذ.

### مثال 3 — Measurement
قياس CAC/LTV/conversion:
`Measurement maturity ↑`

لكن لا يثبت أن CAC منخفض أو LTV مرتفع أو conversion مرتفع.

### مثال 4 — Standardization
الاختلاف حسب الطبيب/الحالة:
ليس «سيئًا» تلقائيًا.
لكن إذا كان construct السؤال هو **وجود نظام مؤسسي قابل للتكرار**، يصبح الاختلاف نفسه إشارة فجوة في standardization.

---

# 11. علاقة 0/40/100 بالخريطة

بعد هذه المرحلة، لا توجد حاجة لاتخاذ قرار شامل مثل «استبدال 0/40/100».

الاختيار الصحيح يصبح محليًا:

### يسمح بالترميز المباشر
عندما تكون الحالات:
- construct واحدًا؛
- اتجاهها واضح؛
- ويمكن ترتيبها دون افتراضات إضافية.

### يسمح بالترميز لكن داخل component محدد
عندما تكون المراسي تصف maturity/capability وليس performance العام.

### لا يسمح بتحويل مباشر
عندما تكون الحالة:
- context-dependent؛
- evidence-only؛
- mixed construct؛
- أو outcome claim غير مثبت.

### قد تتساوى إجابتان في anchor
مع بقاء option identity منفصلة.

وهذا يفسر أنماطًا مثل:

`0/0/40/100/100`

دون اعتبارها data error.

---

# 12. تأثير توجيه المالك على «الأفضلية»

القيمة ليست في أن النظام «يثبت أن العيادة جيدة أو سيئة».

القيمة في أن النتيجة تكشف:
- أين توجد قدرة قابلة للتطوير.
- أين توجد فجوة في التدريب.
- أين يوجد ضعف في التنظيم والتكامل.
- أين يمكن أن يفيد التحول الرقمي أو الأتمتة.
- أين توجد فرصة لتطوير performance أو retention أو conversion.
- أين توجد فجوة قياس تمنع الإدارة من معرفة ما يحدث.
- وأين توجد إشارة تحتاج مراجعة أو استشارة.

**هذا يجعل assessment نتيجة تشخيصية مرتبطة بمسار MD Code التجاري والتدريبي والاستشاري، لا شهادة نظرية.**

---

# 13. قرارات لاحقة لازمة قبل scorer

هذه الخريطة لا تحسم بعد:

1. هل يكون لكل component score مستقل؟
2. كيف تجمع components داخل profile أو overall؟
3. هل بعض components تعرض كـmaturity فقط دون دخول overall؟
4. ما علاقة criticality بالنتيجة النهائية؟
5. متى تتحول consistency إلى warning فقط ومتى يمكن أن تؤثر عدديًا؟
6. كيف تُعرّف coverage لكل component؟
7. كيف تُشتق KPIs من components بدل role averages الحالية؟
8. كيف تُبنى economics من business/measurement components دون اختلاق outcome؟

---

## 14. حالة العمل

- 93/93 سؤالًا تم وضعه في construct/component map مبدئي.
- Q8 في clinic-performance تم تحديد خطأ وضعه الحالي.
- Q2c9f29: تصحيح الخيار الثالث إلى 40 تم تثبيته كتصحيح مطلوب لاحقًا.
- clinic Q3: تصحيح الخيار الثاني إلى 40 تم تثبيته كتصحيح مطلوب لاحقًا.
- Comprehensive سؤال إدارة البيانات/الملفات: تحسين صياغة محدود ما زال منفصلًا عن نموذج القياس.
- لا توجد تغييرات إنتاجية في scorer أو قاعدة البيانات ضمن هذه الوثيقة.

**Production impact: documentation only.**
