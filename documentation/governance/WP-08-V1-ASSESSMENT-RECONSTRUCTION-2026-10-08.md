# WP-08 — V1 Assessment Reconstruction
## 2026-10-08

**Work package:** WP-08 — Assessment V1 reconstruction  
**Governing contract:** FINAL-IMPLEMENTATION-CONTRACT-2026-10-07  
**Base:** main at f793957e6a9ff42c3b7f60202f89786ababd3042  
**Branch:** wp-08-v1-assessment-reconstruction-2026-10-08  
**Status:** IMPLEMENTATION IN PROGRESS  
**Production mutation:** NO

## Scope
Reconstruct the final public V1 content for Comprehensive Clinic and Patient Journey from approved content, preserving the stable family slug while resetting final version identity to V1.

## Safety boundary
Published V1/V2 rows are not mutated in place. Final V1 rows are created, validated/routed, and only then are superseded versions removed after dependency checks.

## Acceptance
- Comprehensive Clinic final V1 = exact approved V2 content with identity reset only.
- Patient Journey final V1 = approved corrected-content artifact.
- 36/152 and 25/75 content counts are preserved.
- Axis weights remain canonical.
- Patient Journey semantic-only question remains non-scoreable.
- No V2 product identity remains after reconstruction.
- Dependency checks block deletion when historical/runtime references exist.
- Dedicated PostgreSQL harness executes the migration against disposable data.

No production deployment is included.
