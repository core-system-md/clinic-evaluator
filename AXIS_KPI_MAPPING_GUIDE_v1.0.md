# CORE SYSTEM — دليل العلاقات بين المحاور والمؤشرات (Axis-KPI Mapping Guide)
## الإصدار: 2.0 | التاريخ: 2026-07-11 | الحالة: نهائي — جاهز للتنفيذ

---

## 1. نظرة عامة

هذا الملف يحدد:
- **أدوار المحاور** (Axis Roles): ما هو "الدور" الذي يلعبه كل محور في أي تقييم
- **المؤشرات التنفيذية** (Executive KPIs): كيف تُحسب من الأدوار — تظهر في **كل** التقييمات
- **المؤشرات الخاصة** (Assessment-Specific KPIs): تظهر فقط في تقييمات معينة
- **الأوزان**: نسبة مساهمة كل دور في كل مؤشر

**المبدأ:** المؤشرات لا تعرف أسماء المحاور (A1, AX85a6e9...) — بل تعرف **الأدوار** (TRUST, COMMUNICATION...).

---

## 2. أدوار المحاور (Axis Roles) — المعجم الكامل

| الدور | الاسم العربي | الوصف | نوع |
|-------|-------------|-------|-----|
| **TRUST** | بناء الثقة | العلاقة الأولية والمصداقية | طبي |
| **COMMUNICATION** | التواصل | جودة التواصل مع المريض | طبي |
| **CONVERSION** | التحويل | قبول الخطة العلاجية | طبي |
| **RETENTION** | الاستبقاء | العودة للمتابعة | طبي |
| **LOYALTY** | الولاء | التوصية بالعيادة | طبي |
| **SCHEDULING** | الجدولة | إدارة المواعيد والتدفق | إداري |
| **RECEPTION** | الاستقبال | الانطباع الأول والترحيب | إداري |
| **ADMIN** | الإدارة | الكفاءة الإدارية والتنظيم | إداري |
| **COORDINATION** | التنسيق | التنسيق الداخلي بين الأقسام | إداري |
| **JOURNEY** | الرحلة | تجربة المريض الكاملة | شامل |
| **OPERATIONS** | التشغيل | إدارة العمليات والبنية | شامل |
| **TEAM** | الفريق | أداء الفريق الطبي والتعاون | طبي |
| **GROWTH** | النمو | الاستدامة والتوسع المستقبلي | استراتيجي |
| **PROFESSIONALISM** | الاحترافية | السلوك المهني والأخلاق | طبي |
| **TEAMWORK** | العمل الجماعي | التكامل والتعاون بين الأعضاء | طبي |

---

## 3. المؤشرات التنفيذية (Executive KPIs) — تظهر في كل التقييمات

| المؤشر | الاسم الكامل | الاسم العربي | الوصف |
|--------|-------------|-------------|-------|
| **TFI** | Trust Formation Index | مؤشر بناء الثقة | عمق العلاقة الأولية والمصداقية |
| **TAP** | Treatment Acceptance Potential | مؤشر قبول العلاج | معدل التحويل من استشارة لعلاج |
| **PRP** | Patient Retention Potential | مؤشر الاستبقاء | القدرة على إعادة المريض |
| **PLI** | Patient Loyalty Index | مؤشر الولاء | معدل التوصية بالعيادة |
| **PSI** | Patient Satisfaction Index | مؤشر رضا المريض | الرضا عن النتيجة بعد العلاج |
| **NPI** | Net Promoter Index | مؤشر التوصية | هل سيُوصي المريض بالعيادة؟ |
| **EVI** | Experience Value Index | مؤشر قيمة التجربة | هل التجربة تستحق السعر المدفوع؟ |
| **TCI** | Treatment Confidence Index | مؤشر ثقة العلاج | القناعة بالخطة والطبيب |

**ملاحظة:** هذه المؤشرات الثمانية تظهر في **كل** التقييمات — حتى الاستقبال.

---

