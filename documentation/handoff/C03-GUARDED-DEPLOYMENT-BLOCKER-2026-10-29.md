# C-03 guarded deployment status — correction — 2026-10-29

Status: NOT RELEASED. This correction supersedes the previous instruction in this file to create `SUPABASE_ACCESS_TOKEN`.

## Correction of the deployment-path deviation
- Commit `ab5815c85401560637c60a4cb6475147bbe2aba2` added a `SUPABASE_ACCESS_TOKEN` requirement and direct Supabase CLI deployment steps. Those were not present in the prior guarded workflow and are not an approved requirement established by the governing project path.
- The incorrect requirement has been removed in commit `f0f2fc5780daa7094f069f68f4d42aaf99165cab`. The workflow is restored to its prior OIDC-only authorization and read-only runtime-attestation wait before any release write.
- Do not ask the owner to create `SUPABASE_ACCESS_TOKEN`. Do not substitute `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY` for a deployment credential.
- The restored workflow still fails closed unless both deployed Edge Functions attest the exact current `main` commit and source digest. The mechanism that deploys those exact Edge bundles must follow the already approved deployment path; this correction does not claim that deployment has occurred.

## Evidence and remaining work
- Run 40754502541 passed OIDC preflight but failed while waiting for the exact Edge runtime attestations. No release writes occurred.
- Run 40774239607 failed at the unapproved credential gate introduced by commit `ab5815c85401560637c60a4cb6475147bbe2aba2`; it did not deploy either Edge Function or write release state. That credential failure is not a valid project blocker.
- Previous live read-back showed the Matrix assessment remained draft with `current_published_version_id=NULL` and `current_release_id=NULL`. Re-read current Production state after the exact Edge bundles have been deployed and attested.
- Do not rerun the release workflow until the deployed Edge bundles are confirmed to match the exact current `main` attestation. Do not bypass attestation or write release state directly.
