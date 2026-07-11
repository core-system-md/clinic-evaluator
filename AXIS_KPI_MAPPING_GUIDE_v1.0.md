# CORE SYSTEM — دليل العلاقات بين المحاور والمؤشرات (Axis-KPI Mapping Guide)
## الإصدار: 1.0 | التاريخ: 2026-07-11

---

## 1. نظرة عامة

هذا الملف يحدد:
- **أدوار المحاور** (Axis Roles): ما هو "الدور" الذي يلعبه كل محور في أي تقييم
- **المؤشرات التنفيذية** (Executive KPIs): كيف تُحسب من الأدوار
- **الأوزان**: نسبة مساهمة كل دور في كل مؤشر

**المبدأ:** المؤشرات لا تعرف أسماء المحاور (A1, AX85a6e9...) — بل تعرف **الأدوار** (TRUST, COMMUNICATION...).

---

## 2. أدوار المحاور (Axis Roles) — المعجم

| الدور | الاسم العربي | الوصف | متى يُستخدم |
|-------|-------------|-------|------------|
| **TRUST** | بناء الثقة | العلاقة الأولية والمصداقية | قبل العلاج |
| **COMMUNICATION** | التواصل | جودة التواصل مع المريض | أثناء الزيارة |
| **CONVERSION** | التحويل | قبول الخطة العلاجية | داخل الاستشارة |
| **RETENTION** | الاستبقاء | العودة للمتابعة | بعد العلاج |
| **LOYALTY** | الولاء | التوصية بالعيادة | طويل المدى |
| **SCHEDULING** | الجدولة | إدارة المواعيد | إداري |
| **RECEPTION** | الاستقبال | الانطباع الأول | استقبال |
| **ADMIN** | الإدارة | الكفاءة الإدارية | إداري |
| **COORDINATION** | التنسيق | التنسيق الداخلي | تشغيلي |
| **JOURNEY** | الرحلة | تجربة المريض الكاملة | شامل |
| **OPERATIONS** | التشغيل | إدارة العمليات | تشغيلي |
| **TEAM** | الفريق | أداء الفريق الطبي | طبي |
| **GROWTH** | النمو | الاستدامة والتوسع | استراتيجي |
| **PROFESSIONALISM** | الاحترافية | السلوك المهني | طبي |
| **TEAMWORK** | العمل الجماعي | التكامل بين الأعضاء | فريق |

---

## 3. المؤشرات التنفيذية (Executive KPIs) — المعجم

| المؤشر | الاسم الكامل | الوصف | المعنى |
|--------|-------------|-------|--------|
| **TFI** | Trust Formation Index | مؤشر بناء الثقة | عمق العلاقة الأولية |
| **TAP** | Treatment Acceptance Potential | مؤشر قبول العلاج | معدل التحويل للعلاج |
| **PRP** | Patient Retention Potential | مؤشر الاستبقاء | العودة للمتابعة |
| **PLI** | Patient Loyalty Index | مؤشر الولاء | التوصية بالعيادة |
| **PSI** | Patient Satisfaction Index | مؤشر رضا المريض | الرضا عن النتيجة |
| **NPI** | Net Promoter Index | مؤشر التوصية | التوصية لغيره |
| **EVI** | Experience Value Index | مؤشر قيمة التجربة | هل التجربة تستحق السعر؟ |
| **TCI** | Treatment Confidence Index | مؤشر ثقة العلاج | القناعة بالخطة والطبيب |

---

## 4. خريطة المؤشرات (KPI Mapping) — الأوزان العالمية

هذه الأوزان **ثابتة** لكل التقييمات. لا تتغير عند إضافة تقييم جديد.

```json
{
  "TFI": {
    "TRUST": 0.50,
    "COMMUNICATION": 0.50
  },
  "TAP": {
    "CONVERSION": 0.50,
    "RETENTION": 0.50
  },
  "PRP": {
    "RETENTION": 1.00
  },
  "PLI": {
    "LOYALTY": 1.00
  },
  "PSI": {
    "COMMUNICATION": 0.30,
    "CONVERSION": 0.30,
    "RETENTION": 0.40
  },
  "NPI": {
    "TRUST": 0.20,
    "LOYALTY": 0.80
  },
  "EVI": {
    "COMMUNICATION": 0.30,
    "CONVERSION": 0.40,
    "RETENTION": 0.30
  },
  "TCI": {
    "CONVERSION": 0.50,
    "RETENTION": 0.50
  }
}
```

**قاعدة التحقق:** مجموع أوزان كل مؤشر = 1.00 (100%)

| المؤشر | المجموع | ✅ |
|--------|---------|---|
| TFI | 0.50 + 0.50 = 1.00 | ✅ |
| TAP | 0.50 + 0.50 = 1.00 | ✅ |
| PRP | 1.00 = 1.00 | ✅ |
| PLI | 1.00 = 1.00 | ✅ |
| PSI | 0.30 + 0.30 + 0.40 = 1.00 | ✅ |
| NPI | 0.20 + 0.80 = 1.00 | ✅ |
| EVI | 0.30 + 0.40 + 0.30 = 1.00 | ✅ |
| TCI | 0.50 + 0.50 = 1.00 | ✅ |

---

## 5. خريطة القيمة الدائمة (EV Mapping) — الأوزان العالمية

```json
{
  "CONVERSION": 0.40,
  "RETENTION": 0.40,
  "LOYALTY": 0.20
}
```

