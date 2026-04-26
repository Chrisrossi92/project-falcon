# User Experience Flows

## Purpose

This document defines Falcon's ideal user experience from the perspective of each major user type. It describes what each person sees, what they can do, what notifications they receive, where activity is recorded, and what should feel modern, intuitive, and polished.

The focus is user experience first. Technical implications are included after each flow so implementation can stay aligned with the product vision.

Core UX principles:

- Falcon should feel like an operations command center, not a spreadsheet wrapper.
- Users should see the work that matters to them first.
- Owners/admins should have broad visibility without noisy bell notifications.
- Direct participants should receive clean, actionable notifications.
- Every order should be identified by company order number, never by internal UUID.
- Activity log is the durable story of the order.
- Notifications are delivery prompts, not the source of truth.
- The notification center behaves like a lightweight action inbox, not just a passive feed.
- Workflow actions should feel obvious from the current order state.

## Major User Types

- Owner
- Admin
- Appraiser
- Reviewer
- Inspector / Field Rep
- Billing
- Client Portal User

## Notification Center UX

The personal bell notification center is an action inbox for the signed-in user.

Notifications render as separate card/list items. Each item should show:

- Visual type/category/priority treatment.
- Title.
- Body.
- Bold clickable order number when order-related.
- Timestamp.
- Individual mark-as-read action.
- Optional priority indicator.

Notification visual distinction:

- Communication/note: blue or neutral.
- Revision/request/action-needed: orange.
- Overdue/critical: red.
- Assignment/new order: green.
- System/admin: gray or purple.

Unread notifications remain visible until the user intentionally marks them read. Users can leave a notification unread as a reminder or action item.

Users can:

- Mark one notification as read.
- Mark all notifications as read.
- Leave a notification unread.
- Click only the order number to navigate to the order.

Clicking the notification card itself should not navigate or mark the notification read. The order number is the only navigation target inside an order-related notification.

Admin communication feed remains separate from personal bell notifications. The feed provides operational visibility and audit context; the bell is reserved for direct personal prompts and configured alerts.

## 1. Owner First Login And Company Setup

### Ideal Experience

The owner signs in for the first time and lands in a guided setup wizard instead of an empty dashboard.

The wizard feels lightweight and business-focused:

1. Company profile
2. Order numbering
3. Workflow defaults
4. Template role selection
5. Role permission review
6. Invite users
7. Add first clients
8. Load optional demo data
9. Review and launch

The owner can accept recommended defaults and launch quickly, or customize roles and workflow before inviting the team.

### What The Owner Sees

- Progress indicator.
- Plain-language setup steps.
- Company preview.
- Order number preview such as `ORD-26001`.
- Workflow preview such as `New → In Progress → In Review → Ready For Client → Completed`.
- Role cards explaining what each role can do.
- Final launch summary.

### Actions Available

- Edit company profile.
- Choose order numbering format.
- Choose workflow template.
- Select template roles.
- Customize role permissions.
- Invite staff.
- Add clients.
- Load sample data.
- Launch workspace.

### Notifications

- No routine setup bell notifications.
- Setup progress should be shown inline, not as notification noise.

### Activity Log

Company setup should create audit events, not order activity entries:

- `company.created`
- `company.setting_changed`
- `role.created`
- `user.invited`

### Technical Implications

- Requires company setup progress.
- Requires company settings.
- Requires role templates and permission definitions.
- Requires invitation records.
- Requires audit events for sensitive setup changes.

## 2. Owner/Admin Creating Roles And Inviting Users

### Ideal Experience

The owner/admin opens a "Team & Roles" area that feels approachable. Roles appear as editable capability bundles, not technical permission lists.

The owner can start from templates:

- Owner
- Admin
- Appraiser
- Reviewer
- Trainee
- Inspector / Field Rep
- Billing
- Client Portal User

They can create a custom role like `Senior Review Lead` and check permissions by category.

### What The User Sees

- Team list with status: active, invited, expired, deactivated.
- Role list with summaries.
- Role editor with grouped permission checklists.
- "Can do" and "Cannot do" preview.
- Warnings for owner-only or high-risk permissions.
- Invite form with role selection.

### Actions Available

