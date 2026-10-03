# P5 — Admin Architecture Consolidation — Implementation Design
## 2026-10-03

**Status:** DESIGN — no production code/database changes authorized by this document  
**Repository:** `core-system-md/clinic-evaluator`  
**Design branch:** `design/p5-admin-2026-10-03`  
**Baseline:** `main` @ `e4c191e6995a9b98b5adb2ab64a79f8806d4c1b8`

## 1. Scope

This design translates the owner-approved P5 decisions into an implementation shape for the existing Admin dashboard.

P5 does **not** replace the current Admin UX/UI. The existing dashboard remains the presentation basis; the work is to make the operations behind it consistent, enforceable, auditable, and aligned with the closed P0–P4 architecture.

P2 remains closed. Assessment family identity and stable public URL remain unchanged. Internal version records remain implementation details and are not presented to assessment users.

## 2. Fixed owner decisions

- Admin backend boundary: **Hybrid**.
- Official Admin operation path: **Hybrid by operation**.
- Authorization: **Owner-controlled named assistants with explicit capabilities; sensitive/system-level powers remain Owner-only**.
- Assessment lifecycle: **family → working copy → validation → public publication**.
- New publication replaces the previous public version automatically.
- Previous content remains available inside Admin and its historical results remain unchanged.
- A previously published version may be returned to public use manually by the Owner when the newer public version is stopped.
- Legacy management paths are retired by controlled migration to the new path; old data is retained for matching/verification where useful.
- Reporting: current official Structured Result first; historical data handled separately.
- Historical completed sessions: shadow/reconciliation only when usable; never overwrite historical results automatically.
- Admin audit trail: required.
- Sensitive changes: official server-side operation path. Safe reads may use direct authenticated reads protected by row-level authorization.
- All capabilities, old or new, are granted or withheld by the Owner.
- Keep the current Admin visual structure; separate functions clearly without a frontend framework rewrite.

## 3. Operating model

### 3.1 What the browser is allowed to do

The browser is responsible for:
- displaying Admin information;
- collecting Admin input;
- requesting an approved operation;
- showing the operation result.

The browser is **not** trusted to decide:
- who is allowed to perform an operation;
- whether a published assessment may be changed;
- whether a version may become public;
- whether a historic result may be rewritten;
- whether one assessment element belongs to another assessment.

Those decisions are enforced server-side.

### 3.2 Two access paths

**Read path**
- Direct reads remain possible where they are safe and fully protected by authenticated Admin authorization.
- Admin-only tables/data must have an explicit read policy; absence of a policy is not treated as a reason to weaken protection.

**Change path**
- Every material change goes through a narrowly named server-side operation.
- No generic browser table write is used for assessment administration.
- Each operation validates its own business rules and records an audit event.

## 4. Admin identity and permissions

### 4.1 Identity

Supabase Auth remains the identity system.

`public.admin_users` remains the authorization source.

### 4.2 Owner and assistants

`admin_users` keeps the distinction between:
- `owner`: the single Owner;
- `admin`: delegated assistant account.

A delegated assistant does not gain Owner authority by virtue of being an Admin.

### 4.3 Capabilities

Add a dedicated per-assistant capability model. Recommended capabilities:

- `assessment.view`
- `assessment.edit`
- `assessment.import`
- `results.view`
- `reports.view`
- `reports.export`
- `access.view`
- `access.manage`

Owner-only capabilities:

- `admin.manage`
- `admin.permissions`
- `public.publish`
- `public.stop`
- `public.restore`
- `system.manage`

The actual list is an implementation boundary, not a promise that every capability must have a visible button immediately.

### 4.4 Enforcement rule

The capability check is performed server-side for every protected operation.

Hiding a button in the browser is only a usability feature; it is never the security control.

## 5. Assessment management

### 5.1 Create a new assessment

The current create path is replaced with one atomic operation:

**Create Assessment**
1. create the assessment family;
2. create its first working copy;
3. attach all definition data to that working copy;
4. leave it non-public;
5. return the created working-copy identifier.

The family public key is generated once and is never silently replaced by a working-copy key.

### 5.2 Create a new working copy from an existing assessment

The existing `create_assessment_version_secure` concept is retained but becomes part of the canonical Admin flow.

It must:
- require an authorized assistant/Owner;
- copy the complete definition graph;
- keep the same assessment family;
- create the new copy as non-public;
- never modify the currently public assessment;
- preserve the historical relationship to the source.

The internal numeric version value may remain for reproducibility and session history, but it is not a user-facing product concept.

### 5.3 Editing

Only a non-public working copy can be edited.

