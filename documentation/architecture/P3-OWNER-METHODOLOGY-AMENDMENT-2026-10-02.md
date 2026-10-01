# P3 — Owner Methodology Amendment: Option Count Is Not a Scoring Rule

**Date:** 2026-10-02  
**Status:** Owner methodology decision / design input — non-production

## 1. Decision

The number of response options does **not** determine the scoring scale.

This applies equally to questions with 3, 4, or 5 response options.

The decision sequence is:

1. What construct does the question measure?
2. What does each response state actually mean?
3. What is the direction of the state?
4. Are the states monotonic within one construct?
5. Is the response a performance state, maturity state, evidence state, context state, or consistency signal?
6. Only then is a numeric anchor selected.

Therefore:

- 3 options do not automatically mean 0/40/100.
- 4 options do not automatically require a new four-point scale.
- 5 options do not automatically mean 0/30/50/80/100.
- option index is never a score.

## 2. Indirect verification questions

Some questions function as indirect verification questions even when their options are not marked `is_trap=true`.

A response can sound sophisticated while merely being a claim of practice.

For these items:

- the response identity is retained;
- the semantic state is interpreted separately;
- claim/evidence/consistency are kept distinct from performance;
- no automatic penalty is introduced merely because a response is suspicious;
- a consistency rule may later compare the response with other answers/evidence.

This preserves the distinction between assessment and accusation.

## 3. Clinic-performance: Q4, Q5, Q6

The owner decision is to keep the current encoding:

- Q4: `0/0/40/100/100`
- Q5: `0/0/40/100/100`
- Q6: `0/0/40/100/100`

They are **not** converted to `0/30/50/80/100`.

The reason is semantic, not the number of options: these questions can expose a gap between an asserted practice and a genuinely established/observable practice. A more elaborate answer is not automatically a better measured outcome.

## 4. Four-option medical-team questions

The review confirms that the following existing encodings are semantically meaningful and should not be normalized merely because they contain four options:

- Q8b0866: `0/40/100/0`
- Q03dc5a: `0/40/100/40`
- Q0a8cea: `0/40/100/40`
- Q6c6668: `0/40/100/40`
- Q76b7ab: `0/40/100/40`
- Q4084c8: `0/40/100/40`
- Q8e7ea4: `100/40/0/0`

Examples:

- “حسب الطبيب/الحالة” can represent variability rather than a higher/lower linear state.
- “يعتمد على عدد أفراد الفريق” can indicate absence of a balanced system rather than an intermediate performance level.
- privacy and patient-understanding questions may carry criticality/diagnostic meaning independently from their numeric anchor.

## 5. Specific correction: Medical Q2c9f29

Current:

`100/40/0/0`

New proposed semantic encoding:

`100/40/40/0`

Question: **ما السبب الأكثر شيوعاً لإعادة شرح الخطة العلاجية للمريض؟**

Disposition:

1. “لا يحدث ذلك غالباً” → 100
2. “بعض التفاصيل تحتاج إلى توضيح إضافي لاحقاً” → 40
3. “يعود المرضى غالباً بأسئلة أساسية حول الخطة نفسها” → 40
4. “لا يتم تتبع هذا الأمر” → 0

Rationale: the third response indicates a weak communication/understanding signal, but it is not equivalent to complete absence of the practice. The fourth response is an evidence/measurement gap.

## 6. Implementation consequence

The future scoring kernel must consume a response-interpretation record rather than treating `option_value` as a universal score.

Required conceptual path:

`selected option → semantic state → construct-specific representation → aggregation`

The implementation must support non-monotonic/contextual states and consistency signals without silently converting them to arbitrary numeric ranks.

## 7. Production gate

This amendment is design-only.

No production question text, option text, option values, scorer, schema, historical result, or published assessment version is changed by this document.

The next implementation gate remains:

- complete response interpretation registry for all 93 questions/options;
- owner-reviewable disposition;
- construct/component aggregation contract;
- pinned interpretation version;
- tests against historical and synthetic cases;
- only then production implementation.
