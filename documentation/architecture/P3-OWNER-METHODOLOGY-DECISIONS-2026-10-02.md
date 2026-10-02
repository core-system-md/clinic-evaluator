# P3 Owner Methodology Decisions — 2026-10-02

## Status

Owner-confirmed methodology decisions following the P3 conceptual clarification round.

These decisions supersede ambiguity in earlier drafts where the relevant point was explicitly left open. Gate B is now complete at the methodology level; implementation, integration, and empirical verification remain before production.

## 1. Result shape

The assessment result is a **multi-dimensional profile**, not merely one undifferentiated number.

A secondary overall composite may exist where methodologically justified, but it must not erase the dimensional profile.

## 2. Performance vs maturity

**Performance and institutional/system maturity are separate dimensions.**

The model must distinguish:
- what is actually happening in practice;
- how systematic, standardized, measurable, and sustainable the underlying system is.

An excellent manual practice must not be automatically downgraded merely because it is manual. Conversely, the existence of automation must not be treated as evidence of good performance when it is unused or poorly governed.

## 3. Critical domains

Critical domains such as privacy, patient understanding, and other safety/professional-critical constructs should be represented through **critical flags/gates and diagnostics**, rather than relying on arbitrary numeric penalties.

Detection and scoring effect are separate concepts. No automatic penalty is introduced merely because a critical condition exists.

## 4. System absence affects the result

Where the assessment construct explicitly measures institutional/system capability, absence of a functioning system is a real performance/maturity deficiency and may reduce the relevant result.

This does not mean that every manual process is deficient. The scoring must follow the construct being measured.

## 5. Development/transformation opportunity

The model should explicitly preserve a **development/transformation opportunity dimension**.

This is part of MD Code's assessment purpose: identifying where training, consulting, operational development, measurement, or systemization may create value.

It must be measured from evidence in the assessment rather than invented as a generic business score.

## 6. Semantic state remains first-class

Response interpretation must preserve a semantic state independently from the numeric score.

A numeric value is an output of interpretation, not the meaning itself.

Therefore:
- the system may retain 0/40/100 where those anchors remain semantically valid;
- the system may use 0/30/50/80/100 for questions where a five-state ordered distinction is genuinely required;
- no universal response scale is imposed across all questions;
- changing from 0/40/100 to a five-point scale requires item-level semantic justification and validation.

## 7. Common measurement kernel

The five assessments should use a **shared measurement kernel**, while activating different components according to the purpose and scope of each assessment.

The common kernel should provide consistent concepts for:
- response interpretation;
- item scoring;
- performance;
- maturity/capability;
- evidence/measurement;
- consistency;
- coverage/missingness;
- criticality;
- development opportunity;
- aggregation.

The assessments must not be forced into one identical equation when their constructs and purposes differ.

## 8. Immediate methodological consequence

The next scoring design task is **not** to replace 0/40/100 globally.

Instead, each item must be classified as:
1. 0/40/100 remains semantically sufficient;
2. a different ordered scale is required, potentially 0/30/50/80/100;
3. a binary/state interpretation is more appropriate;
4. a numeric score should not be the primary representation and the item should contribute through evidence/flag/coverage/diagnostic logic.

## 9. No implementation freeze yet

These decisions authorize completion of the measurement/scoring design work only. They do not authorize production semantic changes.

The implementation checkpoint remains after:
- item-level scale decisions;
- component aggregation;
- performance/maturity separation;
- criticality/gate behavior;
- development-opportunity construction;
- empirical validation against all five assessments;
- migration and rollback design;
- test specification.

## 10. Owner boundary

Visible question and answer text remains protected during this methodology work unless a separate content decision is made.

The scoring model may be substantially re-corrected; preserving existing numeric encodings is not itself a requirement.
