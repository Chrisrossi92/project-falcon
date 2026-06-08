# AMC-19 Client Portal Invite Onboarding Plan

## Purpose

AMC-18 hands-on pilot simulation proved that Client Portal request intake, staff review,
staff-confirmed conversion, tracking, and report download authorization can work once a client user
is mapped to a client account. AMC-19 replaces manual client portal account/mapping setup with a
productized onboarding path for lender contacts.

AMC-19 should create a first-class invite flow:

```text
AMC Staff -> Client Relationships -> Client Contacts -> Send Portal Invite
Client -> Accept invite -> Client Portal -> Submit request / track orders / download reports
```

The backend token foundation, staff manual invite-link UI, and client invite acceptance route are
now defined. Real email delivery is still deferred.

## Onboarding Doctrine

Long-term Client Portal onboarding should keep staff setup intentionally small.

AMC staff should only need to create:

- client relationship name;
- primary contact name;
- primary contact email.

Optional staff-entered contact fields can include:

- contact title or role;
- contact phone;
- default contact flag.

After the portal invite is accepted, the client should complete client-owned profile details inside
the Client Portal. Future client self-service profile work can include:

- phone and preferred contact details;
- additional client-side contacts;
- client-side order instructions and preferences;
- relevant portal documents;
- order contacts used for specific appraisal requests.

Clients must never edit:

- internal relationship notes;
- private AMC/coordinator notes;
- pricing, margin, split, or vendor invoice data;
- procurement, vendor bidding, assignment, or reviewer controls;
- staff-only relationship fields and permission/admin surfaces.

Current AMC-19 scope only enables staff minimal contact setup, manual invite-link creation, and
invite acceptance. Client self-service profile editing remains a follow-up after invite acceptance
works reliably in pilot.

## Systems Audited

### Company Member Invitations

Existing flow:

- Edge Functions: `invite-company-member`, `resend-company-member-invite`.
- Table: `company_member_invitations`.
- RPCs: `rpc_company_member_invite_prepare(...)`,
  `rpc_company_member_invite_finalize(...)`, and `rpc_company_member_invite_accept(...)`.
- Public route: `/accept-invite/:invitationId`.
- Auth pattern: staff calls an authenticated Edge Function, the Edge Function uses Supabase Auth
  Admin invite email, and the accepted user is linked to `public.users`.

Reusable pattern:

- prepare/finalize/accept lifecycle;
- service-role Auth Admin email orchestration;
- safe status and error tracking;
- redirecting unauthenticated users back to an invitation acceptance route.

Not reusable as-is:

- the flow creates company memberships and role assignments for operational app access;
- it is intended for internal company members;
- it would violate the Client Portal boundary if used directly for lender/client contacts.

### Vendor Token Invitations

Existing tokenized vendor flows include bid invitations, assignment offers, and assignment work
invitations.

Reusable pattern:

- generate an opaque token once;
- store only `token_hash` and `token_last_four`;
- validate expiration, revocation, and terminal statuses server-side;
- return safe public invitation payloads;
- avoid exposing internal ids or token hashes.

AMC-19 should reuse this token lifecycle shape for Client Portal invites.

### Supabase Auth Assumptions

Current company invitation code can send Supabase Auth invite emails and redirect users to app
routes after signup/sign-in. A Client Portal invite can use the same Auth Admin email capability,
but the accepted user must land in Client Portal and must not receive Internal/AMC workspace access.

The existing `/accept-invite/:invitationId` page is company-member specific. AMC-19 should add a
dedicated Client Portal invitation route instead of overloading it.

### Client Portal Membership

`client_portal_members` is the current Client Portal access mapping:

- `company_id`;
- `client_id`;
- `user_id`;
- `status` of `active`, `inactive`, or `revoked`.

Client Portal read, request, and report authorization currently depend on active
`client_portal_members` mappings plus `client_portal.*` permissions. AMC-19 should make this table
the durable authority for client-account access.

Important design gap: current Client Portal RPC helpers still assume current-company app access and
permission checks. A true client-only invite flow should avoid creating internal operational
company memberships. AMC-19 implementation should either:

- introduce Client Portal-specific auth helpers that resolve company/client access from
  `client_portal_members`; or
- explicitly mark any temporary company context as portal-only and keep it out of operational user
  management surfaces.

The preferred pilot-safe design is the first option: Client Portal authorization should be based on
client portal membership, not internal company membership.

### Client Relationship Contacts

The natural staff action surface already exists in Client Relationships:

- open a client detail page;
- review Contacts;
- add or update a contact;
- set a default contact.

AMC-19 should add `Send Portal Invite` from the contact area for active contacts with an email
address.

## Proposed Data Model

Add a dedicated `client_portal_invitations` table.

Recommended columns:

- `id uuid primary key`;
- `company_id uuid not null references public.companies(id)`;
- `client_id bigint not null references public.clients(id)`;
- `client_contact_id bigint null references public.client_contacts(id)`;
- `email text not null`;
- `normalized_email text not null`;
- `status text not null default 'prepared'`;
- `token_hash text not null unique`;
- `token_last_four text not null`;
- `invited_by_user_id uuid null references public.users(id)`;
- `invited_auth_id uuid null references auth.users(id)`;
- `invited_user_id uuid null references public.users(id)`;
- `client_portal_member_id uuid null references public.client_portal_members(id)`;
- `expires_at timestamptz not null`;
- `prepared_at timestamptz not null default now()`;
- `sent_at timestamptz null`;
- `opened_at timestamptz null`;
- `accepted_at timestamptz null`;
- `revoked_at timestamptz null`;
- `auth_error text null`;
- `request_id text null`;
- `metadata jsonb not null default '{}'::jsonb`.

Recommended statuses:

- `prepared`;
- `sent`;
- `accepted`;
- `revoked`;
- `expired`;
- `auth_failed`.

Recommended constraints and indexes:

- valid status check;
- non-empty normalized email check;
- 64-character lowercase hex `token_hash` check if SHA-256 hex is used;
- four-character `token_last_four` check;
- unique pending invite index on `(company_id, client_id, normalized_email)` where status is
  `prepared` or `sent`;
- lookup indexes on `(company_id, client_id, status)` and `(normalized_email, status)`.

Do not add `pending` rows to `client_portal_members` for this first flow. Create or reactivate the
`client_portal_members` row only after successful acceptance, so a prepared/sent invite cannot grant
portal access by accident.

## Token Foundation Slice

Implemented foundation object target:

- `client_portal_invitations`;
- `client_portal.members.invite`;
- `rpc_client_portal_invitation_create(p_client_id, p_client_contact_id, p_email)`;
- `rpc_client_portal_invitation_read(p_token)`;
- `rpc_client_portal_invitation_accept(p_token)`.

This slice establishes the invite contract without email or UI:

- staff invite creation is current-company scoped;
- invite creation requires `client_portal.members.invite` and client update authority;
- token creation returns the raw token only once;
- the table stores only `token_hash` and `token_last_four`;
- public invite reads return safe display metadata only;
- authenticated acceptance verifies the token, expiration, pending status, and matching Auth email;
- acceptance creates or reactivates `client_portal_members`;
- acceptance does not insert or update `company_memberships` or `user_role_assignments`.

Staff-side manual invite link foundation:

- Client Relationships contact cards can show `Create portal invite` for active contacts with an
  email when staff has `client_portal.members.invite`.
- The action calls `rpc_client_portal_invitation_create(...)` and renders the returned pending
  invite metadata immediately.
- The UI shows the invite email, expiration, copyable `/client-portal/invitations/:token` link, and
  one-time-link warning.
- The raw token remains only in the immediate success state. It is not saved in local storage,
  route state, or client records.
- No email is sent by this slice.

Client-side manual invite acceptance foundation:

- `/client-portal/invitations/:token` is now the public invite destination.
- The page calls `rpc_client_portal_invitation_read(p_token)` and shows only safe client, company,
  contact, email, expiration, and lifecycle status metadata.
- Pending invites show a minimal create-account form with the invited email prefilled and locked.
- Existing-account users can switch to sign-in on the same invite page.
- If Supabase returns an authenticated session after account creation, the page immediately calls
  `rpc_client_portal_invitation_accept(p_token)`.
- If Supabase requires email confirmation and returns a created user without a session, the page
  shows a confirmation-needed state and does not call the accept RPC. The invitation remains
  pending until the confirmed user returns to the invite link and signs in.
- If a Supabase email confirmation redirects the user to `/client-portal` before the invite is
  accepted, the Client Portal unavailable state now tells the user to return to the original
  invitation link to finish setup.
- Password sign-in immediately calls `rpc_client_portal_invitation_accept(p_token)`.
- Already-authenticated matching-email users auto-accept with
  `rpc_client_portal_invitation_accept(p_token)`.
- Acceptance creates or reactivates `client_portal_members` and then redirects to
  `/client-portal`.
- Expired, revoked, and already accepted invitations show lender-safe states.
- The page does not switch company context, create operational company membership, or expose
  Internal/AMC workspace routes.
- Client Portal access recognition now grants only the four `client_portal.*` client permissions
  from active `client_portal_members`, so accepted client users can open the portal without becoming
  operational company members.
- Client-only users are routed from `/` or `/dashboard` to `/client-portal` before the operational
  shell renders. Users with both operational and Client Portal access keep the operational default
  unless they are explicitly completing an invite.
- Client Portal order request creation resolves the request company/client from active
  `client_portal_members`, not from operational company membership or current-company app metadata,
  and returns specific auth, permission, membership, and field validation errors.
- Submitted Client Portal intake requests now remain visible to the client as pending requests on
  the dashboard and Orders page before staff conversion. The pending projection is client-safe:
  request key, status copy, property/report details, requested due date, and submitted date only.
- Client Portal users have a visible `Sign out` action in the portal shell. Sign-out clears the
  Supabase session and redirects to `/login`.