## 4. المؤشرات الخاصة (Assessment-Specific KPIs) — تظهر حسب التقييم

| المؤشر | الاسم الكامل | الاسم العربي | يظهر في | الوصف |
|--------|-------------|-------------|---------|-------|
| **RRI** | Reception Readiness Index | مؤشر جاهزية الاستقبال | الاستقبال فقط | هل الاستقبال يُحضر المريض نفسياً قبل الطبيب؟ |

**ملاحظة:** RRI لا يظهر في التقارير التنفيذية — بل في تقرير تقييم الاستقبال فقط.

---

## 5. خريطة المؤشرات التنفيذية (KPI Mapping) — الأوزان العالمية

هذه الأوزان **ثابتة** لكل التقييمات. لا تتغير عند إضافة تقييم جديد.

```json
{
  "TFI": {
    "TRUST": 0.40,
    "COMMUNICATION": 0.40,
    "RECEPTION": 0.20
  },
  "TAP": {
    "CONVERSION": 0.50,
    "RETENTION": 0.30,
    "SCHEDULING": 0.20
  },
  "PRP": {
    "RETENTION": 0.60,
    "SCHEDULING": 0.40
  },
  "PLI": {
    "LOYALTY": 0.50,
    "RECEPTION": 0.50
  },
  "PSI": {
    "COMMUNICATION": 0.20,
    "RECEPTION": 0.30,
    "ADMIN": 0.30,
    "COORDINATION": 0.20
  },
  "NPI": {
    "TRUST": 0.10,
    "LOYALTY": 0.40,
    "RECEPTION": 0.50
  },
  "EVI": {
    "COMMUNICATION": 0.20,
    "SCHEDULING": 0.30,
    "ADMIN": 0.30,
    "COORDINATION": 0.20
  },
  "TCI": {
    "CONVERSION": 0.30,
    "SCHEDULING": 0.40,
    "ADMIN": 0.30
  }
}
```

**قاعدة التحقق:** مجموع أوزان كل مؤشر = 1.00 (100%)

| المؤشر | المجموع | ✅ |
|--------|---------|---|
| TFI | 0.40 + 0.40 + 0.20 = 1.00 | ✅ |
| TAP | 0.50 + 0.30 + 0.20 = 1.00 | ✅ |
| PRP | 0.60 + 0.40 = 1.00 | ✅ |
| PLI | 0.50 + 0.50 = 1.00 | ✅ |
| PSI | 0.20 + 0.30 + 0.30 + 0.20 = 1.00 | ✅ |
| NPI | 0.10 + 0.40 + 0.50 = 1.00 | ✅ |
| EVI | 0.20 + 0.30 + 0.30 + 0.20 = 1.00 | ✅ |
| TCI | 0.30 + 0.40 + 0.30 = 1.00 | ✅ |

---

## 6. خريطة المؤشر الخاص (RRI Mapping)

```json
{
  "RRI": {
    "RECEPTION": 0.40,
    "SCHEDULING": 0.30,
    "ADMIN": 0.20,
    "COORDINATION": 0.10
  }
}
```

**الاستخدام:** يُضاف فقط إلى `kpi_mappings` لتقييمات الاستقبال.

---

## 7. خريطة القيمة الدائمة (EV Mapping) — الأوزان العالمية

```json
{
  "CONVERSION": 0.40,
  "RETENTION": 0.40,
  "LOYALTY": 0.20
}
```

**ملاحظة:** EV لا يحتاج كل الأدوار — فقط الأدوار المؤثرة مالياً.

---

## 8. ربط الأدوار بالمحاور لكل تقييم (Axis Roles per Assessment)

### 8.1 تقييم رحلة المريض (patient-journey)

| المحور (code) | الدور (role) | الوزن الأصلي |
|--------------|-------------|-------------|
| A1 | TRUST | 0.20 |
| A2 | COMMUNICATION | 0.15 |
| A3 | CONVERSION | 0.25 |
| A4 | RETENTION | 0.25 |
| A5 | LOYALTY | 0.15 |