**ملاحظة:** EV لا يحتاج كل الأدوار — فقط الأدوار المؤثرة مالياً.

---

## 6. ربط الأدوار بالمحاور لكل تقييم (Axis Roles per Assessment)

### 6.1 تقييم رحلة المريض (patient-journey)

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

### 6.2 تقييم أداء العيادة (clinic-performance)

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

### 6.3 تقييم الفريق الطبي (medical-team-assessment)

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

### 6.4 تقييم الإدارة والاستقبال (admin-reception-assessment)

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

**ملاحظة:** هذا التقييم لا يحتوي على أدوار طبية (CONVERSION, RETENTION...) — 
لذلك KPIs مثل TAP, PRP, TCI ستُحسب من أدوار غير موجودة = 0.

**الحل المستقبلي:** يمكن إضافة أدوار جديدة لهذا التقييم أو تعديل KPI Mapping ليدعم SCHEDULING, RECEPTION...

---

### 6.5 التقييم الشامل (comprehensive-clinic-assessment)

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

## 7. كيف تُحسب المؤشرات عملياً — مثال

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
TFI = (TRUST × 0.50) + (COMMUNICATION × 0.50)
TFI = (80 × 0.50) + (70 × 0.50)
TFI = 40 + 35 = 75
```

**حساب PSI:**
```
PSI = (COMMUNICATION × 0.30) + (CONVERSION × 0.30) + (RETENTION × 0.40)
PSI = (70 × 0.30) + (90 × 0.30) + (60 × 0.40)
PSI = 21 + 27 + 24 = 72
```

**حساب EV:**
```
weightedScore = (CONVERSION × 0.40) + (RETENTION × 0.40) + (LOYALTY × 0.20)
weightedScore = (90 × 0.40) + (60 × 0.40) + (85 × 0.20)
weightedScore = 36 + 24 + 17 = 77

deltaC = (77 / 100) × 0.35 = 0.2695
EV = 0.2695 × flow × ltv
```

---

## 8. كيف تُحسب المؤشرات — تقييم "الاستقبال"

**درجات المحاور:**
| المحور | الدور | الدرجة |
|--------|-------|--------|
| AX85a6e9 | SCHEDULING | 75 |
| AX765ca8 | RECEPTION | 80 |
| AXa23fa3 | ADMIN | 70 |
| AXc39190 | COORDINATION | 65 |

**حساب TFI:**
```
TFI = (TRUST × 0.50) + (COMMUNICATION × 0.50)
TFI = (0 × 0.50) + (0 × 0.50)  ← TRUST و COMMUNICATION غير موجودين!
TFI = 0
```

**⚠️ المشكلة:** هذا التقييم لا يحتوي على TRUST أو COMMUNICATION — 
لذلك TFI = 0 وهذا غير منطقي!

---

## 9. الحلول المستقبلية للتقييمات المتخصصة

### الخيار أ: تعديل KPI Mapping ليدعم أدوار جديدة

```json
{
  "TFI": {
    "TRUST": 0.50,
    "COMMUNICATION": 0.50,
    "RECEPTION": 0.50  ← جديد
  }
}
```

### الخيار ب: إضافة مؤشرات خاصة بالتقييم

```json
{
  "RRI": {  ← Reception Readiness Index (للاستقبال فقط)
    "RECEPTION": 0.50,
    "SCHEDULING": 0.30,
    "COORDINATION": 0.20
  }
}
```

### الخيار ج: تعريف "أدوار افتراضية"

إذا لم يوجد دور → استخدم متوسط كل الأدوار المتاحة:
```
TRUST (غير موجود) = متوسط (SCHEDULING + RECEPTION + ADMIN + COORDINATION)
```

---

## 10. ملخص الجداول في Supabase

| الجدول/العمود | الوصف | الحالة |
|--------------|-------|--------|
| `assessment_types.kpi_mappings` | الأوزان العالمية للمؤشرات | ✅ موجود |
| `assessment_types.ev_mappings` | الأوزان العالمية للقيمة الدائمة | ✅ موجود |
| `assessment_types.axis_roles` | ربط كل محور بدور | ⏳ يجب إضافته |

---

## 11. خطوات إضافة تقييم جديد مستقبلاً

```
1. أنشئ التقييم في Supabase (assessment_types)
2. أضف المحاور في جدول axes
3. املأ axis_roles في assessment_types:
   {"AX123": "TRUST", "AX456": "COMMUNICATION", ...}
4. لا حاجة لتعديل kpi_mappings أو ev_mappings!
5. المحرك يحسب كل شيء تلقائياً
```

---

## 12. ملاحظات هامة

1. **لا تعدل `kpi_mappings` أو `ev_mappings` إلا بموافقة المدير التنفيذي**
2. **يمكن إضافة أدوار جديدة بدون تعديل المحرك**
3. **يمكن إضافة مؤشرات جديدة بإضافتها إلى `kpi_mappings` فقط**
4. **المحرك يتجاهل الأدوار غير الموجودة في التقييم (يعطيها 0)**
5. **إذا أردت "أدوار افتراضية" → يجب تعديل المحرك**

---

**تم إعداد هذا الملف بواسطة:** CORE System Engine
**التاريخ:** 2026-07-11
**الإصدار:** 1.0
**الحالة:** مراجعة تنفيذية — ينتظر الموافقة