- Falcon AMC staff can access the staff review inbox through `/client-requests` and AMC Client
  Services navigation when they have `client_portal.order_requests.read` or
  `client_portal.order_requests.manage`. The route remains staff/AMC-owned, not client-portal
  owned, and is hidden from Internal-only, vendor, and client-only users.
- Owner/Admin role templates now receive the staff request read/manage permissions so AMC
  coordinators/admins can review, mark under review, and convert portal-submitted intake requests
  after the production schema is aligned.

Remaining implementation work after the token, staff manual-link, and acceptance foundations:

- Supabase Auth invite email Edge Function;
- resend/revoke behavior if needed for pilot operations;
- branded sender/domain configuration and production email template polish.

## Proposed Backend Flow

### Send Invite

Staff calls a new Edge Function, for example `invite-client-portal-member`, from the client detail
Contacts section.

The function should:

1. validate the staff caller with the bearer token;
2. call `rpc_client_portal_invite_prepare(...)` as the staff caller;
3. send Supabase Auth Admin invite email to the contact email with `redirectTo` set to
   `/client-portal/invitations/:token`;
4. call `rpc_client_portal_invite_finalize(...)` with Auth send result metadata;
5. return safe invitation status to the UI.

`rpc_client_portal_invite_prepare(...)` should:

- require active current-company staff access;
- require client management permission plus a dedicated invite permission, recommended:
  `client_portal.members.invite`;
- validate the client belongs to the current company and active operation scope;
- validate the contact belongs to the client when `client_contact_id` is provided;
- normalize and validate email;
- prevent duplicate active memberships for the same company/client/user/email;
- prevent duplicate pending invitations;
- create the invitation token and store only its hash;
- return the raw token only once to the Edge Function.

### Read Invite

Add a public-safe read RPC or Edge Function for `/client-portal/invitations/:token`.

It should:

- hash and validate the opaque token;
- fail closed for missing, revoked, accepted, or expired invitations;
- mark the invite opened without exposing internal ids;
- return only safe copy: client name, contact email, expiration, and invitation status.

### Accept Invite

Accepting should require the invited user to be authenticated as the invited email.

The accept action should:

1. validate token, expiration, status, company, client, and email match;
2. create or link a `public.users` row for the Auth user;
3. create or reactivate `client_portal_members(company_id, client_id, user_id, status = 'active')`;
4. mark the invitation `accepted`;
5. return the user to `/client-portal`.

Acceptance must not create internal company membership, operational role assignments, admin access,
vendor access, or AMC/Internal workspace access.

## Proposed Routes

Staff route:

- Existing client detail route under Client Relationships.
- Add a contact-level `Send Portal Invite` action.

Public/client route:

- `/client-portal/invitations/:token`.

Authenticated client route:

- `/client-portal`.

The Client Portal invite route should support unauthenticated users by sending them through login or
signup and preserving the invitation return path.

## Security Boundaries

AMC-19 must preserve these boundaries:

- Invite token is opaque, expiring, single-use, and revocable.
- Only token hashes are stored.
- Invitation is scoped to company, client relationship, optional contact, and normalized email.
- Staff invite requires explicit staff permission.
- Accepting an invite creates or links only Client Portal access.
- Client Portal members do not gain Internal Operations, AMC Operations, Permission Center,
  Vendor Workspace, procurement, assignment, invoice, payment, or admin surfaces.
- Client Portal payloads continue to use opaque order/request keys.
- Storage bucket names, storage paths, raw order ids, vendor/procurement internals, internal notes,
  fees, margins, invoices, and reviewer files remain hidden.
- Failed, expired, revoked, or mismatched-email invitations fail closed.

## First Implementation Slice Recommendation

Implement AMC-19 in four small slices:

1. Data and authorization:
   - add `client_portal_invitations`;
   - add `client_portal.members.invite`;
   - add prepare/finalize/read/accept RPCs;
   - add static migration tests.
2. Email and acceptance:
   - add `invite-client-portal-member` Edge Function;
   - add `/client-portal/invitations/:token`;
   - handle existing-auth and new-auth paths.
3. Staff UX:
   - add `Send Portal Invite` to client contact cards;
   - show invitation status, resend/revoke placeholders if not implemented.
4. Client Portal auth hardening:
   - remove any need for client users to receive operational company membership;
   - ensure Users and Permission Center do not list client-only portal users;
   - add end-to-end local pilot smoke for Dana Miller invite acceptance.

## Deferred From AMC-19 First Slice

- Full client account administration.
- Multi-client portal membership management UI.
- Bulk invites.
- Custom email templates by lender.
- Resend/revoke if not needed for first pilot, though the model should support both.
- Client file upload on order request.
- Client messaging/comment threads.
- Configurable lender-specific request forms.

## Pilot Decision

AMC-19 is required before an external lender can run an unaided pilot. Until this flow exists, the
Client Portal can be tested only with manually created local/staging/production-safe mappings.