```json
{
  "A1": "TRUST",
  "A2": "COMMUNICATION",
  "A3": "CONVERSION",
  "A4": "RETENTION",
  "A5": "LOYALTY"
}
```

---

### 8.2 تقييم أداء العيادة (clinic-performance)

| المحور (code) | الدور (role) | الوزن الأصلي |
|--------------|-------------|-------------|
| A1 | TRUST | 0.50 |
| A2 | COMMUNICATION | 0.30 |
| A3 | RETENTION | 0.20 |

```json
{
  "A1": "TRUST",
  "A2": "COMMUNICATION",
  "A3": "RETENTION"
}
```

---

### 8.3 تقييم الفريق الطبي (medical-team-assessment)

| المحور (code) | الدور (role) | الوزن الأصلي |
|--------------|-------------|-------------|
| A1 | TRUST | 0.35 |
| A2 | COMMUNICATION | 0.30 |
| A3 | CONVERSION | 0.20 |
| A4 | TEAMWORK | 0.15 |

```json
{
  "A1": "TRUST",
  "A2": "COMMUNICATION",
  "A3": "CONVERSION",
  "A4": "TEAMWORK"
}
```

---

### 8.4 تقييم الإدارة والاستقبال (admin-reception-assessment)

| المحور (code) | الدور (role) | الوزن الأصلي |
|--------------|-------------|-------------|
| AX85a6e9 | SCHEDULING | 0.35 |
| AX765ca8 | RECEPTION | 0.25 |
| AXa23fa3 | ADMIN | 0.25 |
| AXc39190 | COORDINATION | 0.15 |

```json
{
  "AX85a6e9": "SCHEDULING",
  "AX765ca8": "RECEPTION",
  "AXa23fa3": "ADMIN",
  "AXc39190": "COORDINATION"
}
```

**ملاحظة:** هذا التقييم يحتوي على مؤشر خاص إضافي: **RRI**

---

### 8.5 التقييم الشامل (comprehensive-clinic-assessment)

| المحور (code) | الدور (role) | الوزن الأصلي |
|--------------|-------------|-------------|
| AX6f5aa5 | JOURNEY | 0.20 |
| AX80c09a | CONVERSION | 0.20 |
| AXaadfb4 | OPERATIONS | 0.20 |
| AX2572cc | TEAM | 0.15 |
| AX6a52b4 | RETENTION | 0.15 |
| AX15afd8 | GROWTH | 0.10 |

```json
{
  "AX6f5aa5": "JOURNEY",
  "AX80c09a": "CONVERSION",
  "AXaadfb4": "OPERATIONS",
  "AX2572cc": "TEAM",
  "AX6a52b4": "RETENTION",
  "AX15afd8": "GROWTH"
}
```

---

## 9. كيف تُحسب المؤشرات عملياً — مثال تفصيلي

### المثال: تقييم "رحلة المريض"

**درجات المحاور (من المحرك):**
| المحور | الدور | الدرجة |
|--------|-------|--------|
| A1 | TRUST | 80 |
| A2 | COMMUNICATION | 70 |
| A3 | CONVERSION | 90 |
| A4 | RETENTION | 60 |
| A5 | LOYALTY | 85 |

**حساب TFI:**
```
TFI = (TRUST × 0.40) + (COMMUNICATION × 0.40) + (RECEPTION × 0.20)
TFI = (80 × 0.40) + (70 × 0.40) + (0 × 0.20)  ← RECEPTION غير موجود = 0
TFI = 32 + 28 + 0 = 60
```

**حساب PSI:**
```
PSI = (COMMUNICATION × 0.20) + (RECEPTION × 0.30) + (ADMIN × 0.30) + (COORDINATION × 0.20)
PSI = (70 × 0.20) + (0 × 0.30) + (0 × 0.30) + (0 × 0.20)
PSI = 14 + 0 + 0 + 0 = 14
```

