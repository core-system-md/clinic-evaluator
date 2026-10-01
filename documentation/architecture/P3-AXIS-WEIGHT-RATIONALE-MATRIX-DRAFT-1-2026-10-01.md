# P3 — Axis Weight Rationale Matrix
## التاريخ: 2026-10-01
## الحالة: Draft / Design Input — غير معتمد

> الهدف من هذه المصفوفة هو فصل **مصدر الوزن** عن **مبرر الوزن**. وجود وزن تاريخي معروف لا يعني أن المنهج الذي يفسره ما زال صحيحًا.

### مفتاح القراءة

- **الوزن الحالي:** القيمة المخزنة حاليًا بعد تحويل admin-reception إلى صيغة نسبية 0..1 للقراءة فقط.
- **خط الأساس المتساوي:** 1 / عدد المحاور في نفس التقييم، وليس اقتراحًا نهائيًا.
- **الانحراف:** الفرق بين الوزن الحالي وخط الأساس المتساوي.
- **حالة construct:** نتيجة coherence audit السابقة، وليست تقييمًا للنتيجة أو الأداء.
- **مبرر الوزن:** لا يوجد في المصدر الحالي rationale منهجي لكل رقم؛ الموجود هو provenance تاريخي.

## المصفوفة

| التقييم | المحور | construct الحالي | البنود | الوزن الحالي | خط أساس متساوٍ | الانحراف | الوزن الضمني/بند | حالة construct | حالة مبرر الوزن | المطلوب قبل التثبيت |
|---|---|---|---:|---:|---:|---:|---:|---|---|---|
| patient-journey | A1 التواصل والانطباع الأول | pre-booking engagement | 5 | 20% | 20% | 0 | 4.00% | BROAD-BUT-COHERENT | تاريخي فقط | إثبات لماذا 20% |
| patient-journey | A2 الوصول والأمان العاطفي | arrival/emotional safety | 5 | 15% | 20% | -5 | 3.00% | COHERENT | تاريخي فقط | إثبات أهمية 15% |
| patient-journey | A3 بناء الثقة داخل الاستشارة | consultation trust | 5 | 25% | 20% | +5 | 5.00% | COHERENT | تاريخي فقط | إثبات أهمية 25% |
| patient-journey | A4 الالتزام بالخطة العلاجية | treatment commitment | 5 | 25% | 20% | +5 | 5.00% | COHERENT | تاريخي فقط | إثبات أهمية 25% |
| patient-journey | A5 الاستمرارية والولاء | continuity management | 5 | 15% | 20% | -5 | 3.00% | BROAD-BUT-COHERENT | تاريخي فقط | إثبات أهمية 15% |
| clinic-performance | A1 نضج العمليات والإدارة | process maturity | 3 | 50% | 33.33% | +16.67 | 16.67% | COHERENT | تاريخي فقط | تبرير الهيمنة النسبية لـA1 |
| clinic-performance | A2 كفاءة التواصل مع المرضى | engagement + measurement + enablement | 3 | 30% | 33.33% | -3.33 | 10.00% | MIXED-REVIEW | تاريخي فقط | حسم construct قبل الوزن |
| clinic-performance | A3 استدامة العلاقة مع المرضى | recovery + measurement + retention | 3 | 20% | 33.33% | -13.33 | 6.67% | MIXED-REVIEW | تاريخي فقط | حسم construct قبل الوزن |
| medical-team-assessment | A1 التواصل الطبي وبناء الثقة | clinical communication | 4 | 35% | 25% | +10 | 8.75% | COHERENT-WITH-ITEM-EXCEPTION | تاريخي فقط | تبرير 35% ومعالجة Q2c9f29 |
| medical-team-assessment | A2 الاحترافية والسلوك المهني | professionalism + resilience | 3 | 30% | 25% | +5 | 10.00% | MIXED-REVIEW | تاريخي فقط | حسم حدود construct |
| medical-team-assessment | A3 الالتزام السريري والتنظيمي | documentation/continuity compliance | 3 | 20% | 25% | -5 | 6.67% | COHERENT | تاريخي فقط | إثبات أهمية 20% |
| medical-team-assessment | A4 التكامل والعمل الجماعي | teamwork/reliability | 2 | 15% | 25% | -10 | 7.50% | COHERENT-WITH-LOW-ITEM-COUNT | تاريخي فقط | فحص كفاية بندين قبل الوزن |
| admin-reception-assessment | AX765ca8 الاستقبال والانطباع الأول | front-desk entry experience | 3 | 25% | 25% | 0 | 8.33% | COHERENT | تاريخي فقط | إثبات لماذا 25% |
| admin-reception-assessment | AX85a6e9 إدارة المواعيد والتدفق | scheduling/flow + recovery | 4 | 35% | 25% | +10 | 8.75% | MIXED-REVIEW | تاريخي فقط | حسم Q9a86a8 ثم تبرير الوزن |
| admin-reception-assessment | AXa23fa3 الكفاءة الإدارية | administrative process control | 2 | 25% | 25% | 0 | 12.50% | COHERENT-WITH-LOW-ITEM-COUNT | تاريخي فقط | فحص كفاية بندين |
| admin-reception-assessment | AXc39190 التنسيق الداخلي | internal coordination | 2 | 15% | 25% | -10 | 7.50% | COHERENT | تاريخي فقط | إثبات أهمية 15% |
| comprehensive-clinic-assessment | AX6f5aa5 رحلة المريض | patient journey management | 7 | 20% | 16.67% | +3.33 | 2.86% | BROAD-BUT-COHERENT | تاريخي فقط | تعريف construct جامع قبل الوزن |
| comprehensive-clinic-assessment | AX80c09a التحويل للعلاج وبناء الثقة | treatment-start pathway | 7 | 20% | 16.67% | +3.33 | 2.86% | MIXED-REVIEW | تاريخي فقط | فصل decision/recovery/learning مفهوميًا |
| comprehensive-clinic-assessment | AXaadfb4 الإدارة والتشغيل | operations + information boundary | 7 | 20% | 16.67% | +3.33 | 2.86% | COHERENT-WITH-BOUNDARY | تاريخي فقط | حسم حدود إدارة المعلومات |
| comprehensive-clinic-assessment | AX2572cc الفريق الطبي | team governance/reliability candidate | 5 | 15% | 16.67% | -1.67 | 3.00% | MIXED-REVIEW | تاريخي فقط | حسم construct قبل الوزن |
| comprehensive-clinic-assessment | AX6a52b4 المتابعة والاحتفاظ بالمريض | continuity + retention + measurement | 5 | 15% | 16.67% | -1.67 | 3.00% | COHERENT-WITH-MEASUREMENT-LAYER | تاريخي فقط | فصل practice عن measurement |
| comprehensive-clinic-assessment | AX15afd8 النمو والاستدامة | economic/strategic sustainability | 5 | 10% | 16.67% | -6.67 | 2.00% | BROAD-BUT-COHERENT | تاريخي فقط | تعريف ما إذا كان outcome أم capability |