- Create custom role.
- Edit role name and description.
- Check/uncheck permissions.
- Invite users by email.
- Assign multiple roles.
- Resend or cancel invitations.
- Deactivate users.

### Notifications

- Invited user receives email invite.
- Owner/admin does not need a bell notification for their own invite action.
- Security-sensitive role changes may create owner-visible alerts.

### Activity Log

Company audit events:

- `role.created`
- `role.permission_added`
- `role.permission_removed`
- `user.invited`
- `user.role_assigned`
- `user.deactivated`

### Technical Implications

- Role names are not behavior switches.
- Effective permissions come from `UserRole` assignments.
- Owner-only permissions require guardrails.
- Invitation acceptance creates/links `public.users` and auth identity.

## 3. Admin Creating A Client

### Ideal Experience

The admin creates a client from a simple client management page or inline during order creation.

The form should be fast:

- Client/company name
- Client type
- Primary contact
- Email
- Phone
- Billing address
- Notes

The admin should not need to build a complete CRM record before creating an order.

### What The Admin Sees

- Client list with search.
- Clear "New Client" action.
- Compact creation form.
- Recently created clients.
- Client detail with orders and contacts.

### Actions Available

- Create client.
- Add contact.
- Edit contact information.
- Archive client.
- Start a new order for client.

### Notifications

- No bell notification for ordinary client creation.
- Admin feed/audit can record it.

### Activity Log

Company/client audit events:

- `client.created`
- `client.updated`
- `client.contact_added`

### Technical Implications

- Client records need company scope.
- Orders reference clients.
- Client portal users eventually map to client records.

## 4. Admin Creating And Assigning An Order

### Ideal Experience

The admin creates an order from the Orders area. Falcon generates or previews the company order number immediately.

The order creation flow should feel like intake plus assignment:

1. Client and property
2. Order details
3. Due date and fee
4. Assign appraiser
5. Assign reviewer, optional depending workflow
6. Create order

After creation, the admin lands on the order drawer/detail with an activity entry showing the order was created and assignments were made.

### What The Admin Sees

- Order number preview.
- Client picker with create-new option.
- Property details.
- Assignment controls.
- Staff availability hints in future.
- Workflow status preview.

### Actions Available

- Create order.
- Assign appraiser.
- Assign reviewer.
- Add internal note.
- Set due date/fee.
- Save draft if intake is incomplete.

### Notifications

- Assigned appraiser receives bell notification.
- Reviewer receives notification only if company policy says reviewer assignment is active immediately.
- Admin/owner see activity in communication/audit feed, not necessarily bell.

### Activity Log

Order activity events:

- `order.created`
- `order.assigned_appraiser`
- `order.assigned_reviewer`
- `order.status_changed`

### Technical Implications

- Order must have `order_number`.
- Assignment should use `public.users.id`.
- Assignment creates or updates order responsibility.
- Notification payload includes actor, recipient, order number, and assignment context.

## 5. Appraiser Receiving And Working An Order

### Ideal Experience

The appraiser gets a clean bell notification:

```txt
New order assigned
ORD-26001
```

Clicking the order number opens the order. The appraiser dashboard shows assigned work grouped by urgency:

- Due soon
- Needs revisions
- In progress
- Waiting for review

The order view should make the next action obvious.

### What The Appraiser Sees

- Assigned orders only, unless broader permissions exist.
- Order status.
- Due date.
- Client/property summary.
- Activity log.
- Notes form.
- Upload/documents area.
- Submit to review action when ready.

### Actions Available

- View assigned order.
- Add activity note.
- Upload documents/files.
- Update permitted work fields.
- Request clarification if supported.
- Submit to review.
- Respond to revision requests.

### Notifications

Receives:

- New assignment.
- Reviewer/admin notes directed to appraiser.
- Revision requests.
- Reopened order requiring appraiser action.
- Field task completion if relevant.

Does not receive:

- All admin communication.
- Other appraisers' orders.
- Reviewer-only operational noise.

### Activity Log

Order activity events:

- `note.appraiser_added`
- `document.uploaded`
- `workflow.submitted_to_review`
- `workflow.resubmitted`

### Technical Implications

- Dashboard uses order responsibility.
- Appraiser identity is based on `OrderParticipant` or `orders.appraiser_id`.
- Communication routing treats appraiser as appraiser even if they also have admin permissions.