**⚠️ المشكلة:** PSI = 14 — منخفض جداً لأن أدوار الاستقبال غير موجودة!

---

## 10. حل المشكلة: الأدوار الافتراضية (Fallback Roles)

### المبدأ:
إذا كان مؤشر يحتاج دوراً غير موجود في التقييم → استخدم **متوسط الأدوار المتاحة**.

### المثال المُصلح:
```
PSI يحتاج: COMMUNICATION, RECEPTION, ADMIN, COORDINATION

المتوفر: COMMUNICATION = 70
الغير متوفر: RECEPTION, ADMIN, COORDINATION

الحل: RECEPTION = ADMIN = COORDINATION = متوسط الأدوار المتاحة
متوسط = (80 + 70 + 90 + 60 + 85) / 5 = 77

PSI = (70 × 0.20) + (77 × 0.30) + (77 × 0.30) + (77 × 0.20)
PSI = 14 + 23.1 + 23.1 + 15.4 = 75.6 ≈ 76
```

**النتيجة:** PSI = 76 — منطقي!

---

## 11. كيف يعمل المحرك — خطوة بخطوة

```
1. يقرأ الإجابات من المستخدم
2. يحسب درجة كل محور (axisScores)
3. يقرأ axis_roles من Supabase
4. يترجم axisScores إلى roleScores
5. يقرأ kpi_mappings من Supabase
6. يحسب كل KPI من roleScores × الأوزان
7. إذا دور غير موجود → يستخدم المتوسط (Fallback)
8. يقرأ ev_mappings من Supabase
9. يحسب EV من roleScores × الأوزان
10. يُرجع كل النتائج
```

---

## 12. ملخص الجداول في Supabase

| الجدول/العمود | الوصف | الحالة |
|--------------|-------|--------|
| `assessment_types.kpi_mappings` | الأوزان العالمية للمؤشرات التنفيذية | ✅ موجود |
| `assessment_types.ev_mappings` | الأوزان العالمية للقيمة الدائمة | ✅ موجود |
| `assessment_types.axis_roles` | ربط كل محور بدور | ⏳ يجب إضافته |

---

## 13. خطوات إضافة تقييم جديد مستقبلاً

```
1. أنشئ التقييم في Supabase (assessment_types)
2. أضف المحاور في جدول axes
3. املأ axis_roles في assessment_types:
   {"AX123": "TRUST", "AX456": "COMMUNICATION", ...}
4. لا حاجة لتعديل kpi_mappings أو ev_mappings!
5. المحرك يحسب كل شيء تلقائياً
```

---

## 14. ملاحظات هامة

1. **لا تعدل `kpi_mappings` أو `ev_mappings` إلا بموافقة المدير التنفيذي**
2. **يمكن إضافة أدوار جديدة بدون تعديل المحرك**
3. **يمكن إضافة مؤشرات جديدة بإضافتها إلى `kpi_mappings` فقط**
4. **المحرك يستخدم "الأدوار الافتراضية" إذا كان دور غير موجود**
5. **RRI يُضاف فقط إلى تقييمات الاستقبال في `kpi_mappings` الخاص بها**

---

## 15. أوامر SQL للتنفيذ

### 15.1 إضافة عمود axis_roles

```sql
ALTER TABLE assessment_types 
ADD COLUMN IF NOT EXISTS axis_roles JSONB DEFAULT NULL;
```

### 15.2 ملء axis_roles لكل تقييم

