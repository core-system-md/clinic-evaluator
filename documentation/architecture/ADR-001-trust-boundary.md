# ADR-001 — Clinic Evaluator Trust Boundary

**Status:** Accepted  
**Decision owner:** Project owner  
**Date:** 2026-10-01  
**Repository:** `core-system-md/clinic-evaluator`

## Context

P0 investigation found overlapping security approaches: public Supabase client access, broad anonymous RLS policies, exposed `SECURITY DEFINER` administrative RPCs, a transitional `admin-auth` Edge Function, and a browser-side admin gate. The project also contains a real assessment-access system based on assessment credentials, usage limits, and expiry, which is currently not connected to a payment gateway.

The product is a privately owned assessment system. It is not intended to become a multi-tenant SaaS platform where independent customers receive isolated administrative spaces. The assessment engine may later be generalized to other sectors beyond healthcare. Assessments may be customized for clients on request, but clients do not become independent system tenants.

## Decision

Adopt a **Hybrid Architecture + Real Admin Authentication**.

### 1. Ownership and administration

- There is exactly one primary Owner account.
- The system supports additional administrative users.
- Administrative users have real authenticated accounts.
- Administrative authorization is server-side and role/permission based.
- The Owner has full administrative authority; administrators do not automatically receive Owner privileges.

### 2. Public assessment experience

- Public assessments remain usable without requiring a general user account.
- Anonymous users may perform only the operations required by the public assessment workflow.
- Anonymous access must not imply access to unrelated historical or administrative data.

### 3. Protected assessments

The existing assessment-access system is a real product capability and will be retained.

It is separate from administrator authentication:

- **Admin authentication:** determines who may manage Clinic Evaluator.
- **Assessment access:** determines who may take a particular protected assessment.

The existing assessment credential/password, expiry, usage-limit, and activation concepts remain valid architectural requirements.

Payment integration is intentionally outside this decision. When introduced, payment will create or modify an entitlement/access state rather than becoming the authentication mechanism itself.

### 4. Data protection boundary

Sensitive operational data—including leads, sessions, answers, scores, assessment-user credentials/access records, and administrative configuration—must not be broadly readable or writable by the anonymous public role.

The browser must not be treated as trusted merely because it uses the publishable Supabase key.

### 5. Privileged operations

Administrative operations must be protected by actual authorization. Naming a database function `*_secure` is not considered an authorization mechanism.

Privileged database functions will be reviewed and either:

- converted to an appropriate invoker/RLS model;
- tightly restricted to the intended server role;
- replaced by a narrowly scoped server application API; or
- removed when obsolete.

No privileged RPC remains publicly executable solely for convenience.

### 6. No multi-tenancy

Clinic Evaluator will not be redesigned as a multi-tenant SaaS product at this stage.

The system remains owned and operated as one platform. Client-specific assessments are content/configuration delivered by the platform, not isolated customer tenants.

### 7. Future engine generalization

The assessment engine should be designed so that healthcare-specific concepts are not unnecessarily embedded in the core execution engine. Future sector expansion should be possible by supplying different assessment definitions, scoring/configuration rules, content, and sector-specific modules.

This is an architectural direction, not a requirement to generalize every current component immediately.

## Consequences

### Positive

- Clear separation between public assessment users and administrators.
- Real administrator identity and authorization.
- Existing protected-assessment capability is preserved.
- No unnecessary multi-tenant complexity.
- Sensitive data can be moved behind an explicit security boundary.
- Future payment integration can attach to access/entitlement without coupling payment to identity.
- The assessment engine can evolve beyond healthcare without forcing a SaaS tenancy model.

### Costs / work required

- Replace the current browser-side admin gate with real authentication.
- Introduce explicit Owner/Admin authorization.
- Narrow anonymous RLS/table privileges.
- Review and redesign exposed privileged RPCs.
- Define the server-side API boundary for administrative and sensitive operations.
- Preserve and harden the existing protected-assessment flow.
- Add appropriate administrative audit logging.

## Explicitly rejected assumptions

- The project is not being converted into a multi-tenant SaaS platform.
- Protected assessments are not being removed merely because payment is currently absent.
- Payment is not part of the authentication decision.
- Anonymous access is not being removed from the public assessment experience.
- No production security policy or privileged function is to be changed merely because P0 identified it; implementation follows after the remaining P0 assessment and owner-approved engineering plan.

## Approval

**Approved by project owner on 2026-10-01.**

This ADR is the architectural authority for the P0 security/trust-boundary remediation unless superseded by a later owner-approved ADR.
