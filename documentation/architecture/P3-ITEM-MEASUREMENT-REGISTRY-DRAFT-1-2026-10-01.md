# P3 — Item Measurement Registry (Draft 1)

**التاريخ:** 2026-10-01  
**الحالة:** Draft / Design Input — غير معتمد كتهيئة إنتاجية  
**النطاق:** 93 سؤالًا في الإصدارات المنشورة الحالية  
**الغرض:** ربط نص كل بند بالمعنى القياسي الذي سيعتمد عليه محرك القياس قبل تنفيذ أي إعادة بناء للمصحح.

## 1. قاعدة القياس التي تم تثبيتها في هذه المسودة

المقياس الأصلي **0 / 40 / 100** هو مرجع القياس الحالي، وليس خطأً يجب استبداله تلقائيًا. لذلك فإن وجود ترميزات مثل **0/0/40/100/100** أو **0/40/100/40** أو **100/40/0/0** يمثل حالات عرض متعددة مرتبطة بالمراسي الأصلية، ولا يُفسَّر كخلل حسابي بمجرد تكرار القيمة.  

يجب حفظ **هوية الحالة المختارة (option index + option id/label)** منفصلة عن **anchor score**. هذا يسمح للنظام بالاحتفاظ بالفروق الدلالية بين حالتين تحصلان على المرساة العددية نفسها، بدل فقدانها عند التخزين.

**قاعدة مهمة:** عدم الإجابة = Missing، وليس 0. كذلك فإن «لا يتم القياس» أو «لا يتم التتبع» حالة دلالية حقيقية في بعض البنود، وقد تحمل مرساة 0 في المقياس الأصلي؛ لا يجوز دمجها مع عدم الإجابة.

## 2. Measurement Profiles

| Profile | Name | Interpretation | Anchor / transform | Type |
|---|---|---|---|---|
| MM-01 | ORD3-DIRECT | ثلاث حالات ظاهرة مرتبة، والمرساة الأصلية 0/40/100؛ الأعلى = أداء أفضل. | `0/40/100` | Ordinal capability/maturity |
| MM-02 | ORD5-ANCHORED-3 | خمس حالات ظاهرة، لكن الترميز العددي مقصود أن يعمل على ثلاث نقاط أصلية؛ الحالات الإضافية تشارك مرساة 0 أو 100. | `0/0/40/100/100` | Ordinal capability/maturity with presentation refinement |
| MM-03 | ORD3-FREQUENCY | ثلاث حالات لانتظام/استمرارية الممارسة؛ 0/40/100 هو ترميز المراسي الأصلية وليس نسبة كمية. | `0/40/100` | Ordinal frequency/regularity |
| MM-04 | ORD3-EVIDENCE | ثلاث حالات لنضج القياس/الدليل: غياب/تقديري → أساسي → منهجي/دقيق؛ قيمة 0 لا تعني أن «المعلومة منخفضة» بحد ذاتها بل أن مستوى القياس في هذا البند عند مرساة الصفر. | `0/40/100` | Ordinal evidence/measurement maturity |
| MM-05 | ORD4-CONDITIONAL | أربع حالات؛ بعضها ليس ترتيبًا خطيًا مستقلًا، بل حالة سياقية/تباين في التطبيق تشارك مرساة 40 أو 0. يجب تفسير القيمة من option identity لا من index. | `item-specific: 0/40/100/40 or 0/40/100/0` | Ordinal with conditional/variability state |
| MM-06 | ORD4-REVERSED | أربع حالات بصياغة معكوسة؛ الترتيب البصري ليس ترتيب الدرجة. التحويل الحالي يعكس جودة الأداء: 100/40/0/0. | `100/40/0/0` | Reverse-coded ordinal diagnostic |

## 3. Global registry rules