## 6. Appraiser Submitting To Review

### Ideal Experience

When the appraiser clicks "Submit to Review," Falcon asks for an optional note:

```txt
Anything the reviewer should know?
```

After submission:

- Status changes to `in_review`.
- Reviewer becomes active.
- Appraiser sees the order as waiting for review.
- Activity log records submission and note.

### What The Appraiser Sees

- Confirmation state.
- Order moves out of active production queue.
- Timeline shows submission.

### Actions Available

- Submit to review.
- Add submission note.
- Continue viewing order.
- Add follow-up notes if allowed.

### Notifications

- Reviewer receives bell notification.
- Admin feed records workflow event.
- Appraiser may receive confirmation inline, not necessarily bell.

### Activity Log

Order activity events:

- `workflow.submitted_to_review`
- optional `note.appraiser_added`

### Technical Implications

- Requires transition permission or appraiser responsibility.
- `resolveOrderParticipants` activates reviewer.
- Notification payload includes `from_status`, `to_status`, actor, recipient, and order number.

## 7. Reviewer Reviewing, Requesting Revisions, And Approving

### Ideal Experience

The reviewer dashboard has a review queue:

- New submissions
- Due soon
- Needs reviewer response
- Recently resubmitted

Opening an order shows appraisal context, documents, activity, and clear review actions:

- Request revisions
- Approve review
- Add reviewer note

### Requesting Revisions

The reviewer writes a revision note and clicks "Request Revisions."

The appraiser receives:

```txt
Pam Casper requested revisions
Please update the comp notes.
ORD-26001
```

Status changes to `needs_revisions`.

### Review Clearance

The reviewer clears review or requests revisions.

Default Falcon workflow should not treat this as client release. Client release is admin/owner-controlled unless a company setting permits reviewer release.

When an order is marked Ready for Client, the appraiser should generally receive a cleared/released notification, admins/owners should remain action-aware, and reviewer notification should be optional/configurable through future company workflow/notification settings.

Potential future statuses include `review_cleared`, `pending_final_approval`, `ready_for_client`, and `completed`.

### What The Reviewer Sees

- Assigned review orders.
- Review status.
- Appraiser notes.
- Revision history.
- Approval/revision actions.

### Actions Available

- View assigned review orders.
- Add reviewer notes.
- Request revisions.
- Approve review.
- Mark ready for client if policy allows.

### Notifications

Receives:

- New submission to review.
- Resubmission after revisions.
- Notes directed to reviewer.
- Reassignment to reviewer.

Does not receive:

- Routine appraiser work notes before review unless tagged/policy-enabled.
- All company order activity.

### Activity Log

Order activity events:

- `note.reviewer_added`
- `workflow.revisions_requested`
- `workflow.approved`
- `workflow.ready_for_client`

### Technical Implications

- Reviewer active state is lifecycle-driven.
- Reviewer role globally does not make user active on every order.
- Revisions route responsibility back to appraiser.
- Approval may activate admin/delivery or billing responsibility.

## 8. Admin Monitoring Communication And Workflow

### Ideal Experience

The admin dashboard feels like an operations control room.

It should show:

- Orders needing assignment.
- Orders at risk.
- Review queue health.
- Recent communication feed.
- High-priority alerts.
- Bottlenecks by status.

Admin communication feed should feel like a running tab/audit feed, not a bell inbox.

Example feed item:

```txt
Chris Rossi → Pam Casper · Appraiser note · ORD-26001
Any revisions yet?
10:42 AM · normal
```

### What The Admin Sees

- All orders permitted by role.
- Assignment gaps.
- Status pipeline.
- Communication feed.
- Notifications filtered by preferences.
- Team workload.

### Actions Available

- Create/update orders.
- Assign/reassign participants.
- Add admin notes.
- Override status if delegated.
- Monitor communication.
- Filter feed by status, person, client, order, importance.

### Notifications

Admin receives bell notifications only for configured events:

- Unassigned order.
- Overdue order.
- Critical revision.
- Failed delivery/email.
- Explicit mention/tag.
- Company policy alerts.

Routine direct participant notes should appear in the feed, not necessarily the bell.

### Activity Log

Admin actions create events:

- `order.reassigned`
- `note.admin_added`
- `workflow.override_status`
- `order.updated`

### Technical Implications

- Admin visibility uses permissions.
- Admin bell delivery uses notification preferences.
- Communication feed should read from activity events, not notification rows.
- Feed payload needs actor, recipient/context, order number, category, importance, timestamp.

## 9. Inspector / Field Rep Future Workflow

### Ideal Experience

The inspector or field rep sees a focused task list, not the full appraisal operations system.

Dashboard sections:

- Scheduled field visits
- Due today
- In progress
- Recently completed

Opening a task shows only what is needed:

- Order number
- Property address
- Scheduled time
- Instructions
- Upload photos/documents
- Add field note
- Mark complete

### Actions Available

- View assigned tasks.
- Start task.
- Upload photos/files.
- Add field note.
- Mark task complete.
- Request help or reschedule if supported.

### Notifications

Receives:

- New field task assigned.
- Schedule changed.
- Task due soon.
- Comment/tag on task.

Does not receive:

- Full order review conversation.
- Appraiser/reviewer internal notes unless tagged or permitted.

### Activity Log

Order/task activity events:

- `task.inspection_assigned`
- `task.inspection_started`
- `task.field_note_added`
- `document.field_photo_uploaded`
- `task.inspection_completed`

### Technical Implications

- Requires future `OrderTask`.
- Field responsibility is task-scoped.
- Inspector should not become a permanent full-order participant by default.

## 10. Billing Future Workflow

### Ideal Experience

Billing users see financial work queues:

- Ready to invoice
- Awaiting payment
- Past due
- Completed this week

Order detail shows billing-relevant information without overwhelming appraisal production details.

### Actions Available

- View billing-relevant orders.
- Update invoice status.
- Record payment.
- Add billing note.
- Export billing report.

### Notifications

Receives:

- Order ready for invoice.
- Payment overdue.
- Order canceled with fee impact.
- Billing mention/tag.

Does not receive:

- Routine appraiser/reviewer note traffic.

### Activity Log

Billing events:

- `billing.invoice_created`
- `billing.invoice_sent`
- `billing.payment_recorded`
- `note.billing_added`

### Technical Implications

- Billing may be an order participant or task participant depending workflow.
- Billing visibility should be permission-based.
- Billing notes need category/visibility controls.

## 11. Client Portal Future Workflow

### Ideal Experience

Client portal users see a clean external-facing workspace.

Dashboard sections:

- Active orders
- Documents needed
- Delivered reports
- Messages

Client users should never see internal review notes, internal activity, staff reassignment chatter, or admin audit logs.

### Actions Available

- View permitted orders.
- Upload requested documents.
- Send client-facing messages.
- Download delivered reports.
- View client-facing status.

### Notifications

Receives:

- Document requested.
- Order delivered.
- Client-facing message.
- Order canceled or delayed if company policy allows.

Does not receive:

- Internal staff communication.
- Appraiser/reviewer notes.
- Admin audit events.

### Activity Log

Client-facing events:

- `client.document_requested`
- `client.document_uploaded`
- `client.message_sent`
- `order.delivered`

### Technical Implications

- Requires client-visible event filtering.
- Requires portal-scoped permissions.
- Requires strict separation of internal and external communication.

## 12. Dashboard Expectations By User Type

### Owner

Sees:

- Company health overview.
- Setup completion.
- Order pipeline.
- Team workload.
- Revenue/billing summary if enabled.
- Critical alerts.

Actions:

- Manage company.
- Manage users/roles.
- View all orders.
- Configure workflow.
- Open reports.

### Admin

Sees:

- Operational pipeline.
- Unassigned orders.
- Review queue.
- Communication feed.
- Overdue/at-risk orders.

Actions:

- Create clients/orders.
- Assign/reassign.
- Update statuses.
- Add notes.
- Monitor feed.

### Appraiser

Sees:

- Assigned orders.
- Due soon.
- Needs revisions.
- Waiting for review.
- Recent notes directed to them.

Actions:

- Work order.
- Add notes.
- Upload docs.
- Submit/resubmit.

### Reviewer

Sees:

- Review queue.
- New submissions.
- Resubmissions.
- Due/aging reviews.
- Notes directed to reviewer.