```sql
-- patient-journey
UPDATE assessment_types
SET axis_roles = '{
  "A1": "TRUST",
  "A2": "COMMUNICATION",
  "A3": "CONVERSION",
  "A4": "RETENTION",
  "A5": "LOYALTY"
}'::jsonb
WHERE slug = 'patient-journey';

-- clinic-performance
UPDATE assessment_types
SET axis_roles = '{
  "A1": "TRUST",
  "A2": "COMMUNICATION",
  "A3": "RETENTION"
}'::jsonb
WHERE slug = 'clinic-performance';

-- medical-team-assessment
UPDATE assessment_types
SET axis_roles = '{
  "A1": "TRUST",
  "A2": "COMMUNICATION",
  "A3": "CONVERSION",
  "A4": "TEAMWORK"
}'::jsonb
WHERE slug = 'medical-team-assessment';

-- admin-reception-assessment
UPDATE assessment_types
SET axis_roles = '{
  "AX85a6e9": "SCHEDULING",
  "AX765ca8": "RECEPTION",
  "AXa23fa3": "ADMIN",
  "AXc39190": "COORDINATION"
}'::jsonb
WHERE slug = 'admin-reception-assessment';

-- comprehensive-clinic-assessment
UPDATE assessment_types
SET axis_roles = '{
  "AX6f5aa5": "JOURNEY",
  "AX80c09a": "CONVERSION",
  "AXaadfb4": "OPERATIONS",
  "AX2572cc": "TEAM",
  "AX6a52b4": "RETENTION",
  "AX15afd8": "GROWTH"
}'::jsonb
WHERE slug = 'comprehensive-clinic-assessment';
```

### 15.3 تحديث kpi_mappings لكل التقييمات