Editing includes:
- assessment title/description and configuration;
- axes;
- questions;
- options;
- supported assessment-specific mappings.

The server must verify that every child item belongs to the same working copy.

### 5.4 Protected content

Published and archived content cannot be edited.

Changing labels, option meaning/value, scoring interpretation, KPI mappings, or other measurement-sensitive data in a published/archived record is rejected.

## 6. Public publication lifecycle

The public state is determined by the assessment family's current public working copy.

### 6.1 Publish new working copy

One transaction must:

1. validate the new working copy;
2. identify the family's currently public copy;
3. stop that copy from public use;
4. make the new copy the public copy;
5. keep all previous sessions/results attached to their original assessment state;
6. write an audit event.

There must never be an externally visible intermediate state where two copies are simultaneously public.

### 6.2 Stop public use

Owner-only operation:

**Stop Public Assessment**

Effect:
- no working copy is public for that family;
- the most recently public copy remains preserved for Admin/history;
- public requests receive the normal "assessment unavailable" behavior.

No historical session or result is changed.

### 6.3 Restore an earlier copy

Owner-only operation:

**Restore Public Assessment**

The Owner selects a previously public/archived copy.

The operation:
- validates that the selected copy is complete and safe to publish;
- makes it the family's current public copy;
- removes public status from any currently public copy;
- does not alter its content;
- does not rewrite any historical sessions/results;
- writes an audit event identifying the restored copy.

This is a controlled change of public availability, not editing the old assessment content.

## 7. Validation before publication

Publication is not allowed to depend only on declared question/axis counts.

Validation must check at minimum:

- the assessment belongs to a valid family;
- the definition graph is internally consistent;
- every question belongs to the same working copy as its axis;
- every option belongs to its question;
- required fields are present;
- declared counts match actual counts;
- supported question types are valid;
- the assessment's required measurement configuration is present;
- KPI/role mappings used by the active scoring contract are valid;
- weight representation is valid for the assessment's scoring configuration;
- trap/semantic configuration is consistent with the active P3 contract;
- the configuration is reproducible from the stored definition;
- no prohibited mutation of published/archived content is being attempted.

The validation result should be returned as structured checks so the Admin UI can show the exact reason for a publication block.

## 8. Assessment content operations

Use explicit operations rather than generic table writes.

Canonical operation families:

- create assessment
- update working-copy details
- add/update/remove axis
- add/update/remove question
- add/update/remove option
- import assessment into a new non-public working copy
- create working copy from existing assessment
- validate working copy
- publish working copy
- stop public assessment
- restore previous assessment copy

Each operation checks:
- Admin identity;
- capability;
- target ownership/assessment family;
- target state;
- parent-child relationship;
- business rules relevant to that operation.

## 9. Import and legacy paths

Import remains supported because it is a legitimate Admin function.

However:
- import always creates a new non-public working copy;
- import never overwrites the current public assessment;
- imported data is validated before it can be published;
- legacy import behavior that creates an unlinked assessment record is retired;
- old management functions remain only until all consumers have moved to canonical operations.

Legacy records are not deleted merely because the management path changes.

## 10. Access management

The protected-assessment access system remains separate from Admin identity.

Admin operations must use the assessment family's public key when managing access.

The system must not require the Admin UI to manipulate a hidden concrete-copy slug as the public access key.

For protected access:
- create access;
- view access;
- revoke/disable access;
- update expiry/usage policy where authorized.

Sensitive access changes are Owner-only unless a specific capability is explicitly granted by the Owner.

## 11. Results and reporting

### 11.1 Current official results

When a session has a current canonical Structured Result, Admin reporting reads that result rather than recalculating the assessment.

The browser must not maintain a second scoring implementation.

### 11.2 Historical results

For legacy completed sessions without a canonical Structured Result:
- mark them as historical;
- display preserved historical values where available;
- allow reconciliation/shadow replay only when the session is complete enough to support it;
- never replace the historical record automatically.

### 11.3 Terminology in Admin

The dashboard must distinguish:
- lead/contact record;
- assessment session;
- official result;
- legacy historical result;
- isolated/orphan legacy score record.

A count of lead records must not be labeled "assessment sessions".

## 12. Audit trail

Create a dedicated Admin audit table.

Minimum fields:

- `id`
- `actor_user_id`
- `action`
- `entity_type`
- `entity_id`
- `family_id` where applicable
- `before_data` where safe/applicable
- `after_data` where safe/applicable
- `created_at`
- `correlation_id`
- `success`
- `failure_reason` where applicable