1. **Construct ≠ Axis:** المحور يجمع البنود؛ construct يحدد ما يقيسه البند فعليًا.  
2. **Direction:** افتراضيًا الأعلى = أداء أفضل؛ MM-06 حالات معكوسة صراحةً.  
3. **Impact:** جميع البنود حاليًا `medium` في قاعدة البيانات؛ هذا محفوظ كسياق حالي وليس قرارًا نهائيًا بإبقائه دون تحقق منهجي.  
4. **Evidence:** هذه البنود تقيس self-report؛ عبارة auditable تعني أن الادعاء يمكن لاحقًا دعمه بسجل/نظام/ملاحظة، وليس أن التقييم الحالي قام بالتحقق الخارجي فعليًا.  
5. **Traps / consistency:** `is_trap` محفوظ كإشارة تشخيصية منفصلة عن المرساة العددية. لا تُستنتج عقوبة رقمية من هذه الراية داخل هذا السجل.  
6. **Coverage/applicability:** لا توجد حاليًا خيارات N/A صريحة في هذه الأسئلة؛ عدم الانطباق، إن لزم مستقبلاً، يجب أن تكون له حالة منفصلة عن 0.

## 4. Item Registry — 93 items

| # | Assessment | Item | Axis | Question (AR) | Construct | Measurement profile | Encoding | Direction | Evidence | Trap signal |
|---:|---|---|---|---|---|---|---|---|---|---|
| 1 | admin-reception-assessment | `Qfdbbe8` | `AX765ca8` | كيف يتم استقبال المرضى عند وصولهم؟ | الاستقبال عند الوصول | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | no |
| 2 | admin-reception-assessment | `Qaf9f02` | `AX85a6e9` | كيف يتم تنظيم المواعيد اليومية؟ | تنظيم الجدول اليومي | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | no |
| 3 | admin-reception-assessment | `Q47b317` | `AXa23fa3` | كيف تتم إدارة البيانات والملفات؟ | توحيد إدارة البيانات والملفات | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | no |
| 4 | admin-reception-assessment | `Q25f133` | `AXc39190` | كيف يتم التنسيق بين الإدارة والفريق الطبي؟ | آلية التنسيق بين الإدارة والفريق الطبي | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | no |
| 5 | admin-reception-assessment | `Qefa857` | `AX765ca8` | كيف يتم التعامل مع المرضى الجدد؟ | تصميم تجربة المريض الجديد | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | no |
| 6 | admin-reception-assessment | `Qa60da0` | `AX85a6e9` | كيف يتم التعامل مع التأخيرات المفاجئة؟ | إدارة التأخيرات المفاجئة | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | no |
| 7 | admin-reception-assessment | `Q0fea0b` | `AXa23fa3` | كيف يتم التعامل مع الأخطاء الإدارية المتكررة؟ | التعلم من الأخطاء الإدارية المتكررة | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | no |
| 8 | admin-reception-assessment | `Qa5eb11` | `AXc39190` | عند غياب أحد الموظفين الإداريين، كيف تتأثر العمليات؟ | استمرارية التشغيل عند غياب موظف | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | yes |
| 9 | admin-reception-assessment | `Qa6d3c0` | `AX765ca8` | هل يعرف المريض عادة الخطوة التالية بعد انتهاء كل مرحلة؟ | وضوح الخطوة التالية للمريض | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | yes |
| 10 | admin-reception-assessment | `Q386668` | `AX85a6e9` | إذا تأخر الطبيب 30 دقيقة، ماذا يحدث غالباً؟ | إدارة تأخر الطبيب وإعادة تنظيم الجدول | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | yes |
| 11 | admin-reception-assessment | `Q9a86a8` | `AX85a6e9` | كيف يتم التعامل مع المرضى الذين لم يحضروا الموعد؟ | استعادة المرضى بعد عدم الحضور | MM-03 | `0,40,100` | أعلى = أفضل | self-report; auditable process | no |
| 12 | clinic-performance | `Q1` | `A1` | ما آلية تسجيل وإدارة بيانات المرضى في عيادتك حالياً؟ | نضج تسجيل وإدارة بيانات المرضى | MM-02 | `0,0,40,100,100` | أعلى = أفضل | self-report; auditable system capability | no |
| 13 | clinic-performance | `Q2` | `A1` | ما منهجية المتابعة مع المرضى بعد انتهاء الزيارة؟ | نضج المتابعة بعد الزيارة | MM-02 | `0,0,40,100,100` | أعلى = أفضل | self-report; auditable process/system | no |
| 14 | clinic-performance | `Q3` | `A1` | بأي طريقة يتم حجز المواعيد وإدارة الجدولة في عيادتك؟ | نضج الحجز والجدولة | MM-02 | `0,0,40,100,100` | أعلى = أفضل | self-report; auditable system capability | no |
| 15 | clinic-performance | `Q4` | `A2` | ما الإطار المتبع لدى فريق الاستقبال عند التعامل مع استفسارات التسعير؟ | نضج إطار التواصل في التسعير | MM-02 | `0,0,40,100,100` | أعلى = أفضل | self-report; auditable process/system | no |
| 16 | clinic-performance | `Q5` | `A2` | ما آلية قياس تحويل الاستفسارات إلى مواعيد مؤكدة في عيادتك؟ | نضج قياس تحويل الاستفسارات إلى مواعيد | MM-04 | `0,0,40,100,100` | أعلى = أفضل | self-report; auditable measurement record | no |
| 17 | clinic-performance | `Q6` | `A2` | ما برنامج تدريب فريق الاستقبال على التواصل وإدارة المكالمات؟ | نضج تدريب الاستقبال والتواصل | MM-02 | `0,0,40,100,100` | أعلى = أفضل | self-report; auditable training process | no |
| 18 | clinic-performance | `Q7` | `A3` | ما الإجراء المتبع لحالات عدم حضور المواعيد (No-Show)؟ | نضج إدارة عدم الحضور | MM-02 | `0,0,40,100,100` | أعلى = أفضل | self-report; auditable process/system | no |
| 19 | clinic-performance | `Q8` | `A3` | ما أدوات قياس ومتابعة أداء العيادة المتاحة لديكم؟ | نضج أدوات قياس أداء العيادة | MM-04 | `0,0,40,100,100` | أعلى = أفضل | self-report; auditable measurement system | no |
| 20 | clinic-performance | `Q9` | `A3` | ما الآلية المتبعة لتشجيع المرضى الحاليين على العودة والإحالة؟ | نضج برامج العودة والإحالة | MM-02 | `0,0,40,100,100` | أعلى = أفضل | self-report; auditable program/process | no |
| 21 | medical-team-assessment | `Q8b0866` | `A1` | كيف يتم شرح الخيارات العلاجية للمريض؟ | شرح الخيارات العلاجية ومقارنة البدائل | MM-05 | `0,40,100,0` | أعلى = أفضل | self-report; potentially observable | no |
| 22 | medical-team-assessment | `Q03dc5a` | `A1` | كيف يتم التأكد من فهم المريض للخطة العلاجية؟ | التحقق من فهم المريض | MM-05 | `0,40,100,40` | أعلى = أفضل | self-report; potentially observable | no |
| 23 | medical-team-assessment | `Q0a8cea` | `A1` | كيف يتم التعامل مع المرضى المترددين أو القلقين تجاه العلاج؟ | التعامل المنظم مع التردد والقلق | MM-05 | `0,40,100,40` | أعلى = أفضل | self-report; potentially observable | no |
| 24 | medical-team-assessment | `Q2c9f29` | `A1` | ما السبب الأكثر شيوعاً لإعادة شرح الخطة العلاجية للمريض؟ | مؤشر الحاجة لإعادة شرح الخطة/قوة الفهم | MM-06 | `100,40,0,0` | أعلى = أفضل بعد عكس الصياغة | self-report; potentially observable | yes |
| 25 | medical-team-assessment | `Q6c6668` | `A2` | كيف يتم التعامل مع خصوصية المرضى أثناء الزيارة؟ | اتساق حماية الخصوصية | MM-05 | `0,40,100,40` | أعلى = أفضل | self-report; potentially observable/auditable | no |
| 26 | medical-team-assessment | `Q76b7ab` | `A2` | كيف يتم التعامل مع الشكاوى أو الملاحظات المتعلقة بالفريق الطبي؟ | منهجية معالجة الشكاوى والتحسين | MM-05 | `0,40,100,40` | أعلى = أفضل | self-report; auditable process | no |
| 27 | medical-team-assessment | `Q8e7ea4` | `A2` | عند حدوث ضغط أو ازدحام، كيف يتغير مستوى الخدمة المقدمة؟ | ثبات مستوى الخدمة تحت الضغط | MM-06 | `100,40,0,0` | أعلى = أفضل بعد عكس الصياغة | self-report; potentially observable | yes |
| 28 | medical-team-assessment | `Q5893f3` | `A3` | كيف يتم توثيق المعلومات والخطط العلاجية؟ | توحيد التوثيق والخطط العلاجية | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable record | no |
| 29 | medical-team-assessment | `Q4084c8` | `A3` | كيف يتم التعامل مع متابعة المرضى بعد بدء العلاج؟ | انتظام متابعة المرضى بعد بدء العلاج | MM-05 | `0,40,100,40` | أعلى = أفضل | self-report; auditable process | no |
| 30 | medical-team-assessment | `Qe603f6` | `A3` | إذا طلبت مراجعة حالة علاجية بعد عدة أشهر، هل تكون المعلومات متوفرة بسهولة؟ | قابلية استرجاع المعلومات العلاجية | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable record/system | yes |
| 31 | medical-team-assessment | `Q3f4ff0` | `A4` | كيف يتم تبادل المعلومات بين الفريق الطبي والإدارة؟ | ثبات تبادل المعلومات بين الإدارة والفريق الطبي | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | no |
| 32 | medical-team-assessment | `Qc4f161` | `A4` | عند غياب أحد أعضاء الفريق، كيف تستمر سير العمليات؟ | استمرارية التشغيل عند غياب أحد أعضاء الفريق | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | yes |
| 33 | comprehensive-clinic-assessment | `Q16bab1` | `AX2572cc` | كيف يتم التعامل مع خصوصية المرضى؟ | تطبيق الخصوصية بصورة ثابتة | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable/auditable | no |
| 34 | comprehensive-clinic-assessment | `Q28dc45` | `AX6a52b4` | كيف يتم متابعة المرضى بعد بدء العلاج؟ | وجود آلية متابعة بعد بدء العلاج | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | no |
| 35 | comprehensive-clinic-assessment | `Q52ce1e` | `AX80c09a` | كيف يتم شرح الخطة العلاجية للمريض؟ | شرح الخطة العلاجية والبدائل | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 36 | comprehensive-clinic-assessment | `Q6b69ff` | `AXaadfb4` | كيف يتم تنظيم المواعيد اليومية؟ | تنظيم المواعيد اليومية | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | no |
| 37 | comprehensive-clinic-assessment | `Q750408` | `AX6f5aa5` | كيف يتم استقبال المريض عند وصوله؟ | جودة استقبال المريض عند الوصول | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | no |
| 38 | comprehensive-clinic-assessment | `Qc4ac3d` | `AX15afd8` | هل يتم قياس الأداء المالي للعيادة؟ | قياس الأداء المالي دوريًا | MM-04 | `0,40,100` | أعلى = أفضل | self-report; auditable financial record | no |
| 39 | comprehensive-clinic-assessment | `Q1614ba` | `AX15afd8` | هل يتم تحليل مصادر النمو المحتملة؟ | تحليل مصادر النمو المحتملة | MM-04 | `0,40,100` | أعلى = أفضل | self-report; auditable analysis | no |
| 40 | comprehensive-clinic-assessment | `Q1f41c6` | `AX80c09a` | كيف يتم التعامل مع المرضى المترددين؟ | معالجة تردد المريض بشكل منظم | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 41 | comprehensive-clinic-assessment | `Q36b062` | `AX6f5aa5` | هل يتم توضيح مدة الانتظار المتوقعة؟ | وضوح زمن الانتظار المتوقع | MM-03 | `0,40,100` | أعلى = أفضل | self-report; auditable process | no |
| 42 | comprehensive-clinic-assessment | `Q4a30d9` | `AXaadfb4` | هل توجد سياسة واضحة للتأخير؟ | وجود سياسة واضحة للتأخير | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable policy | yes |
| 43 | comprehensive-clinic-assessment | `Q63167e` | `AX6a52b4` | هل تكون المعلومات متوفرة عند المراجعة لاحقاً؟ | توافر المعلومات عند المراجعة اللاحقة | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable record/system | yes |
| 44 | comprehensive-clinic-assessment | `Q9e24da` | `AX2572cc` | كيف يتم توثيق المعلومات؟ | توحيد توثيق المعلومات | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable record | no |
| 45 | comprehensive-clinic-assessment | `Q005f38` | `AX6a52b4` | هل يتم قياس معدل عودة المرضى؟ | قياس معدل عودة المرضى | MM-04 | `0,40,100` | أعلى = أفضل | self-report; auditable measurement record | yes |
| 46 | comprehensive-clinic-assessment | `Q0635c9` | `AX2572cc` | كيف يتم التعامل مع الشكاوى؟ | معالجة الشكاوى وآلية التحسين | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | no |
| 47 | comprehensive-clinic-assessment | `Q0f8102` | `AXaadfb4` | هل يتم تطبيق سياسة التأخير باستمرار؟ | ثبات تطبيق سياسة التأخير | MM-03 | `0,40,100` | أعلى = أفضل | self-report; auditable process | yes |
| 48 | comprehensive-clinic-assessment | `Qc1373b` | `AX6f5aa5` | كيف يتم إنهاء زيارة المريض؟ | إغلاق الزيارة مع خطوة تالية ومتابعة | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | no |
| 49 | comprehensive-clinic-assessment | `Qd46862` | `AX80c09a` | هل يتم متابعة المرضى الذين لم يبدأوا العلاج؟ | متابعة من لم يبدأ العلاج | MM-03 | `0,40,100` | أعلى = أفضل | self-report; auditable process | yes |
| 50 | comprehensive-clinic-assessment | `Qf3c0c2` | `AX15afd8` | هل يتم قياس تكلفة اكتساب مريض جديد؟ | قياس تكلفة اكتساب مريض جديد | MM-04 | `0,40,100` | أعلى = أفضل | self-report; auditable financial/marketing record | yes |
| 51 | comprehensive-clinic-assessment | `Q12f297` | `AX80c09a` | هل يتم تسجيل أسباب عدم بدء العلاج؟ | تسجيل أسباب عدم بدء العلاج | MM-04 | `0,40,100` | أعلى = أفضل | self-report; auditable record | yes |
| 52 | comprehensive-clinic-assessment | `Q3eb854` | `AX2572cc` | كيف يتم تبادل المعلومات بين الفريق والإدارة؟ | تبادل المعلومات بين الفريق والإدارة | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | no |
| 53 | comprehensive-clinic-assessment | `Q96e7e9` | `AXaadfb4` | ماذا يحدث عند تأخر الطبيب؟ | إدارة تأخر الطبيب | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | yes |
| 54 | comprehensive-clinic-assessment | `Qc324ce` | `AX6a52b4` | هل يتم تحليل أسباب عدم العودة؟ | تحليل أسباب عدم العودة | MM-04 | `0,40,100` | أعلى = أفضل | self-report; auditable analysis | yes |
| 55 | comprehensive-clinic-assessment | `Qc68879` | `AX15afd8` | هل يتم قياس قيمة المريض على المدى الطويل؟ | قياس قيمة المريض على المدى الطويل | MM-04 | `0,40,100` | أعلى = أفضل | self-report; auditable analytical record | yes |
| 56 | comprehensive-clinic-assessment | `Qf85e36` | `AX6f5aa5` | هل يتم متابعة المرضى الذين لم يحضروا الموعد؟ | متابعة المرضى الذين لم يحضروا الموعد | MM-03 | `0,40,100` | أعلى = أفضل | self-report; auditable process | yes |
| 57 | comprehensive-clinic-assessment | `Q49536a` | `AX2572cc` | عند غياب أحد أعضاء الفريق، كيف تستمر العمليات؟ | استمرارية العمليات عند غياب عضو الفريق | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable process | yes |
| 58 | comprehensive-clinic-assessment | `Q8c90a0` | `AXaadfb4` | ماذا يحدث عند زيادة الضغط؟ | إدارة الضغط التشغيلي | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | yes |
| 59 | comprehensive-clinic-assessment | `Qac52f7` | `AX6f5aa5` | هل يتم قياس رضا المرضى؟ | قياس رضا المرضى | MM-04 | `0,40,100` | أعلى = أفضل | self-report; auditable measurement record | yes |
| 60 | comprehensive-clinic-assessment | `Qc28969` | `AX6a52b4` | هل يتم قياس أثر التحسينات على الاحتفاظ؟ | قياس أثر التحسينات على الاحتفاظ | MM-04 | `0,40,100` | أعلى = أفضل | self-report; auditable analysis | yes |
| 61 | comprehensive-clinic-assessment | `Qe11d0f` | `AX15afd8` | هل يتم مراجعة الاستراتيجية بشكل دوري؟ | مراجعة الاستراتيجية بصورة منتظمة | MM-03 | `0,40,100` | أعلى = أفضل | self-report; auditable management process | yes |
| 62 | comprehensive-clinic-assessment | `Qf2d077` | `AX80c09a` | من المسؤول عن متابعة الحالات غير المبادرة؟ | تحديد مسؤول متابعة الحالات غير المبادرة | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable ownership/process | yes |
| 63 | comprehensive-clinic-assessment | `Q320d3c` | `AXaadfb4` | هل يتم مراجعة أسباب التأخير بشكل دوري؟ | مراجعة أسباب التأخير دوريًا | MM-04 | `0,40,100` | أعلى = أفضل | self-report; auditable analysis | yes |
| 64 | comprehensive-clinic-assessment | `Q366f3b` | `AX80c09a` | هل يتم قياس أثر المتابعة على بدء العلاج؟ | قياس أثر المتابعة على بدء العلاج | MM-04 | `0,40,100` | أعلى = أفضل | self-report; auditable analysis | yes |
| 65 | comprehensive-clinic-assessment | `Qa5fe17` | `AX6f5aa5` | هل تم تعديل أي إجراء بناء على نتائج الرضا؟ | تحويل نتائج الرضا إلى تعديل في الإجراءات | MM-03 | `0,40,100` | أعلى = أفضل | self-report; auditable improvement cycle | yes |
| 66 | comprehensive-clinic-assessment | `Q48ff74` | `AXaadfb4` | كيف يتم إدارة البيانات والملفات؟ | توحيد إدارة البيانات والملفات | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable record/process | no |
| 67 | comprehensive-clinic-assessment | `Q9bbadf` | `AX6f5aa5` | هل يتم إبلاغ الفريق بنتائج الرضا؟ | إبلاغ الفريق بنتائج الرضا | MM-03 | `0,40,100` | أعلى = أفضل | self-report; auditable communication process | yes |
| 68 | comprehensive-clinic-assessment | `Qd07489` | `AX80c09a` | هل يمكن معرفة أكثر أسباب عدم بدء العلاج بسهولة؟ | القدرة على معرفة أسباب عدم بدء العلاج | MM-04 | `0,40,100` | أعلى = أفضل | self-report; auditable analytical record | no |
| 69 | patient-journey | `Q1` | `A1` | عندما يرسل مريض عبر واتساب يسأل عن سعر إجراء معين، ما هو الأسلوب المعتمد للرد؟ | اكتشاف احتياج المريض قبل تقديم السعر | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 70 | patient-journey | `Q2` | `A1` | شخص استفسر عن الخدمة وأبدى اهتماماً لكنه لم يحجز موعداً، كيف يتم التعامل معه عادة؟ | متابعة الاستفسار غير المحجوز | MM-03 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 71 | patient-journey | `Q3` | `A1` | إذا راجعت آخر 10 محادثات جديدة في العيادة، ما الصيغة الأكثر تكراراً؟ | نمط بدء المحادثة: سعر مقابل فهم الحالة | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable sample/data | no |
| 72 | patient-journey | `Q4` | `A1` | كيف يتم التعامل مع المرضى الذين يتواصلون خارج أوقات الدوام؟ | إدارة التواصل خارج أوقات الدوام | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 73 | patient-journey | `Q5` | `A1` | إذا سألنا عن أسباب عدم حجز بعض الأشخاص بعد التواصل الأول، ما مدى وضوح الصورة لديكم؟ | وضوح أسباب عدم الحجز | MM-04 | `0,40,100` | أعلى = أفضل | self-report; auditable sample/data | no |
| 74 | patient-journey | `Q6` | `A2` | ما هي الطريقة المعتمدة لضمان وصول المريض الجديد إلى العيادة بسهولة؟ | تيسير وصول المريض الجديد | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 75 | patient-journey | `Q7` | `A2` | ما هي التجربة الأولى التي يمر بها المريض فور دخوله العيادة؟ | جودة التجربة الأولى عند الدخول | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 76 | patient-journey | `Q8` | `A2` | ما نوع المعلومات التي تكون متوفرة عادة عن المريض قبل دخوله للطبيب؟ | اكتمال معلومات المريض قبل الاستشارة | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 77 | patient-journey | `Q9` | `A2` | إذا تجاوز وقت الانتظار المتوقع، كيف يتم التعامل مع الموقف؟ | شفافية التأخير وخياراته | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 78 | patient-journey | `Q10` | `A2` | إذا اضطر المريض للانتظار لفترة أطول من المتوقع، ما الذي يساعد عادة في الحفاظ على رضاه؟ | إبقاء المريض مطلعًا أثناء الانتظار | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 79 | patient-journey | `Q11` | `A3` | كيف يبدأ الطبيب عادة الدقائق الأولى من المقابلة؟ | بداية الاستشارة وبناء الحوار | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 80 | patient-journey | `Q12` | `A3` | كيف يتم الحفاظ على خصوصية المريض أثناء الجلسة؟ | حماية الخصوصية أثناء الجلسة | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 81 | patient-journey | `Q13` | `A3` | إذا كان شخص يجلس خارج غرفة الكشف، ماذا يمكنه أن يسمع عادة؟ | العزل الصوتي/الخصوصية السمعية | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 82 | patient-journey | `Q14` | `A3` | كيف يتم تقديم الخطة العلاجية للمريض؟ | ترابط شرح المشكلة والحل والنتيجة | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 83 | patient-journey | `Q15` | `A3` | after شرح الخطة العلاجية، كيف يتأكد الطبيب عادة أن المريض أصبح قادراً على اتخاذ قرار واعٍ؟ | التحقق من الفهم بالـteach-back | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 84 | patient-journey | `Q16` | `A4` | إذا قال المريض: "أحتاج إلى التفكير بالأمر"، كيف يتم التعامل مع الموقف؟ | استكشاف سبب التردد قبل الحل | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 85 | patient-journey | `Q17` | `A4` | عندما يتردد المريض في البدء بالخطة العلاجية رغم اقتناعه المبدئي، كيف يتم التعامل مع الموقف؟ | تشخيص سبب التردد قبل التدخل | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 86 | patient-journey | `Q18` | `A4` | عندما يقرر المريض عدم البدء بالخطة العلاجية حالياً، كيف يتم التعامل مع الحالة؟ | متابعة قرار تأجيل البدء بناءً على السبب | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 87 | patient-journey | `Q19` | `A4` | قبل مغادرة المريض، كيف يتم التعامل مع الخطوة القادمة في رحلته العلاجية؟ | وضوح الخطوة التالية وموعدها | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 88 | patient-journey | `Q20` | `A4` | after انتهاء الزيارة، كيف ينظر المريض عادة إلى علاقته المستقبلية مع العيادة؟ | وضوح العلاقة العلاجية المستقبلية | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 89 | patient-journey | `Q21` | `A5` | كيف يتم الاطمئنان على المرضى بعد الزيارة أو الإجراء الطبي؟ | المتابعة بعد الزيارة/الإجراء | MM-03 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 90 | patient-journey | `Q22` | `A5` | إذا تغيب المريض عن موعده دون إشعار مسبق، ما الذي يحدث عادة؟ | استعادة المريض بعد عدم الحضور | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 91 | patient-journey | `Q23` | `A5` | إذا سألنا أحد المرضى: "كيف تأكدتم أن الوقت مناسب للتواصل معي اليوم؟" فما هو الجواب الأقرب للواقع؟ | توقيت المتابعة ضمن رحلة المريض | MM-01 | `0,40,100` | أعلى = أفضل | self-report; auditable sample/data | no |
| 92 | patient-journey | `Q24` | `A5` | كيف يتم التعامل مع المرضى الذين انقطعوا عن زيارة العيادة لفترة طويلة؟ | إعادة تنشيط المرضى المنقطعين بطريقة مرتبطة بالاحتياج | MM-01 | `0,40,100` | أعلى = أفضل | self-report; potentially observable | no |
| 93 | patient-journey | `Q25` | `A5` | كيف تعرف العيادة أن المرضى سعداء بتجربتهم ومستعدون للعودة أو التوصية بها؟ | قياس رضا المرضى واستعدادهم للعودة/التوصية | MM-04 | `0,40,100` | أعلى = أفضل | self-report; auditable sample/data | no |

