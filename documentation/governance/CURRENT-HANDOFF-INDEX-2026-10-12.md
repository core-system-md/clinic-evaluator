# Current Handoff Index — 2026-10-12

**Repository:** `core-system-md/clinic-evaluator`  
**Supabase project:** `oaqpzaarppccbnepffxx`  
**Cloudflare Pages:** `clinicevaluat`  
**Production branch:** `main`

Use this index for the current D-09–D-19 repair sequence. The 2026-10-10 Production Structured Result handoff remains historical context, not the current queue.

## Verified current state

- **D-09:** PR #81 merged with commit `6b9de8affde4737e4d15f069bcbe9dee3c0d7e33`. Cloudflare Pages deployment `df10f1e1-01ca-4c61-8d51-d84597c50e8f` completed successfully. Post-deployment checks: `/assets/data/comprehensive_assesstment.json` returned `Not Found`; `/assets/data/report_texts.json` remains available at version `2.2.0`. The three legacy assessment assets and tested internal registry paths passed on preview. Additional Production probes were rate-limited, so those paths are not claimed as independently re-verified on Production. D-09 follow-up documentation is in PR #82 and is not yet in `main`.
- **PR #82:** documentation-only D-09 production verification update, open and unmerged. It does not change production resources.
- **PR #80:** documentation-only D-13 decision correction and this handoff index; open, Draft, unmerged. Its PR description has been updated to reflect D-09's deployed status.
- **PR #79:** C-01 interpretation identity repair, open, Draft, unmerged; head `7114737af8d11ae1b2a3b7f6f100765320c3169b`.
- **CI for PR #81:** run [38223253283](https://github.com/core-system-md/clinic-evaluator/actions/runs/38223253283) passed P3 isolated kernel, full Node test suite, and P4 disposable PostgreSQL.
- Cloudflare Pages project configuration was read-only checked as production branch `main`, root directory `/`, destination directory `/`, `path_includes=["*"]`, and `path_excludes=[]`.

## Owner decisions and safety boundaries

1. Historical-record deletion was decided and executed. The prior handoff's unresolved-decision wording was wrong. Preserve counts and historical autovacuum timestamp from the D-13 record; do not repeat deletion or restoration.
2. Previous Production migrations were not owner-approved. D-14 must inventory their effects and design any necessary forward-only compensating repair. Do not edit applied migration files, rewrite migration history, or execute Production repair without explicit approval.
3. EV Simulator must be repaired, not hidden.
4. Internal repository assets must not be exposed through Pages. Client-required assets such as `assets/data/report_texts.json` must remain available.
5. The owner's explicit approval covered merge/publication of PR #81 only. It does not authorize merging PR #80, #79, #82 or any unrelated production change.

## Exact next work

### First: D-13 documentation review
Review PR #80's historical-deletion decision record and handoff index. Documentation only: no Supabase SQL, data mutation, migration execution, Edge Function deployment, or Cloudflare setting changes. Once D-13 is reviewed and closed, stop before starting D-14.

### Then, one bounded work package at a time
- D-14: read-only impact inventory for the three unapproved Production migrations, then repair design only.
- C-02: forward-only fix for the answer-value constraint rejecting `70`, tested on disposable PostgreSQL.
- C-03: explicit interpretation-binding and complete option-identity coverage gate.
- D-06: repair EV Simulator calculation inputs/defaults and publish a new version rather than editing a published version.
- D-04/D-12: make Structured Result authoritative and remove dead code.
- D-05: live baseline schema and retired Edge Function documentation.
- D-08/D-15/D-17: authorization and identity discovery.
- D-07: legacy functions/schema review before removal.
- D-18: result accuracy.
- D-16: naming.
- D-19: document the leaked-password decision only; no security change without a new decision.

## Mandatory operating contract

- One bounded work package at a time: inspect → implement only its scope → dedicated tests → update docs/Handoff → report evidence and status → stop.
- Each package has a maximum budget of three hours; stop and report if exceeded. Do not invent time accounting.
- Do not automatically advance to the next package.
- Mark absent runtime evidence **NOT VERIFIED**, not PASS.
- No Production writes, migrations, Edge deployment, shared Cloudflare setting change, or Pages publication without explicit owner approval.
- Do not repeat previously verified work unless new evidence shows a regression.