Actions:

- Review.
- Add notes.
- Request revisions.
- Approve.

### Inspector / Field Rep

Sees:

- Assigned tasks.
- Schedule.
- Due tasks.

Actions:

- Start/complete task.
- Upload field files.
- Add field note.

### Billing

Sees:

- Orders needing invoice/payment action.
- Past due items.
- Billing reports.

Actions:

- Invoice.
- Record payment.
- Add billing notes.

### Client Portal User

Sees:

- Their orders.
- Document requests.
- Delivered reports.
- Client-facing messages.

Actions:

- Upload docs.
- Send message.
- Download report.

## 13. Notification Expectations By User Type

### Owner

Bell:

- Critical system/company events.
- Explicit mentions.
- Optional high-priority operational events.

Feed:

- Can view all communication/audit according to permissions.

### Admin

Bell:

- Preference-controlled operational alerts.
- Explicit mentions.
- Assignment gaps.
- Overdue critical items.

Feed:

- Running communication and workflow feed.

### Appraiser

Bell:

- New assigned order.
- Reviewer/admin note directed to them.
- Revision request.
- Reopened assigned order.
- Field task completion relevant to their order.

### Reviewer

Bell:

- Order submitted to review.
- Order resubmitted after revisions.
- Appraiser/admin note directed to them.
- Reviewer reassignment.

### Inspector / Field Rep

Bell:

- Task assigned.
- Schedule changed.
- Due soon.
- Tagged comment.

### Billing

Bell:

- Invoice needed.
- Payment overdue.
- Billing mention.
- Cancellation with billing impact.

### Client Portal User

Bell/email:

- Document request.
- Client-facing message.
- Report delivered.

## 14. Activity Log Creation Points

Activity log entries should be created for:

- Company setup audit events.
- User invitations and role changes.
- Client creation and updates.
- Order creation.
- Assignment and reassignment.
- Status transitions.
- Notes and comments.
- Document uploads.
- Field task updates.
- Billing events.
- Client portal events.
- Notification-critical events when useful for audit.

Activity entries should include:

- Actor.
- Order number when order-related.
- Event type/category.
- Body/note when relevant.
- Previous and new status when lifecycle-related.
- Assignment changes when relevant.
- Visibility category.
- Importance.

## 15. What Should Feel Modern, Intuitive, And Cool

Falcon should feel modern because it reduces mental load, not because it adds decorative complexity.

Desired product feel:

- Clear dashboard queues by responsibility.
- One-click access from notification order number to order.
- Clean activity timeline that reads like a narrative.
- Role editor that explains permissions in plain English.
- Order workflow actions that appear only when relevant.
- Admin feed that feels like an operations ticker.
- Smart defaults during setup.
- No UUIDs leaking into user-facing text.
- Few noisy alerts; important alerts stand out.
- Fast search and filtering for orders, clients, and communication.
- Consistent labels: actor, recipient/context, order number, event type, importance.

UX patterns to prefer:

- Status chips with clear meaning.
- Compact operational tables.
- Drawer/detail workflows for orders.
- Segmented filters for queues.
- Inline previews for setup decisions.
- Permission summaries before advanced controls.
- Empty states that suggest the next action.

UX patterns to avoid:

- Generic "Order updated" notifications when actor/action are known.
- Making the whole notification row clickable when only the order number should navigate.
- Showing internal UUIDs.
- Hiding important workflow actions behind generic menus.
- Using global role names to explain order-specific behavior when assignment is the real reason.
- Turning admin visibility into admin alert noise.

## Technical Implications Summary

To support these flows, Falcon needs:

- Company-scoped setup settings.
- Permission-based navigation and actions.
- Order responsibility resolver.
- Activity log event contract.
- Notification payload contract.
- Order number generation.
- Role template seeding.
- Invitation flow.
- Admin communication feed from activity events.
- Future order task model for inspectors and billing.
- Client-visible event filtering for portal.

The implementation should proceed in layers:

1. Stabilize contracts and current notification/activity payloads.
2. Add permission helper compatibility layer.
3. Centralize responsibility resolution.
4. Build setup/checklist UX.
5. Add normalized roles/permissions.
6. Add task and portal workflows after core order operations are solid.
