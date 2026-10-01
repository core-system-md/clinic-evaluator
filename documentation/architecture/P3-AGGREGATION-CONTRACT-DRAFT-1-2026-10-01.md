# P3 — Aggregation Contract (Draft 1)

**التاريخ:** 2026-10-01  
**الحالة:** Draft / Design Input — غير معتمد  
**النطاق:** تصميم تجميع نتائج Item Measurement Registry عبر 93 بندًا و22 محورًا.

## 1. الهدف

تحديد ما الذي يدخل في درجة الأداء، وما الذي يبقى metadata/evidence/diagnostic، قبل إعادة بناء scorer الإنتاجي.

القاعدة الأساسية:

`response → anchor score (0/40/100) → item role → component → axis → overall`

لكن **ليست كل المعلومات المرتبطة بالبند Item Score قابلًا للجمع بنفس الطريقة**.

## 2. الطبقات الثلاث

### A. Performance measurement

يقيس ما إذا كانت الممارسة/القدرة التي يستهدفها السؤال موجودة وبالمستوى الذي تمثله الإجابة.

هذا هو المرشح الطبيعي للدخول في درجة component/axis.

### B. Measurement / evidence maturity

يقيس قدرة النظام على القياس أو التوثيق أو معرفة الأسباب أو متابعة النتائج.

لا يُحوَّل تلقائيًا إلى bonus/penalty على Performance. يمكن استخدامه كـ:
- درجة فرعية مستقلة؛
- coverage/evidence metadata؛
- أو مكوّن داخل construct إذا أثبت تعريف المحور أن القياس جزء منه.

### C. Consistency / diagnostic signal

يشمل trap signals، التناقضات، أو العلاقات بين إجابات متعددة.

لا يدخل في الدرجة الأساسية لمجرد اكتشافه. Detection منفصل عن effect.

## 3. قاعدة 0/40/100

المرساة الأصلية تبقى:

- `0` = أدنى حالة معرفة في نموذج القياس الأصلي.
- `40` = حالة وسطية/جزئية بحسب تعريف السؤال.
- `100` = أعلى حالة معرفة.

إذا احتوت الإجابات الظاهرة على قيم مثل:
- 0/0/40/100/100
- 0/40/40/100/100
- 0/0/40/40/100

فهذا لا يعتبر خطأً حسابيًا بحد ذاته.

كل خيار يحتفظ بهويته الدلالية، ثم يُحوَّل إلى مرساة القياس الأصلية. لذلك لا يجوز استخدام option index أو افتراض مسافات متساوية بين كل الحالات كبديل عن mapping الأصلي.

## 4. Missing ≠ 0

عدم الإجابة أو عدم انطباق البند لا يُسجل كأداء صفري.

لكل component/axis يجب حفظ:

- numerator / earned
- denominator / applicable maximum
- applicable item count
- missing item count
- coverage
- evidence availability عندما تكون ذات صلة

ولا يجوز إكمال الفراغات بمتوسط محاور أخرى.

## 5. Candidate aggregation rule

للبنود التي تم اعتمادها كـPerformance items:

`componentScore = Σ(itemScore × itemWeight) / Σ(applicable itemWeight)`

ثم:

`axisScore = Σ(componentScore × componentWeight) / Σ(applicable componentWeight)`

ولكن هذه **صيغة مرشحة وليست قرارًا نهائيًا**؛ يجب أولًا تحديد weights وcomponent boundaries.

إذا لم يوجد component منفصل، يمكن مؤقتًا أن يكون axis هو aggregation level المباشر للبنود.

## 6. Impact

`impact = high | medium | low`

لا يُفهم كتصحيح للإجابة ولا كبديل عن response mapping.

إذا بقي impact جزءًا من aggregation، فيجب تحويله إلى وزن موثق ومبرر في registry.

المرشح الحالي:

- high = 1.5
- medium = 1.0
- low = 0.5

وهذا **غير مجمد بعد**.

## 7. Evidence

Evidence level لا يغيّر score تلقائيًا.

مثال:
- Self-report
- Operational record
- Observed evidence