Mandatory audited operations include:
- create assessment;
- create working copy;
- edit working copy;
- import;
- publish;
- stop public use;
- restore public use;
- access creation/revocation;
- assistant creation;
- assistant activation/deactivation;
- capability grant/revocation;
- relevant system configuration changes.

Passwords, password hashes, access tokens, and other secrets must never be written into the audit record.

## 13. Admin UI structure

Keep the current visual Admin dashboard.

Refactor the JavaScript responsibilities into clear modules around:

- Admin session and authorization;
- assessment list;
- assessment editor;
- working-copy content editor;
- publication controls;
- access management;
- results;
- reports;
- audit trail;
- assistant management.

This is a code-organization boundary, not a requirement to change the visual design.

The current duplicated logout/refresh handlers and missing modal controls are corrected during this refactor.

## 14. Current concrete corrections covered by the design

The design directly resolves the currently verified gaps:

1. Admin family reads currently fail because `assessment_families` is protected without an Admin read policy. The design adds an explicit authorized read path instead of weakening the table.
2. Current assessment creation can omit `family_id`. The new atomic creation path makes the family mandatory.
3. Current legacy import creates an assessment without family linkage. Import is moved to the canonical creation path.
4. Axis/question creation currently lacks sufficient same-assessment relationship validation. Canonical operations enforce it.
5. Current Admin UI uses direct inserts for some content operations. These are removed in favor of canonical change operations.
6. Current generic assessment save can attempt status changes outside the publication operation. Publication becomes a separate controlled operation.
7. Current publication validation is too narrow. Validation is expanded before any public change.
8. Current Admin reporting can recompute values differently from the official result. Official Structured Result becomes the reporting source.
9. The current dashboard has duplicate logout behavior and references missing modal controls. These are corrected without changing the visual UX.
10. Browser-generated HTML must use centralized escaping for database/user-controlled values before injection into the Admin page.

## 15. Data and migration safety

P5 implementation must not rewrite existing P0–P4 historical session/result data.

Before any P5 schema migration:
- reconcile live migration history against repository migration files;
- verify current function signatures and grants;
- confirm no active consumer depends on a legacy operation being retired;
- perform schema changes in a clean, reversible migration;
- run database advisors after changes.

No production protected-access data is copied into development for verification.

## 16. Verification plan

### Authorization
- Owner can access all Owner operations.
- Assistant sees only granted functions.
- Assistant cannot invoke Owner-only operations even when calling the server operation directly.
- Removing a capability takes effect on the next authorized request.
- Inactive Admin account cannot perform operations.

### Assessment lifecycle
- Create assessment → non-public working copy.
- Edit working copy → changes visible only to Admin.
- Publish → new copy becomes public; old public copy stops being public automatically.
- Stop public use → no public copy.
- Restore previous copy → selected old copy becomes public without changing its content.
- Existing completed sessions remain attached to the original assessment state.

### Integrity
- Cannot place a question under an axis from another assessment.
- Cannot place an option under another question.
- Cannot edit published/archived content.
- Cannot publish an incomplete assessment.
- Cannot create a second simultaneously public copy in the same family.

### Reporting
- Official Structured Result is shown unchanged.
- Legacy results are explicitly historical.
- Missing KPI data is not filled with a browser-generated average.
- No browser-side second scoring calculation remains.

### Audit
- Every required Admin mutation creates exactly one meaningful audit record.
- Audit records identify actor/action/target/time.
- Secrets are excluded.

### Regression
- Public assessment flow remains unchanged through P0–P4.
- Stable public URL remains unchanged.
- Protected-access behavior remains separate from Admin authentication.
- P3 scoring semantics remain unchanged.

## 17. Implementation order after Design acceptance

1. Admin authorization/capability foundation.
2. Authorized Admin read path.
3. Canonical assessment creation and working-copy operations.
4. Canonical axis/question/option operations with relationship validation.
5. Publication/stop/restore lifecycle.
6. Import migration to the canonical path.
7. Reporting source correction.
8. Audit trail.
9. Admin UI module separation and regression fixes.
10. Legacy operation retirement after consumer verification.
11. Full P5 verification.
12. P5 closure documentation.

## 18. Explicit non-goals

This design does not:
- change P3 scoring methodology;
- redesign the public assessment experience;
- replace Supabase;
- introduce multi-tenancy;
- expose internal version numbers to assessment users;
- rewrite historical results;
- require a new frontend framework;
- delete historical data merely because it is legacy.

## 19. Design completion condition

P5 Design is complete when the implementation can be executed against this document without reopening the already-approved P0–P4 architecture or inventing new Admin behavior during coding.

**Next phase:** IMPLEMENT — only after this Design record is accepted as the working P5 implementation specification.