## 1. ما تثبته المصفوفة

### أ. لا توجد مشكلة «عدد الأسئلة = الوزن»
الأوزان الحالية لا تتبع عدد البنود بشكل مباشر. هذا مقصود على مستوى التصميم التاريخي، ويمكن أن يكون صحيحًا إذا كانت الأوزان تمثل أهمية بنيوية للمحاور.

### ب. يوجد تفاوت فعلي في التأثير
في `clinic-performance` يملك A1 نصف الوزن، مع ثلاثة بنود فقط؛ وبالتالي كل بند داخله يملك نظريًا نحو 16.67% من overall قبل أي طبقات أخرى. هذا يجعل سؤالًا واحدًا في A1 أكثر تأثيرًا من سؤال واحد في A3 بنحو 2.5 مرة.

في `admin-reception-assessment` محور AXa23fa3 يملك 25% مع بندين فقط؛ كل بند داخله يحمل نحو 12.5% من الإجمالي قبل أي طبقة أخرى.

هذه ليست أخطاء تلقائيًا؛ إنها **تبعات رياضية يجب أن تكون مقصودة ومبررة**.

### ج. أكبر فجوة منهجية ليست في الرقم نفسه
لا توجد في قاعدة البيانات الحالية خانة rationale للوزن، ولا يوجد مصدر يوضح لماذا مثلًا A1 في clinic-performance = 50% بدل 40% أو 33.33%، أو لماذا AX15afd8 في comprehensive = 10%.