وجود evidence أقوى قد يرفع **confidence** في النتيجة، لكنه لا يحول إجابة 40 إلى 100 تلقائيًا.

## 8. Coverage

Coverage لا تُحوّل إلى penalty تلقائي.

يجب أن تنتج حالات صريحة مثل:

- `full`
- `partial`
- `insufficient`
- `not_applicable`

والقرار الخاص بالحد الأدنى المطلوب لكل محور لم يُحسم بعد.

## 9. Consistency

المرحلة الأولى المقترحة:

`answers → detect consistency rule → finding`

بدل:

`answers → detect → penalty`

أي أن اكتشاف تناقض لا يغيّر الأداء الأساسي إلا بعد وجود قاعدة منهجية صريحة وموافق عليها.

## 10. Unsupported roles / KPIs

لا يجوز تحويل غياب role أو KPI إلى صفر.

الحالات المقترحة:

- `available`
- `partial`
- `unavailable`

والـKPI لا يحسب إلا من roles/components التي تقيسها النسخة فعليًا، مع provenance يوضح المصدر.

## 11. Axis-level interpretation

درجة المحور يجب أن تمثل construct المحور، لا اسمًا تجميليًا له.

للمحاور المركبة يجب أولًا تحديد:

`items → sub-components → axis`

بدل إجبار جميع البنود على متوسط واحد.

## 12. Overall score

لا يُعتمد المتوسط الحالي آليًا كحقيقة نهائية.

قبل تثبيته يجب تحديد:
1. هل كل المحاور formative أم reflective أم mixed؟
2. هل أوزان المحاور تعكس أهمية business/measurement أم مجرد تصميم قديم؟
3. هل المحاور غير المتاحة تستبعد من المقام؟
4. هل توجد critical gates لا ينبغي اختزالها في المتوسط؟

## 13. Critical gates

Critical gate مفهوم منفصل عن الدرجة.

لا نضع أي gate حاليًا إلا إذا ثبت:
- construct الذي يحميه؛
- سبب أهميته؛
- trigger؛
- effect على interpretation؛
- وعدم ازدواج حسابه مع axis score.

## 14. Decision boundary

قبل تنفيذ scorer جديد، يجب حسم:
- item role لكل بند مشكوك فيه؛
- component boundaries للمحاور المركبة؛
- impact weights؛
- coverage states والحدود؛
- axis weighting؛
- treatment of critical gates؛
- role/KPI availability semantics.

**لا توجد تغييرات إنتاجية في هذه الوثيقة.**


## 15. Current-data finding: impact is currently neutral

فحص قاعدة البيانات الحالية للـ93 سؤالًا أظهر أن **جميع البنود تحمل `impact = medium`**.

وبالتالي فإن تحويل:
- high → 1.5
- medium → 1.0
- low → 0.5

لا ينتج أي تغيير فعلي في aggregation الحالية؛ فكل البنود تحصل على الوزن 1.0.

هذا يعني أن impact موجود كحقل تصميمي، لكنه **ليس حاليًا مصدر تمييز عددي بين البنود**.

لذلك لا ينبغي إدخال معاملات high/low في scorer الجديد لمجرد أن الحقل يسمح بها. يجب أولًا تحديد:
1. هل impact يمثل importance حقيقيًا؟
2. هل يمكن تبرير اختلاف الأهمية بين البنود؟
3. هل الأهمية تخص item أم component؟
4. هل weight يعكس أهمية القياس أم كثرة/سهولة ملاحظة ممارسة معينة؟

حتى يتم ذلك، المعالجة الأكثر شفافية في نموذج القياس هي اعتبار جميع البنود المتساوية في الوزن داخل المستوى نفسه، مع الاحتفاظ بحقل impact كـmetadata غير فعّال عدديًا.

## 16. Current-data finding: trap-option presence is not a scoring weight

وجود `is_trap=true` في خيارات عدد من البنود لا يعني أن هذه البنود يجب أن تحصل على وزن مختلف أو penalty.

يظل:
**option semantics → anchor score**

ثم يمكن استخدام العلاقة بين إجابات متعددة في:
**consistency detection**

وهذا يحافظ على فصل القياس عن التشخيص.
