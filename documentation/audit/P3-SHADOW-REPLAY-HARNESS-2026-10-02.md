# P3 — Shadow Replay Harness
## 2026-10-02

**Status:** non-production audit harness.

The shadow replay fixture intentionally uses the two current completed sessions that have complete answer-level source:
- Admin Reception: session `9d1a5240-fe3b-485a-956c-e44138544f90`
- Patient Journey: session `0c64e5c1-90db-4f99-8798-918c07afda5c`

The harness:
- resolves the stored option identities through the P3 interpretation registry;
- computes the P3 multi-dimensional profile;
- verifies deterministic replay;
- records the legacy overall score as a separate reference;
- does not overwrite or update any historical row.

The shadow harness is intentionally not yet delta-comparing the legacy overall to the isolated P3 profile because this harness predates integration of the approved global `overallScore`. The component/profile percentages are construct-specific; the eventual global `overallScore` will use the approved existing axis/dimension weights at the global result stage.

The resulting layer-level values are emitted by the hosted test logs and become the input to the final migration decision.

No production data is modified.