إذًا الحالة الأدق لكل الأوزان:

**Historical candidate weight — provenance known, construct rationale not yet validated.**

## 2. ترتيب التحقيق الصحيح

لا ينبغي استخدام الوزن الحالي لإصلاح construct المختلط؛ والعكس صحيح.

الترتيب:

1. تعريف construct.
2. تثبيت حدود component عند الحاجة.
3. تحديد ما إذا كان المحور performance construct أم capability/evidence construct أم خليطًا يجب فصله.
4. بعد ذلك تحديد أهمية المحور مقارنة ببقية محاور التقييم.
5. ثم تثبيت الوزن وتوثيق rationale.
6. ثم اختبار حساسية overall للوزن.

## 3. اختبارات الحساسية المطلوبة لاحقًا

بعد تثبيت construct، يجب تشغيل deterministic sensitivity fixtures على الأقل بهذه المقارنات:

- الأوزان الحالية مقابل equal-axis baseline.
- تغيير وزن محور واحد مع الحفاظ على مجموع 1.00.
- حالة محور مرتفع ومحور منخفض.
- حالة تساوي كل المحاور.
- حالة نقص/عدم قابلية أحد المحاور للتقييم.

الهدف ليس اختيار «أفضل» وزن من الاختبارات الرياضية وحدها، بل كشف ما إذا كان الوزن يعطي تأثيرًا أكبر من الذي يقصده construct.

## 4. قرار P3 المطلوب من Owner

قبل اعتماد الأوزان الجديدة، يجب اختيار معنى الوزن على مستوى التقييم:

**A — Construct importance:** كل وزن يعبر عن أهمية حقيقية للمحور في overall.

**B — Equal axes:** كل محور متساوٍ افتراضيًا، وأي اختلاف يحتاج مبررًا واضحًا.

**C — Hierarchical/component:** بعض المحاور تحتاج مكونات داخلية قبل تحديد مساهمتها في overall.

هذا القرار لم يُحسم بعد، ولا يوجد في هذه المصفوفة اختيار نيابةً عن Owner.

## 5. عدم التنفيذ

هذه المصفوفة تحليلية فقط.

لا تعديل على:
- `axes.weight`
- `score-engine.ts`
- `kpi_mappings`
- `ev_mappings`
- نصوص الأسئلة أو الخيارات
- نتائج/جلسات تاريخية

حتى إغلاق قرار construct + weighting رسميًا.

## 6. الخلاصة

الأوزان الحالية لها أصل تاريخي موثق، لكنها ليست مدعومة حتى الآن بمبررات منهجية تفصيلية.

أكثر نقطة تحتاج انتباهًا هي **clinic-performance** لأن وزن A1 البالغ 50% مع ثلاثة بنود يجعل هذا المحور مهيمنًا نسبيًا على overall، بينما A3 عند 20% فقط. يجب أن يكون ذلك قرارًا دلاليًا صريحًا، لا مجرد بقايا من نموذج قديم.

أما **comprehensive** فالفروق بين الأوزان وخط الأساس المتساوي صغيرة نسبيًا، لكن مشكلة تعريف construct في عدة محاور يجب حلها قبل اعتبار الأوزان صالحة نهائيًا.

**الحالة الحالية: لا تغيير إنتاجي. القرار التالي: construct → component → weight rationale → sensitivity → scorer contract.**
