# P3 — Production Migration Safety Contract Test
## 2026-10-02

This file documents the executable gate shape for the migration stage.

The production migration is not represented as SQL yet because schema changes must be generated through the Supabase migration workflow when authorized.

The required assertions are:
- legacy interpretation provenance is not fabricated;
- legacy results are not overwritten;
- P3 result persistence is additive;
- runtime rollback returns to the legacy scorer without data deletion;
- P3 result provenance is sufficient for replay/audit;
- RLS and privileged completion access are reviewed before deployment.

No production mutation is included.
