# P3 — Axis Sub-component Map (Draft 1)

**التاريخ:** 2026-10-01  
**الحالة:** Draft / Design Input — غير معتمد  
**الغرض:** تحويل نتائج coherence audit إلى مكونات مفهومية قابلة للمراجعة قبل تقرير طريقة تجميع المحور.  

## قاعدة الاستخدام

هذه الخريطة لا تعني أن كل sub-component سيصبح درجة مستقلة في المنتج. هي وسيلة لاختبار سؤال واحد: **هل تجميع البنود داخل المحور يحدث بعد تعريف علاقة واضحة بين constructs الفرعية؟**

كما أنها لا تغير النصوص ولا ترميز 0/40/100، ولا تضيف عقوبات، ولا تعدل الأوزان.

## 1. Candidate sub-components

| Assessment | Axis | Sub-component | البنود | ما يقيسه | ملاحظة |
|---|---|---|---|---|---|
| clinic-performance | A2 | A2-ENG — قدرة التواصل والتعامل مع الاستفسار | `Q4` | الممارسة التواصلية المباشرة في التسعير. | |
| clinic-performance | A2 | A2-MEASURE — قياس التحويل | `Q5` | وجود ونضج نظام قياس تحويل الاستفسارات إلى مواعيد. | |
| clinic-performance | A2 | A2-ENABLE — بناء قدرة الفريق | `Q6` | التدريب ونظام تطوير القدرة البشرية. | |
| clinic-performance | A3 | A3-RECOVER — استعادة المرضى | `Q7` | إدارة no-show. | |
| clinic-performance | A3 | A3-MEASURE — قياس الأداء | `Q8` | أدوات القياس العامة للعيادة. | |
| clinic-performance | A3 | A3-RETENTION — العودة والإحالة | `Q9` | برامج العودة والولاء والإحالة. | |
| admin-reception-assessment | AX85a6e9 | AX85-FLOW — التدفق والجدولة | `Qaf9f02`, `Qa60da0`, `Q386668` | تنظيم الجدول وإدارة التأخير. | |
| admin-reception-assessment | AX85a6e9 | AX85-RECOVERY — استعادة الموعد/المريض | `Q9a86a8` | التعامل مع عدم الحضور وإعادة الحجز. | |
| medical-team-assessment | A2 | A2-PRIVACY — حماية الخصوصية | `Q6c6668` | ممارسة الخصوصية واتساقها. | |
| medical-team-assessment | A2 | A2-COMPLAINT — معالجة الملاحظات والشكاوى | `Q76b7ab` | آلية التعامل مع الشكاوى والتحسين. | |
| medical-team-assessment | A2 | A2-RESILIENCE — ثبات الخدمة تحت الضغط | `Q8e7ea4` | مرونة الأداء عند الازدحام؛ construct تشغيلي أكثر من كونه سلوكًا مهنيًا خالصًا. | |
| comprehensive-clinic-assessment | AX2572cc | AX257-GOV — الحوكمة والتوثيق | `Q16bab1`, `Q9e24da`, `Q0635c9` | خصوصية، توثيق، شكاوى. | |
| comprehensive-clinic-assessment | AX2572cc | AX257-COORD — التنسيق والاستمرارية | `Q3eb854`, `Q49536a` | تبادل المعلومات واستمرارية التشغيل عند غياب عضو. | |
| comprehensive-clinic-assessment | AX80c09a | AX80-DECIDE — دعم القرار والثقة | `Q52ce1e`, `Q1f41c6` | شرح الخطة والتعامل مع التردد. | |
| comprehensive-clinic-assessment | AX80c09a | AX80-RECOVER — متابعة من لم يبدأ العلاج | `Qd46862`, `Qf2d077` | متابعة الحالات غير المبادرة وتحديد المسؤول. | |
| comprehensive-clinic-assessment | AX80c09a | AX80-LEARN — قياس أسباب وأثر عدم البدء | `Q12f297`, `Q366f3b`, `Qd07489` | تسجيل الأسباب وقياس أثر المتابعة وإمكانية معرفة الأسباب. | |
| comprehensive-clinic-assessment | AXaadfb4 | AXAAD-SCHEDULE — الجدولة والتأخير | `Q6b69ff`, `Q4a30d9`, `Q0f8102`, `Q96e7e9` | تصميم السياسة وتطبيقها وإدارة التأخير. | |
| comprehensive-clinic-assessment | AXaadfb4 | AXAAD-RESILIENCE — الضغط التشغيلي والتحسين | `Q8c90a0`, `Q320d3c` | الأداء تحت الضغط ومراجعة أسباب التأخير. | |
| comprehensive-clinic-assessment | AXaadfb4 | AXAAD-INFO — إدارة المعلومات | `Q48ff74` | إدارة البيانات والملفات؛ يقع على حد records governance. | |
| comprehensive-clinic-assessment | AX6a52b4 | AX6-CARE — المتابعة واستمرارية الرعاية | `Q28dc45`, `Q63167e` | متابعة المرضى وتوافر المعلومات. | |
| comprehensive-clinic-assessment | AX6a52b4 | AX6-MEASURE — قياس الاحتفاظ والتحسين | `Q005f38`, `Qc324ce`, `Qc28969` | قياس العودة وتحليل عدم العودة وأثر التحسينات. | |
| medical-team-assessment | A1 | A1-COMM — شرح وفهم ودعم القرار | `Q8b0866`, `Q03dc5a`, `Q0a8cea` | التواصل المباشر وفهم المريض ومعالجة التردد. | |
| medical-team-assessment | A1 | A1-RECHECK — إعادة الشرح/جودة التتبع | `Q2c9f29` | بند ذو صياغة معكوسة وحالة عدم التتبع؛ يجب ألا يساوي تلقائيًا بين غياب القياس وضعف التواصل. | |

