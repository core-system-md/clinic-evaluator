# C-03 guarded deployment blocker — 2026-10-29

Status: NOT RELEASED. Do not bypass the guarded release process.

- Run 40754502541 passed OIDC preflight but failed while waiting for the exact Edge runtime attestations. The workflow had no deployment steps, so both production release writes were skipped.
- Main commit ab5815c85401560637c60a4cb6475147bbe2aba2 corrects .github/workflows/c03-production-release.yml: prepare the immutable attestation, deploy both Edge functions from the exact checkout, verify both deployed attestations, and only then run release registration/verification/activation.
- Authorized run 40774239607 passed OIDC preflight and exact-main check, then failed closed because the GitHub Actions production-e2e environment did not supply SUPABASE_ACCESS_TOKEN. Both deployments and release writes were skipped.
- Owner action: add a valid Supabase Personal Access Token as the GitHub Actions secret SUPABASE_ACCESS_TOKEN (repository or production-e2e environment scope). Do not paste the token into chat. Then post the exact owner confirmation ENABLE-C03-PRODUCTION on a repository issue to rerun the guarded workflow.
- Live DB read-back: Matrix assessment remains draft; its family has current_published_version_id=NULL and current_release_id=NULL. No release pointer or gate write occurred in either failed run.
- Do not use direct deployment as a workaround. Close only after both deployed runtime attestations pass and live release state is read back.