**Registry count check:** 93 rows. Expected = 93.

## 5. Assessment-level interpretation

### admin-reception-assessment — 11 items
جميع البنود مبنية كـ3 حالات مباشرة 0/40/100. المعنى الغالب هو نضج الإجراء وتوحيد العمل والاستجابة المنظمة. بنود التأخير، الغياب، والخطوة التالية ليست «درجات سلوكية» مستقلة؛ هي مؤشرات لقدرة العملية على الاستمرار وإبقاء المريض ضمن المسار.

### clinic-performance — 9 items
كل سؤال يعرض 5 حالات، بينما قاعدة الترميز الحالية تعود إلى ثلاث مراسي: **0/0/40/100/100**. لذلك لا نعتبر تساوي بعض القيم خطأ. يجب أن يحتفظ السجل بالـ5 حالات كما هي، ويُحوّلها إلى مرساة القياس الأصلية عند حساب المحور.

### medical-team-assessment — 12 items
هنا تظهر الحالات التي تتطلب تفسيرًا بحسب **هوية الخيار** لا ترتيبه فقط. أربعة أسئلة تحمل حالة رابعة/بديلة مرتبطة بالتباين أو الاعتماد على مقدم الخدمة/الحالة، وسؤالان بصياغة معكوسة. لذلك لا يجوز للمصحح استعمال قاعدة «option_index × step».

