-- Create Matrix Comprehensive as a draft only; do not set or alter release pointers.
do $matrix_seed$
declare
 v_data jsonb := $matrix_data$
{
  "slug": "matrix-comprehensive-assessment",
  "title_ar": "تقييم Matrix الشامل",
  "title_en": "Matrix Comprehensive Assessment",
  "description": "تقييم وصفي لكفاءة الفريق عبر تسعة محاور ومواقف يومية تشمل التواصل والثقة والاستقبال والتحويل والاستبقاء والمواعيد والولاء والدقة الإدارية والتنسيق.",
  "has_traps": false,
  "has_ev_simulator": false,
  "axis_roles": {
    "A1": "COMMUNICATION",
    "A2": "TRUST",
    "A3": "RECEPTION",
    "A4": "CONVERSION",
    "A5": "RETENTION",
    "A6": "SCHEDULING",
    "A7": "LOYALTY",
    "A8": "ADMIN",
    "A9": "COORDINATION"
  },
  "kpi_mappings": {
    "TFI": {
      "TRUST": 0.4,
      "RECEPTION": 0.2,
      "COMMUNICATION": 0.4
    },
    "TAP": {
      "RETENTION": 0.3,
      "CONVERSION": 0.5,
      "SCHEDULING": 0.2
    },
    "PRP": {
      "RETENTION": 0.6,
      "SCHEDULING": 0.4
    },
    "PLI": {
      "LOYALTY": 0.5,
      "RECEPTION": 0.5
    },
    "PSI": {
      "ADMIN": 0.3,
      "RECEPTION": 0.3,
      "COORDINATION": 0.2,
      "COMMUNICATION": 0.2
    },
    "NPI": {
      "TRUST": 0.1,
      "LOYALTY": 0.4,
      "RECEPTION": 0.5
    },
    "EVI": {
      "ADMIN": 0.3,
      "SCHEDULING": 0.3,
      "COORDINATION": 0.2,
      "COMMUNICATION": 0.2
    },
    "TCI": {
      "ADMIN": 0.3,
      "CONVERSION": 0.3,
      "SCHEDULING": 0.4
    },
    "RRI": {
      "ADMIN": 0.2,
      "RECEPTION": 0.4,
      "SCHEDULING": 0.3,
      "COORDINATION": 0.1
    }
  },
  "ev_mappings": {},
  "design_metadata": {
    "estimated_completion_minutes": "5–7",
    "question_count": 18,
    "axis_count": 9,
    "options_per_question": 4,
    "score_anchors": [
      0,
      40,
      70,
      100
    ],
    "calibration_status": "DESCRIPTIVE_UNCALIBRATED",
    "notes": "Descriptive anchors only; no calibrated pass/fail threshold or validated Q1-Q4 classification."
  },
  "axes": [
    {
      "code": "A1",
      "title_ar": "التواصل وإدارة الاستفسار",
      "title": "Communication and inquiry handling",
      "description": "وضوح المعلومات والإصغاء ومتابعة بلا ضغط.",
      "weight": 11.12,
      "questions": [
        {
          "code": "Q1",
          "text_ar": "شخص يسأل عبر واتساب عن سعر إجراء فقط. كيف تبدأ؟",
          "text": "Someone asks by WhatsApp only for a procedure price. How do you start?",
          "question_type": "select",
          "is_required": true,
          "options": [
            {
              "id": "91000000-0000-4000-8000-000000000001",
              "value": 70,
              "label_ar": "أرسل السعر وأوضح إن كان يشمل الاستشارة ثم أترك المجال للأسئلة.",
              "label": "Share the price, clarify consultation inclusion, then allow questions.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000002",
              "value": 100,
              "label_ar": "أوضح السعر وما يشمله ثم أعرض سؤالاً اختيارياً لفهم حاجته.",
              "label": "Explain the price and inclusions, then offer an optional question about their need.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000003",
              "value": 40,
              "label_ar": "أرسل قائمة الأسعار ورابط الحجز.",
              "label": "Send the price list and booking link.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000004",
              "value": 0,
              "label_ar": "أطلب بيانات كثيرة قبل إعطاء السعر.",
              "label": "Ask for extensive details before sharing the price.",
              "is_trap": false
            }
          ]
        },
        {
          "code": "Q2",
          "text_ar": "لم يرد الشخص بعد إرسال المعلومات. ما الخطوة الأقرب لتصرفك؟",
          "text": "The person does not reply after receiving information. What next?",
          "question_type": "select",
          "is_required": true,
          "options": [
            {
              "id": "91000000-0000-4000-8000-000000000005",
              "value": 40,
              "label_ar": "أرسل تذكيرات متتابعة حتى يرد.",
              "label": "Send repeated reminders until they reply.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000006",
              "value": 70,
              "label_ar": "أنتظر أن يبادر بالتواصل مجدداً.",
              "label": "Wait for them to reconnect.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000007",
              "value": 100,
              "label_ar": "أرسل متابعة مهذبة واحدة وأترك قرار المتابعة له.",
              "label": "Send one courteous follow-up and leave the choice to them.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000008",
              "value": 0,
              "label_ar": "أغلق التواصل دون متابعة واضحة.",
              "label": "Close the interaction without a clear follow-up.",
              "is_trap": false
            }
          ]
        }
      ]
    },
    {
      "code": "A2",
      "title_ar": "الثقة والاحترام والشفافية",
      "title": "Trust, respect and transparency",
      "description": "احترام المخاوف وتقديم معلومات صادقة بلا وعود غير مضمونة.",
      "weight": 11.11,
      "questions": [
        {
          "code": "Q3",
          "text_ar": "ذكر المراجع تجربة سابقة غير مرضية ويبدو متحفظاً. كيف تتعامل؟",
          "text": "A patient describes a poor past experience and seems cautious. What do you do?",
          "question_type": "select",
          "is_required": true,
          "options": [
            {
              "id": "91000000-0000-4000-8000-000000000009",
              "value": 100,
              "label_ar": "أستمع دون مقاطعة وأتحقق من فهم مخاوفه ثم أوضح خطوة مناسبة.",
              "label": "Listen, confirm the concern, and explain a suitable next step.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000010",
              "value": 40,
              "label_ar": "أذكر أن التجارب تختلف ثم أنتقل لشرح الخدمات.",
              "label": "Say experiences differ and move on to services.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000011",
              "value": 70,
              "label_ar": "أقر بأن التجربة كانت مزعجة وأعرض مناقشة مخاوفه.",
              "label": "Acknowledge the experience and offer to discuss concerns.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000012",
              "value": 0,
              "label_ar": "أطلب منه عدم مقارنة تجربته السابقة بالحالية.",
              "label": "Ask them not to compare past and current experiences.",
              "is_trap": false
            }
          ]
        },
        {
          "code": "Q4",
          "text_ar": "سأل المراجع إن كانت نتيجة الإجراء مضمونة. ماذا تقول؟",
          "text": "A patient asks if the procedure outcome is guaranteed. What do you say?",
          "question_type": "select",
          "is_required": true,
          "options": [
            {
              "id": "91000000-0000-4000-8000-000000000013",
              "value": 40,
              "label_ar": "أوضح أن النتائج غالباً جيدة.",
              "label": "Say outcomes are usually good.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000014",
              "value": 100,
              "label_ar": "أوضح تفاوت النتائج وعدم ضمانها وأحيل التوقعات للمختص.",
              "label": "Explain outcomes vary and cannot be guaranteed; refer expectations to a qualified professional.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000015",
              "value": 70,
              "label_ar": "أقدم معلومات عامة دون وعد بنتيجة محددة.",
              "label": "Provide general information without a specific promise.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000016",
              "value": 0,
              "label_ar": "أطمئنه بأن النتيجة ستكون كما يتوقع.",
              "label": "Reassure them the result will match expectations.",
              "is_trap": false
            }
          ]
        }
      ]
    },
    {
      "code": "A3",
      "title_ar": "الاستقبال وفهم هدف الزيارة",
      "title": "Reception and understanding the visit purpose",
      "description": "الترحيب وتوضيح الخطوة التالية ومعالجة الانتظار بصدق.",
      "weight": 11.11,
      "questions": [
        {
          "code": "Q5",
          "text_ar": "وصل مراجع لا يعرف الخدمة المناسبة له. كيف تبدأ؟",
          "text": "A patient arrives unsure which service they need. How do you start?",
          "question_type": "select",
          "is_required": true,
          "options": [
            {
              "id": "91000000-0000-4000-8000-000000000017",
              "value": 40,
              "label_ar": "أشرح الخدمات الأكثر شيوعاً وأطلب منه اختياراً.",
              "label": "Describe common services and ask them to choose.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000018",
              "value": 100,
              "label_ar": "أرحب به وأسأل باختصار عن هدف الزيارة ثم أوضح المسار المناسب.",
              "label": "Welcome them, ask the visit goal, and explain an appropriate route.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000019",
              "value": 70,
              "label_ar": "أطلب منه الانتظار حتى يتوفر شخص يوضح الخيارات.",
              "label": "Ask them to wait until someone can explain options.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000020",
              "value": 0,
              "label_ar": "أفترض سبب الزيارة من إعلان شاهده.",
              "label": "Assume the visit purpose from an advertisement.",
              "is_trap": false
            }
          ]
        },
        {
          "code": "Q6",
          "text_ar": "المراجع منزعج لأن الانتظار طال. ماذا تفعل؟",
          "text": "A patient is upset because of a long wait. What do you do?",
          "question_type": "select",
          "is_required": true,
          "options": [
            {
              "id": "91000000-0000-4000-8000-000000000021",
              "value": 70,
              "label_ar": "أعتذر وأقول إنني سأتحقق من الوقت المتوقع.",
              "label": "Apologize and say you will check the expected timing.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000022",
              "value": 0,
              "label_ar": "أقول إن التأخير ليس من مسؤوليتي.",
              "label": "Say the delay is not my responsibility.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000023",
              "value": 100,
              "label_ar": "أتحقق من الوضع وأقدم تحديثاً صادقاً وخيارات واقعية.",
              "label": "Check the situation and provide an honest update and options.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000024",
              "value": 40,
              "label_ar": "أطلب منه الانتظار قليلاً لأن الازدحام مؤقت.",
              "label": "Ask them to wait because the crowding is temporary.",
              "is_trap": false
            }
          ]
        }
      ]
    },
    {
      "code": "A4",
      "title_ar": "شرح الخيارات واتخاذ القرار",
      "title": "Explaining options and supporting decisions",
      "description": "توضيح الفروق والتكاليف والقيود ودعم القرار المستنير.",
      "weight": 11.11,
      "questions": [
        {
          "code": "Q7",
          "text_ar": "سأل المراجع عن الفرق والتكلفة النهائية لخيارين. ما ردك؟",
          "text": "A patient asks about differences and final costs for two options. How do you respond?",
          "question_type": "select",
          "is_required": true,
          "options": [
            {
              "id": "91000000-0000-4000-8000-000000000025",
              "value": 100,
              "label_ar": "أوضح الفروق والتكلفة والقيود بلغة بسيطة وأستوضح ما يحتاج شرحه.",
              "label": "Explain differences, costs and limitations simply, then clarify questions.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000026",
              "value": 70,
              "label_ar": "ألخص الخيارين وأتأكد من تكلفة كل منهما قبل القرار.",
              "label": "Summarize both options and confirm each cost before a decision.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000027",
              "value": 0,
              "label_ar": "أوجهه مباشرة للخيار الأعلى سعراً.",
              "label": "Direct the patient to the higher-priced option.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000028",
              "value": 40,
              "label_ar": "أشرح المزايا وأؤجل تفاصيل التكاليف للحجز.",
              "label": "Explain benefits and leave cost details until booking.",
              "is_trap": false
            }
          ]
        },
        {
          "code": "Q8",
          "text_ar": "قال المراجع إن السعر أعلى مما توقع. ما ردك؟",
          "text": "A patient says the price is higher than expected. What do you do?",
          "question_type": "select",
          "is_required": true,
          "options": [
            {
              "id": "91000000-0000-4000-8000-000000000029",
              "value": 40,
              "label_ar": "أعرض تخفيضاً قبل فهم سبب اعتراضه.",
              "label": "Offer a discount before understanding the concern.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000030",
              "value": 100,
              "label_ar": "أستوضح ما يحتاج توضيحاً وأشرح السعر والبدائل دون ضغط.",
              "label": "Clarify the concern and explain price and alternatives without pressure.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000031",
              "value": 70,
              "label_ar": "أراجع السعر معه وأمنحه وقتاً للتفكير.",
              "label": "Review the price and allow time to think.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000032",
              "value": 0,
              "label_ar": "أوحي بأن الفرصة ستضيع إن لم يحجز فوراً.",
              "label": "Imply the opportunity will be lost unless they book immediately.",
              "is_trap": false
            }
          ]
        }
      ]
    },
    {
      "code": "A5",
      "title_ar": "المتابعة وبناء الاستمرارية",
      "title": "Follow-up and continuity",
      "description": "متابعة مناسبة بإذن المراجع وتوثيق الخطوة التالية واحترام قراره.",
      "weight": 11.11,
      "questions": [
        {
          "code": "Q9",
          "text_ar": "أبدى المراجع اهتماماً لكنه لم يقرر الحجز. كيف تنهي التواصل؟",
          "text": "A patient is interested but has not decided to book. How do you close?",
          "question_type": "select",
          "is_required": true,
          "options": [
            {
              "id": "91000000-0000-4000-8000-000000000033",
              "value": 70,
              "label_ar": "أترك معلومات التواصل ليعود عندما يكون مستعداً.",
              "label": "Leave contact information so they can return when ready.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000034",
              "value": 40,
              "label_ar": "أكرر المزايا وأطلب قراراً الآن.",
              "label": "Repeat benefits and ask for a decision now.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000035",
              "value": 100,
              "label_ar": "ألخص ما اتفقنا عليه وأسأل إن كان يرغب بمتابعة وأحترم اختياره.",
              "label": "Summarize, ask if follow-up is welcome, and respect their choice.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000036",
              "value": 0,
              "label_ar": "أرسل عروضاً متكررة حتى يقرر.",
              "label": "Send repeated offers until they decide.",
              "is_trap": false
            }
          ]
        },
        {
          "code": "Q10",
          "text_ar": "فات المراجع موعده ولم يرد على أول اتصال. ما التالي؟",
          "text": "A patient missed an appointment and did not answer the first call. What next?",
          "question_type": "select",
          "is_required": true,
          "options": [
            {
              "id": "91000000-0000-4000-8000-000000000037",
              "value": 100,
              "label_ar": "أرسل رسالة مهذبة تتيح إعادة الجدولة أو إبلاغنا بعدم الحاجة للموعد.",
              "label": "Send one courteous message offering rescheduling or cancellation.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000038",
              "value": 40,
              "label_ar": "أتصل مرات كثيرة في اليوم نفسه.",
              "label": "Call repeatedly that day.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000039",
              "value": 70,
              "label_ar": "أنتظر لليوم التالي وأسأل باختصار عن إعادة الجدولة.",
              "label": "Wait until tomorrow and briefly ask about rescheduling.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000040",
              "value": 0,
              "label_ar": "أغلق الحالة دون توثيق المحاولة.",
              "label": "Close the case without recording the attempt.",
              "is_trap": false
            }
          ]
        }
      ]
    },
    {
      "code": "A6",
      "title_ar": "تنظيم المواعيد وإدارة التغيير",
      "title": "Scheduling and managing changes",
      "description": "تقليل التعارضات وإشعار المتأثرين وتقديم خيارات واقعية.",
      "weight": 11.11,
      "questions": [
        {
          "code": "Q11",
          "text_ar": "اكتشفت حجز مريضين في الوقت نفسه. ماذا تفعل؟",
          "text": "Two patients have been booked for the same time. What do you do?",
          "question_type": "select",
          "is_required": true,
          "options": [
            {
              "id": "91000000-0000-4000-8000-000000000041",
              "value": 40,
              "label_ar": "أحاول إدخال الموعدين معاً وأشرح عند وصولهما.",
              "label": "Try fitting both appointments and explain on arrival.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000042",
              "value": 70,
              "label_ar": "أتحقق وأطلب من أحدهما الانتظار حتى تتضح إمكانية استيعابه.",
              "label": "Check and ask one to wait until availability is clear.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000043",
              "value": 100,
              "label_ar": "أتحقق من الخيارات وأتواصل مبكراً مع المتأثرين لعرض بدائل.",
              "label": "Verify options, contact affected people early, and offer alternatives.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000044",
              "value": 0,
              "label_ar": "أغير أحد الموعدين دون إبلاغ المراجع مسبقاً.",
              "label": "Change an appointment without informing the patient first.",
              "is_trap": false
            }
          ]
        },
        {
          "code": "Q12",
          "text_ar": "تأخر مقدم الخدمة والمراجع ينتظر. كيف تتصرف؟",
          "text": "The provider is late and the patient is waiting. How do you respond?",
          "question_type": "select",
          "is_required": true,
          "options": [
            {
              "id": "91000000-0000-4000-8000-000000000045",
              "value": 0,
              "label_ar": "أخفي التأخير لتجنب النقاش.",
              "label": "Hide the delay to avoid discussion.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000046",
              "value": 70,
              "label_ar": "أعتذر وأطلب الانتظار حتى تتضح الصورة.",
              "label": "Apologize and ask them to wait.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000047",
              "value": 100,
              "label_ar": "أتحقق من الوقت وأشارك تحديثاً وخيارات واقعية.",
              "label": "Check timing and share an update and realistic options.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000048",
              "value": 40,
              "label_ar": "أطمئنه أن الخدمة ستبدأ قريباً دون تحقق.",
              "label": "Reassure them service will start soon without checking.",
              "is_trap": false
            }
          ]
        }
      ]
    },
    {
      "code": "A7",
      "title_ar": "الانطباع المستمر والولاء",
      "title": "Ongoing experience and loyalty",
      "description": "التعامل مع الملاحظات والتوصيات باحترام دون استغلال الثقة.",
      "weight": 11.11,
      "questions": [
        {
          "code": "Q13",
          "text_ar": "قدم مراجع ملاحظة واقترح تحسيناً. كيف تتصرف؟",
          "text": "A patient gives feedback and suggests an improvement. How do you respond?",
          "question_type": "select",
          "is_required": true,
          "options": [
            {
              "id": "91000000-0000-4000-8000-000000000049",
              "value": 70,
              "label_ar": "أشكره وأدوّن الملاحظة لمناقشتها لاحقاً.",
              "label": "Thank them and record the feedback for later discussion.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000050",
              "value": 100,
              "label_ar": "أشكره وأوثق الملاحظة وأوصلها للجهة المناسبة وأتابع ما يمكن.",
              "label": "Thank them, record and route the feedback, and follow up where possible.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000051",
              "value": 40,
              "label_ar": "أشرح الإجراء الحالي قبل تقرير نقل الملاحظة.",
              "label": "Explain the current process before deciding whether to pass the feedback on.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000052",
              "value": 0,
              "label_ar": "أقول إن الإجراءات لا تتغير بسبب ملاحظة فردية.",
              "label": "Say procedures do not change based on individual feedback.",
              "is_trap": false
            }
          ]
        },
        {
          "code": "Q14",
          "text_ar": "قال مراجع دائم إنه قد يوصي بالعيادة. ما ردك؟",
          "text": "A returning patient says they may recommend the clinic. What do you say?",
          "question_type": "select",
          "is_required": true,
          "options": [
            {
              "id": "91000000-0000-4000-8000-000000000053",
              "value": 40,
              "label_ar": "أطلب منه نشر تقييم قبل المغادرة.",
              "label": "Ask them to post a review before leaving.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000054",
              "value": 100,
              "label_ar": "أشكره وأترك له حرية مشاركة تجربته دون ضغط أو طلب بيانات الآخرين.",
              "label": "Thank them and leave sharing optional without pressure or requesting others' data.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000055",
              "value": 0,
              "label_ar": "أشترط ميزة خاصة بإحضار مراجع جديد.",
              "label": "Condition a special benefit on bringing a new patient.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000056",
              "value": 70,
              "label_ar": "أوضح أن المشاركة اختيارية ونقدر الملاحظات الصادقة.",
              "label": "Explain sharing is optional and honest feedback is valued.",
              "is_trap": false
            }
          ]
        }
      ]
    },
    {
      "code": "A8",
      "title_ar": "الدقة الإدارية وحماية المعلومات",
      "title": "Administrative accuracy and information protection",
      "description": "توثيق أمين والتحقق من الأسعار وحماية بيانات المراجعين.",
      "weight": 11.11,
      "questions": [
        {
          "code": "Q15",
          "text_ar": "تحتاج لتسجيل معلومة لتسهيل متابعة طلب مراجع. أين توثقها؟",
          "text": "You need to record information to follow up a patient request. Where?",
          "question_type": "select",
          "is_required": true,
          "options": [
            {
              "id": "91000000-0000-4000-8000-000000000057",
              "value": 100,
              "label_ar": "أوثق المعلومة اللازمة بموضوعية في النظام المعتمد مع مراعاة الوصول.",
              "label": "Record necessary information objectively in the approved system with access controls.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000058",
              "value": 70,
              "label_ar": "أضيف ملاحظة مختصرة في نظام الفريق وأراجع وضوحها.",
              "label": "Add a brief note in the team system and check clarity.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000059",
              "value": 40,
              "label_ar": "أرسل التفاصيل إلى مجموعة دردشة واسعة للفريق.",
              "label": "Send details to a broad team chat.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000060",
              "value": 0,
              "label_ar": "أحتفظ بالتفاصيل في تطبيق شخصي.",
              "label": "Keep details in a personal app.",
              "is_trap": false
            }
          ]
        },
        {
          "code": "Q16",
          "text_ar": "وجدت سعرين مختلفين للخدمة نفسها. ماذا تفعل قبل إبلاغ المراجع؟",
          "text": "You find two prices for the same service. What do you do before quoting?",
          "question_type": "select",
          "is_required": true,
          "options": [
            {
              "id": "91000000-0000-4000-8000-000000000061",
              "value": 40,
              "label_ar": "أستخدم الأقل ثم أوضح التفاصيل لاحقاً.",
              "label": "Use the lower one and clarify later.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000062",
              "value": 100,
              "label_ar": "أتحقق من المصدر المعتمد والسعر الحالي قبل الإجابة.",
              "label": "Check the approved source and current price before answering.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000063",
              "value": 70,
              "label_ar": "أوضح أنني أتحقق وأعود بإجابة مؤكدة.",
              "label": "Explain you are checking and return with a confirmed answer.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000064",
              "value": 0,
              "label_ar": "أختار السعر المرجح دون تحقق.",
              "label": "Choose the likely price without verification.",
              "is_trap": false
            }
          ]
        }
      ]
    },
    {
      "code": "A9",
      "title_ar": "التنسيق والتسليم بين الفريق",
      "title": "Coordination and team handoffs",
      "description": "توحيد الرسائل وتحديد مسؤول الخطوة التالية والتحقق من المتابعة.",
      "weight": 11.11,
      "questions": [
        {
          "code": "Q17",
          "text_ar": "تلقى المراجع تعليمات مختلفة من شخصين. كيف تعالج الموقف؟",
          "text": "A patient receives conflicting instructions from two people. How do you respond?",
          "question_type": "select",
          "is_required": true,
          "options": [
            {
              "id": "91000000-0000-4000-8000-000000000065",
              "value": 70,
              "label_ar": "أطلب اتباع أحدث رسالة وأتحقق لاحقاً من التفاصيل.",
              "label": "Ask them to follow the latest message and check details later.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000066",
              "value": 40,
              "label_ar": "أرسل التعليمات لديّ وأذكر أن زميلي قد يضيف معلومات.",
              "label": "Send my instructions and note a colleague may add more.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000067",
              "value": 100,
              "label_ar": "أتحقق مع الفريق وأوضح تعليمات موحدة وأصحح التعارض.",
              "label": "Verify with the team, provide consistent instructions, and correct the conflict.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000068",
              "value": 0,
              "label_ar": "أترك كل شخص يشرح وجهة نظره للمراجع.",
              "label": "Let each person explain their version.",
              "is_trap": false
            }
          ]
        },
        {
          "code": "Q18",
          "text_ar": "طلب المراجع تحديثاً عن موضوع يتابعه فريق آخر. كيف تضمن الاستمرارية؟",
          "text": "A patient asks for an update handled by another team. How do you ensure follow-up?",
          "question_type": "select",
          "is_required": true,
          "options": [
            {
              "id": "91000000-0000-4000-8000-000000000069",
              "value": 40,
              "label_ar": "أرسل الطلب للمجموعة وأفترض أن أحداً سيتابعه.",
              "label": "Send the request to the group and assume someone will follow up.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000070",
              "value": 100,
              "label_ar": "أحدد الجهة والمسؤول والخطوة التالية وأتحقق من وصول التحديث.",
              "label": "Identify the team, owner and next step, then confirm the update reaches the patient.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000071",
              "value": 70,
              "label_ar": "أوضح متى يتوقع تحديثاً وكيف يستفسر مجدداً.",
              "label": "Explain when to expect an update and how to enquire.",
              "is_trap": false
            },
            {
              "id": "91000000-0000-4000-8000-000000000072",
              "value": 0,
              "label_ar": "أعد بحل فوري قبل معرفة المسؤول.",
              "label": "Promise an immediate resolution before identifying the owner.",
              "is_trap": false
            }
          ]
        }
      ]
    }
  ]
}
$matrix_data$::jsonb;
 v_family uuid;v_id uuid:=gen_random_uuid();v_ax jsonb;v_q jsonb;v_o jsonb;v_axis uuid;v_qid uuid;v_ai integer;v_qi integer;v_oi integer;v_ac integer:=0;v_qc integer:=0;v_oc integer:=0;
