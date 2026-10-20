# D-05 — Tracked migration DDL statement index

**Pinned migration tree:** `312c60907649aa62de605937a0a82cf5d3fe3b75` (migration paths/blob SHAs later rechecked unchanged on current main). **Scope:** all 56 tracked `supabase/migrations/*.sql` files. This index records line-numbered table-owned DDL statements found in the retrieved source, including table creation/alteration, FK references, indexes, RLS, policies, triggers and direct table grants/revokes. Function-body references are cross-referenced in the main 25-table worksheet; a DDL line hit does not prove the live object is semantically correct. No database or migration changes were made.

## Files 1–5 of 56

### `supabase/migrations/20260930233955_add_server_scoring_rpc.sql`

- Blob SHA: `e2e332e9ea3ad385ae4437eede5305d8df84f673`; tree bytes: 182; retrieved UTF-8 bytes: 182.
- Historical marker only; no persistent table DDL. Content states the corresponding Production change is already present and must not be replayed.

### `supabase/migrations/20260930234340_unify_public_and_protected_assessment_access.sql`

- Blob SHA: `e2e332e9ea3ad385ae4437eede5305d8df84f673`; tree bytes: 182; retrieved UTF-8 bytes: 182.
- Historical marker only; no persistent table DDL. Content states the corresponding Production change is already present and must not be replayed.

### `supabase/migrations/20260930234428_preserve_access_for_idempotent_completion.sql`

- Blob SHA: `e2e332e9ea3ad385ae4437eede5305d8df84f673`; tree bytes: 182; retrieved UTF-8 bytes: 182.
- Historical marker only; no persistent table DDL. Content states the corresponding Production change is already present and must not be replayed.

### `supabase/migrations/20260930234953_pin_assessment_version_on_session.sql`

- Blob SHA: `e2e332e9ea3ad385ae4437eede5305d8df84f673`; tree bytes: 182; retrieved UTF-8 bytes: 182.
- Historical marker only; no persistent table DDL. Content states the corresponding Production change is already present and must not be replayed.

### `supabase/migrations/20260930235404_admin_identity_foundation.sql`

- Blob SHA: `e2e332e9ea3ad385ae4437eede5305d8df84f673`; tree bytes: 182; retrieved UTF-8 bytes: 182.
- Historical marker only; no persistent table DDL. Content states the corresponding Production change is already present and must not be replayed.


## Files 6–10 of 56

### `supabase/migrations/20261001061605_admin_dashboard_auth_hardening.sql`

- Blob SHA: `1b703cd7cf71437cebbacfac35ffb8d0c239c6b2`; tree bytes: 2207; retrieved UTF-8 bytes: 2207.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261001080710_p1_pg_net_client_execute_revoke.sql`

- Blob SHA: `78ec66b61baed7998fb9bef4ba64f76f59a10739`; tree bytes: 605; retrieved UTF-8 bytes: 605.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261001080714_p1_revoke_client_trigger_helper.sql`

- Blob SHA: `105059bf6e02a465691a41c6a69fadd3fd1cb971`; tree bytes: 164; retrieved UTF-8 bytes: 164.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261001080806_p1_relocate_pg_net_to_extensions.sql`

- Blob SHA: `0255f8b80332a1cd06887f4e1f94974b27687574`; tree bytes: 224; retrieved UTF-8 bytes: 224.
- No line-level table-owned DDL hit in the scanned lines; references/function bodies are handled in the 25-table worksheet.

### `supabase/migrations/20261001083056_p1_e_fix_answers_upsert_conflict.sql`

- Blob SHA: `837394d11f94420e14433936fbcabe7e1979636e`; tree bytes: 270; retrieved UTF-8 bytes: 270.
- L4 [answers]: `alter table public.answers`