### comprehensive-clinic-assessment — 36 items
جميع البنود تستخدم 0/40/100، مع وجود إشارات `is_trap` في عدد من البنود. مرساة القياس تبقى مستقلة عن آلية consistency؛ وجود trap signal لا يغير الدرجة إلا عبر قاعدة مستقلة يتم تعريفها واعتمادها لاحقًا.

### patient-journey — 25 items
جميع البنود تستخدم 0/40/100 مباشرة، وغالبها ordinal maturity/quality. بعض البنود تقيس قدرة العيادة على فهم أسباب عدم الحجز أو رضا المرضى؛ هذه أقرب إلى evidence maturity من كونها «جودة سلوكية» خالصة، لذلك صُنفت MM-04 حيث يلزم.

## 6. What this registry establishes / does not establish

**Established for next design step:**
- 0/40/100 هو المقياس المرجعي الأصلي المستخدم في الأسئلة الحالية.
- القيم المتكررة في السؤال متعدد الحالات ليست عيبًا تلقائيًا؛ هي mapping لمراسي القياس الأصلية.
- يجب فصل response state عن anchor score.
- يجب عدم تفسير option index كترتيب عددي إلا عندما يثبت ذلك دلاليًا.
- missingness وN/A حالات منفصلة عن anchor 0.
- consistency/trap detection منفصل عن item measurement.

**Not established yet:**
- أوزان جديدة لكل سؤال أو لكل محور.
- أي تحويل مستمر جديد غير 0/40/100.
- خصم عقوبات traps.
- عتبات Q1–Q4 الجديدة أو تعديلها.
- KPI coverage threshold.
- الصيغة الاقتصادية.
- أي تغيير في نصوص الأسئلة أو نصوص الإجابات.

## 7. Next methodological gate

قبل تنفيذ scorer جديد، يلزم مراجعة هذه الحالات خصوصًا: `MM-04` (القياس/الدليل)، `MM-05` (الحالة السياقية غير الخطية)، و`MM-06` (العكس). القرار المطلوب لاحقًا ليس «هل 0/40/100 صحيح أم خاطئ؟»؛ بل «هل هذه المراسي الثلاث تمثل بشكل كافٍ construct كل بند، وهل تجميع البنود داخل كل محور مبرر؟».

**Production impact of this commit:** documentation only. لا توجد هجرة قاعدة بيانات، ولا تغيير في scorer أو runtime behavior.
