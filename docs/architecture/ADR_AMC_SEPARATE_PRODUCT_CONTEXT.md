# ADR: Falcon AMC Separate Product Context

## Status

Accepted for planning. Runtime migration is deferred to later slices.

## Context

Project Falcon previously treated Internal Operations and AMC Operations as two operational
workspaces inside one authenticated Falcon application. The same signed-in user could switch between
Internal and AMC when permissions and workspace availability allowed it.

Mike has clarified that the AMC side should be legally and operationally separate from the internal
dashboard because the businesses may be owned by separate LLCs. A person may need one account for
Internal Operations, such as a `continentalres.com` identity, and a separate account for Falcon AMC,
such as a `continentalamc.com` identity. Falcon should no longer assume that one login can cross the
Internal/AMC boundary.

The current `operations_scope` model remains valuable for compatibility, staging, smoke tests,
route safety, and data scoping. It is not a legal separation boundary and must not be described as
one.

The vendor model also needs to stay company-first, but with a narrower operating assumption. Falcon
AMC should not manage many individual appraiser logins under one vendor company. Each vendor company
should have one primary Falcon-facing vendor manager/contact, usually the main licensed signing
appraiser. That person accepts assignments, receives notifications, submits reports and invoices,
and is responsible for signing. Other vendor-side assistants or staff may help the vendor prepare
work outside Falcon, but Falcon AMC does not need to track them as app users for MVP.

## Decision

Internal Operations and Falcon AMC are separate account and product contexts.

The prior same-login Internal/AMC workspace switch model is superseded as a long-term product
architecture. Existing workspace-switching behavior may remain temporarily for compatibility until
later implementation slices replace it intentionally.

The long-term target is separate entry points for Internal Operations and Falcon AMC. Those entry
points may become separate deployments, domains, auth contexts, branding, environment variables,
redirect URLs, Edge Function origins, and notification/email link targets.

`operations_scope` remains a compatibility and data-scoping mechanism during the transition. It
should continue to protect existing staging and pilot workflows, but it must not be treated as the
final legal, auth, deployment, or ownership boundary.

Vendor companies remain the vendor assignment unit. Falcon AMC should model one primary
Falcon-facing vendor manager/contact/signing appraiser per vendor company for assignment acceptance,
notifications, report submission, invoice submission, and vendor accountability. Secondary vendor
contacts can remain informational unless a later approved slice introduces a specific need.

## Consequences

Existing production and staging workflows must remain compatible until later slices migrate them.
Do not remove workspace switching, routes, permissions, Vendor Workspace bootstrap, or
`operations_scope` filters as part of this ADR.

Future auth and routing work must avoid adding new dependencies on a shared Internal/AMC login.
Where shared code is retained, it should be treated as implementation reuse, not as a shared account
or legal boundary.

Future deployment planning must classify Internal, AMC, Vendor Workspace, and Client Portal entry
points separately. It must include Supabase project/ref decisions, Vercel environment variables,
auth redirect URLs, email link domains, CORS/CSP, Edge Function origin policy, smoke coverage, and
rollback.

Vendor Workspace work should route operational vendor actions to the primary vendor manager/contact
for the company. New multi-user vendor team management should be deferred unless a later product
slice explicitly approves it.

## Non-Goals For This Slice

- No runtime behavior changes.
- No schema migrations.
- No RLS changes.
- No route, auth, or UI changes.
- No removal of existing workspace switching.
- No production or staging data changes.
- No vendor account migration.

## Follow-Up Slices

1. Vendor manager model simplification and compatibility audit.
2. Vendor-facing copy and route cleanup for the company-contact model.
3. Internal/AMC auth and workspace separation strategy.
4. Workspace switcher removal or hiding once separate entry points exist.
5. Separate deployment/domain/environment plan for Internal, AMC, Vendor Workspace, and Client
   Portal.