## 2. أهم الاستنتاجات

- `clinic-performance/A2` و`A3` لا يجمعان فقط ممارسات التواصل/الاحتفاظ؛ يحتويان صراحةً على طبقات **practice + enablement/measurement**.
- `comprehensive/AX2572cc` يمكن قراءته كفريق طبي إذا عُرّف المقصود كحوكمة واعتمادية الفريق، لكن «الخصوصية» و«التوثيق» و«الشكاوى» لا تصبح construct واحدًا لمجرد أنها تحت عنوان الفريق.
- `comprehensive/AX80c09a` هو أوضح مثال على الحاجة إلى فصل مسار **دعم القرار** عن مسار **المتابعة/التعلم من حالات عدم البدء** قبل جمعهما في رقم واحد.
- `comprehensive/AXaadfb4` يحتفظ بقلب تشغيلي واضح، بينما إدارة المعلومات هي العنصر الحدّي.
- `medical-team/A1` متماسك، لكن `Q2c9f29` يجب أن يبقى بندًا خاصًا لأن «لا يتم تتبع هذا الأمر» ليست مساوية منطقيًا لضعف التواصل.
- `medical-team/A2` يحتاج على الأرجح إعادة تعريف للمحور أكثر من مجرد تغيير معادلة؛ سؤال الخدمة تحت الضغط لا ينتمي تلقائيًا إلى نفس construct الخصوصية والشكاوى.

## 3. ما الذي لا ينبغي فعله

- لا نمنح sub-components أوزانًا جديدة الآن.
- لا نحول عدد البنود إلى وزن دلالي.
- لا نعاقب measurement items لأنها measurement items.
- لا نعيد توزيع البنود إلى محاور أخرى لمجرد تحسين شكل الأرقام.
- لا نعتبر ترميز 0/0/40/100/100 أو 0/40/100/40 خطأً حسابيًا بحد ذاته؛ الهوية الدلالية للخيار محفوظة وتتحول إلى المرساة الأصلية.

## 4. Gate قبل تصميم aggregation

القرار المنهجي التالي هو تحديد أي من المحاور التالية يحتاج sub-component aggregation فعليًا، وأيها يكفي فيه تعريف construct جامع واضح:  
**A2/A3 في clinic-performance؛ AX2572cc وAX80c09a وAXaadfb4 في comprehensive؛ A2 في medical-team؛ إضافةً إلى AX85a6e9 في admin-reception.**

حتى هذا الحسم، يبقى scorer الإنتاجي الحالي دون تعديل.