```sql
-- patient-journey
UPDATE assessment_types
SET kpi_mappings = '{
  "TFI": {"TRUST": 0.40, "COMMUNICATION": 0.40, "RECEPTION": 0.20},
  "TAP": {"CONVERSION": 0.50, "RETENTION": 0.30, "SCHEDULING": 0.20},
  "PRP": {"RETENTION": 0.60, "SCHEDULING": 0.40},
  "PLI": {"LOYALTY": 0.50, "RECEPTION": 0.50},
  "PSI": {"COMMUNICATION": 0.20, "RECEPTION": 0.30, "ADMIN": 0.30, "COORDINATION": 0.20},
  "NPI": {"TRUST": 0.10, "LOYALTY": 0.40, "RECEPTION": 0.50},
  "EVI": {"COMMUNICATION": 0.20, "SCHEDULING": 0.30, "ADMIN": 0.30, "COORDINATION": 0.20},
  "TCI": {"CONVERSION": 0.30, "SCHEDULING": 0.40, "ADMIN": 0.30}
}'::jsonb
WHERE slug = 'patient-journey';

-- clinic-performance
UPDATE assessment_types
SET kpi_mappings = '{
  "TFI": {"TRUST": 0.40, "COMMUNICATION": 0.40, "RECEPTION": 0.20},
  "TAP": {"CONVERSION": 0.50, "RETENTION": 0.30, "SCHEDULING": 0.20},
  "PRP": {"RETENTION": 0.60, "SCHEDULING": 0.40},
  "PLI": {"LOYALTY": 0.50, "RECEPTION": 0.50},
  "PSI": {"COMMUNICATION": 0.20, "RECEPTION": 0.30, "ADMIN": 0.30, "COORDINATION": 0.20},
  "NPI": {"TRUST": 0.10, "LOYALTY": 0.40, "RECEPTION": 0.50},
  "EVI": {"COMMUNICATION": 0.20, "SCHEDULING": 0.30, "ADMIN": 0.30, "COORDINATION": 0.20},
  "TCI": {"CONVERSION": 0.30, "SCHEDULING": 0.40, "ADMIN": 0.30}
}'::jsonb
WHERE slug = 'clinic-performance';

-- medical-team-assessment
UPDATE assessment_types
SET kpi_mappings = '{
  "TFI": {"TRUST": 0.40, "COMMUNICATION": 0.40, "RECEPTION": 0.20},
  "TAP": {"CONVERSION": 0.50, "RETENTION": 0.30, "SCHEDULING": 0.20},
  "PRP": {"RETENTION": 0.60, "SCHEDULING": 0.40},
  "PLI": {"LOYALTY": 0.50, "RECEPTION": 0.50},
  "PSI": {"COMMUNICATION": 0.20, "RECEPTION": 0.30, "ADMIN": 0.30, "COORDINATION": 0.20},
  "NPI": {"TRUST": 0.10, "LOYALTY": 0.40, "RECEPTION": 0.50},
  "EVI": {"COMMUNICATION": 0.20, "SCHEDULING": 0.30, "ADMIN": 0.30, "COORDINATION": 0.20},
  "TCI": {"CONVERSION": 0.30, "SCHEDULING": 0.40, "ADMIN": 0.30}
}'::jsonb
WHERE slug = 'medical-team-assessment';

-- admin-reception-assessment (مع RRI)
UPDATE assessment_types
SET kpi_mappings = '{
  "TFI": {"TRUST": 0.40, "COMMUNICATION": 0.40, "RECEPTION": 0.20},
  "TAP": {"CONVERSION": 0.50, "RETENTION": 0.30, "SCHEDULING": 0.20},
  "PRP": {"RETENTION": 0.60, "SCHEDULING": 0.40},
  "PLI": {"LOYALTY": 0.50, "RECEPTION": 0.50},
  "PSI": {"COMMUNICATION": 0.20, "RECEPTION": 0.30, "ADMIN": 0.30, "COORDINATION": 0.20},
  "NPI": {"TRUST": 0.10, "LOYALTY": 0.40, "RECEPTION": 0.50},
  "EVI": {"COMMUNICATION": 0.20, "SCHEDULING": 0.30, "ADMIN": 0.30, "COORDINATION": 0.20},
  "TCI": {"CONVERSION": 0.30, "SCHEDULING": 0.40, "ADMIN": 0.30},
  "RRI": {"RECEPTION": 0.40, "SCHEDULING": 0.30, "ADMIN": 0.20, "COORDINATION": 0.10}
}'::jsonb
WHERE slug = 'admin-reception-assessment';

-- comprehensive-clinic-assessment
UPDATE assessment_types
SET kpi_mappings = '{
  "TFI": {"TRUST": 0.40, "COMMUNICATION": 0.40, "RECEPTION": 0.20},
  "TAP": {"CONVERSION": 0.50, "RETENTION": 0.30, "SCHEDULING": 0.20},
  "PRP": {"RETENTION": 0.60, "SCHEDULING": 0.40},
  "PLI": {"LOYALTY": 0.50, "RECEPTION": 0.50},
  "PSI": {"COMMUNICATION": 0.20, "RECEPTION": 0.30, "ADMIN": 0.30, "COORDINATION": 0.20},
  "NPI": {"TRUST": 0.10, "LOYALTY": 0.40, "RECEPTION": 0.50},
  "EVI": {"COMMUNICATION": 0.20, "SCHEDULING": 0.30, "ADMIN": 0.30, "COORDINATION": 0.20},
  "TCI": {"CONVERSION": 0.30, "SCHEDULING": 0.40, "ADMIN": 0.30}
}'::jsonb
WHERE slug = 'comprehensive-clinic-assessment';
```

### 15.4 تحديث ev_mappings لكل التقييمات

```sql
UPDATE assessment_types
SET ev_mappings = '{
  "CONVERSION": 0.40,
  "RETENTION": 0.40,
  "LOYALTY": 0.20
}'::jsonb
WHERE slug IN ('patient-journey', 'clinic-performance', 'medical-team-assessment', 'comprehensive-clinic-assessment');

UPDATE assessment_types
SET ev_mappings = '{
  "SCHEDULING": 0.40,
  "RECEPTION": 0.30,
  "ADMIN": 0.20,
  "COORDINATION": 0.10
}'::jsonb
WHERE slug = 'admin-reception-assessment';
```

---

**تم إعداد هذا الملف بواسطة:** CORE System Engine
**التاريخ:** 2026-07-11
**الإصدار:** 2.0 — نهائي
**الحالة:** جاهز للتنفيذ — ينتظر الموافقة النهائية
