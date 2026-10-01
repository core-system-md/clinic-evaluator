# P3 Scoring Engine Architecture — Decision Baseline

**Date:** 2026-10-01  
**Status:** **DRAFT — OWNER DECISIONS PENDING**
**Scope:** scoring semantics, configuration ownership, calculation pipeline, provenance, reproducibility, test contract

## 1. Architectural objective

P3 must produce one authoritative, deterministic scoring contract for every assessment version without changing the product methodology by assumption.

The intended boundary is:

`assessment-version data → one server scoring engine → one calculation contract → one persistence contract → reproducible result`

The engine must remain server-authoritative in accordance with ADR-007.

## 2. Proposed module boundaries for review

### A. Input contract

Input consists of the session-pinned assessment version and raw answer selections. The scoring layer receives validated answer values, not browser-supplied scoring rules.

Required validation belongs before or at the scoring boundary:

- question belongs to the pinned version;
- option belongs to the question;
- selected option value matches the stored option;
- required questions are present;
- no duplicate question answer;
- numeric scoring values are in the allowed configuration range.

### B. Assessment scoring configuration

The concrete assessment version owns the rules required to interpret its responses:

- axis membership and weights;
- question impact;
- trap definitions;
- axis-role mappings;
- KPI mappings;
- EV mappings/configuration;
- any additional scoring constants that are intentionally versioned.

A distinction remains to be decided for methodology-global constants versus version-owned configuration.

### C. Calculation pipeline

Recommended implementation boundary for review:

1. validate configuration;
2. normalize answer inputs;
3. compute raw axis accumulation;
4. apply impact multipliers;
5. evaluate trap conditions and penalties;
6. calculate final axis percentages;
7. calculate global weighted result;
8. translate axes to role scores;
9. calculate KPIs;
10. calculate EV where enabled;
11. derive classification/leakage;
12. return a typed calculation result.

No step should be duplicated in HTTP handlers.

### D. Persistence contract

Persistence should distinguish at least:

- raw earned points;
- raw maximum possible points;
- final percentage;
- configured weight;
- weighted contribution;
- grade/classification;
- scoring engine version.

The current `scores.raw_score` usage does not satisfy that semantic separation and should not be silently reinterpreted without a migration/data-contract decision.

### E. Provenance

Every completed result should be reproducible from:

`assessment family/version + scoring engine version + deterministic scoring contract`.

An optional content/config digest can strengthen this guarantee where required.

## 3. Current implementation mapping

| Architecture boundary | Current implementation | Match |
|---|---|---|
| Server-authoritative completion | `assessment-access` → `calculateAssessment` | ✅ |
| Pinned assessment input | session `assessment_type_id` + version check | ✅ |
| Central scoring module | `score-engine.ts` | ✅ |
| One EV calculation path | Engine + separate `calculate_ev` handler | ❌ |
| Configuration validation | Browser reference has validation; server scorer relies mainly on runtime checks | Partial |
| Canonical trap representation | Multiple representations exist; scorer uses `public.traps` | ❌ |
| Canonical weight representation | 1-based and 100-based scales coexist | ❌ |
| Raw/final score persistence separation | `raw_score` duplicates final percentage | ❌ |
| Deterministic fixture suite | 3 parity cases | Partial |
| Immutable engine provenance | `server-score-v1` stored | Partial |
| Legacy path consolidation | legacy scorer + dead adapter remain | ❌ |

## 4. Required engineering artifacts for P3 completion

### 4.1 P3 Scoring Contract

A single version-controlled specification defining:

- allowed answer values;
- impact constants;
- raw score formula;
- trap trigger semantics;
- trap penalty formula;
- axis normalization;
- axis weight units;
- global aggregation;
- role translation;
- missing-role behavior;
- KPI universe and mappings;
- EV formula and simulator inputs;
- classification thresholds;
- leakage definition;
- rounding policy;
- zero/empty-data behavior.

### 4.2 Deterministic fixture catalog

Each fixture must declare:

- assessment version/config;
- answer vector;
- expected raw axis state;
- expected penalties/traps;
- expected final axis scores;
- expected global score/classification;
- expected role scores;
- expected KPI values;
- expected EV when enabled.

Fixtures must include boundary and failure cases, not only happy paths.

### 4.3 Engine version manifest

A version manifest should tie `server-score-v1` (or later) to:

- immutable source/reference;
- scoring contract version;
- fixture set version;
- release commit/reference;
- migration/runtime compatibility notes.

The owner must decide whether the source reference is a Git commit/tag, a semantic engine version, or both.

### 4.4 Runtime parity test