begin
 if exists(select 1 from public.assessment_families where slug='matrix-comprehensive-assessment') then raise exception 'Assessment family already exists; refusing duplicate seed'; end if;
 insert into public.assessment_families(slug,created_by) values('matrix-comprehensive-assessment',null) returning id into v_family;
 insert into public.assessment_types(id,slug,title_ar,title_en,description,status,has_traps,has_ev_simulator,is_active,version,config_version,question_count,axis_count,created_by,family_id,axis_roles,kpi_mappings,ev_mappings)
 values(v_id,v_data->>'slug',v_data->>'title_ar',v_data->>'title_en',v_data->>'description','draft',false,false,true,1,1,0,0,null,v_family,v_data->'axis_roles',v_data->'kpi_mappings',v_data->'ev_mappings');
 for v_ax,v_ai in select value,ordinality::integer from jsonb_array_elements(v_data->'axes') with ordinality loop
  insert into public.axes(assessment_type_id,title,title_ar,code,weight,display_order,status,description) values(v_id,v_ax->>'title',v_ax->>'title_ar',v_ax->>'code',(v_ax->>'weight')::numeric,v_ai,'active',v_ax->>'description') returning id into v_axis;v_ac:=v_ac+1;
  for v_q,v_qi in select value,ordinality::integer from jsonb_array_elements(v_ax->'questions') with ordinality loop
   insert into public.questions(assessment_type_id,axis_id,question_text_ar,question_text,code,question_type,display_order,is_required,status) values(v_id,v_axis,v_q->>'text_ar',v_q->>'text',v_q->>'code',v_q->>'question_type',v_qi,true,'active') returning id into v_qid;v_qc:=v_qc+1;
   for v_o,v_oi in select value,ordinality::integer from jsonb_array_elements(v_q->'options') with ordinality loop
    insert into public.options(id,question_id,label_ar,label,option_value,option_index,display_order,is_trap) values((v_o->>'id')::uuid,v_qid,v_o->>'label_ar',v_o->>'label',(v_o->>'value')::integer,v_oi-1,v_oi,false);v_oc:=v_oc+1;
   end loop;
  end loop;
 end loop;
 update public.assessment_types set axis_count=v_ac,question_count=v_qc,updated_at=now() where id=v_id;
 if v_ac<>9 or v_qc<>18 or v_oc<>72 then raise exception 'Seed counts mismatch: %, %, %',v_ac,v_qc,v_oc; end if;
 perform public.write_admin_audit('assessment.seed_draft','assessment_types',v_id,v_family,null,jsonb_build_object('status','draft','axis_count',v_ac,'question_count',v_qc,'option_count',v_oc,'source','assessments/matrix-comprehensive-assessment.v1.json'));
end;
$matrix_seed$;