The parity test should compare the current authoritative server engine against the frozen reference fixtures. The browser reference should not remain a second executable authority indefinitely.

### 4.5 Persistence integrity test

Tests must prove stored score rows are mathematically derived from the engine result and that re-running completion does not alter the stored result.

## 5. Architectural decision questions

These are the questions that require owner decisions before semantic changes:

### D1 — Canonical raw-score semantics

Should `raw_score` mean the pre-normalization earned points, or is the field intentionally a synonym for final percentage? The current runtime stores the final percentage in both `raw_score` and `percentage`.

### D2 — Axis weight representation

Should axis weights be canonical fractions summing to `1.0`, or canonical percentages summing to `100`? Current production contains both representations. The mathematical aggregation currently normalizes either representation, but configuration/persistence semantics remain ambiguous.

### D3 — Impact multipliers

Are high/medium/low multipliers permanently defined as `1.5 / 1.0 / 0.5`, and should these be global methodology constants or version-owned rules?

### D4 — Trap authority

Which representation is authoritative for traps: `public.traps`, `options.is_trap`, `questions.layer/trap_for`, or a deliberately defined combination? The current live data contains conflicting representations and an invalid trap row.

### D5 — Trap trigger and penalty semantics

Once the authoritative trap representation is chosen, what is the exact trigger condition and penalty formula? The current engine activates when the validated target answer is `100` and interpolates between `penalty_base` and `penalty_max` using answer divergence.

### D6 — Missing-role policy

When a KPI requires a role not measured by the assessment, should the role be imputed using the average of available axis scores, omitted from the KPI, or cause the KPI to be unavailable? The current implementation uses average-score fallback.

### D7 — KPI universe

Should the eight standard KPIs be produced for every assessment regardless of whether the assessment directly measures all required roles, or should KPI availability follow substantive coverage by that assessment?

### D8 — KPI mapping ownership

Are KPI mappings global methodology rules, or are they version-owned assessment configuration? P2 currently treats them as part of the concrete version because they live on `assessment_types` and are copied with versions.

### D9 — EV canonical formula

Which EV contract is authoritative: the scoring engine's `current/potential/gap` formula, the interactive simulator's `current/opt20/opt50` formula, or a new explicitly specified model? The existing two paths are not mathematically identical.

### D10 — EV input semantics

What do `avg visit value`, `visits/year`, `years`, and any referral input represent mathematically? The current interactive endpoint currently ignores the referral field and derives LTV and flow in a way that differs from the engine interface.

### D11 — Classification / grade semantics

Are Q1–Q4 intended only as classification bands, or are they also the persisted `scores.grade` value? If both, are the same thresholds required for axis and overall results?

### D12 — Rounding policy

At which stages should rounding occur? The current engine rounds axis percentages and the global result, while weighted arithmetic before rounding retains the rounded axis scores.

### D13 — Engine version policy

When any scoring formula or rule changes, should the engine version necessarily advance (for example `server-score-v2`) and become immutable for historical replays?

### D14 — Reproducibility artifact

Is `assessment_version + scoring_engine_version` sufficient, or should completed results also persist a scoring-contract/config digest or calculation-input snapshot?

### D15 — Legacy scoring paths

Should `calculate_session_score` and the unused `scoring.ts` adapter be retired after replacement/verification, or retained in quarantined compatibility form? No production deletion is proposed until the owner chooses the policy.

### D16 — Historical score-row reconciliation

Five completed sessions currently have no score rows. Should these be left as historical legacy records, backfilled/recomputed under an explicitly chosen engine contract, or handled through a separate migration policy? Recomputing historic results must not happen implicitly.

### D17 — Assessment configuration source of truth

The repository contains assessment JSON/configuration files while production runtime reads assessment definitions from Supabase. Should the canonical assessment definition be Git-authored, Supabase-authored, or a controlled hybrid with an explicit synchronization/release process? The answer affects how future scoring configurations and P2 assessment versions are created and audited.

## 6. Non-decisions

P3 investigation does not currently approve:

- any change to impact multipliers;
- any change to trap formulas;
- any change to KPI mappings;
- any change to EV formulas;
- any change to stored historical results;
- removal of legacy functions.

## 7. P3 completion gate after decisions

P3 can move to implementation only after:

1. owner decisions D1–D16 (or explicit marking of non-applicable questions);
2. P3 scoring contract is frozen in version control;
3. deterministic fixtures are created from that contract;
4. server implementation is reconciled to the contract;
5. persisted score semantics are aligned;
6. live data inconsistencies are addressed under explicit migration policy;
7. external and regression verification pass;
8. engine version/provenance is documented.