# Function Contracts

## Purpose

This document defines Falcon's core service, RPC, and helper contracts. Future code should move these contracts around rather than rewiring identity, permissions, workflow, activity, and notifications ad hoc.

Global rules:

- `public.users.id` is the canonical app user identity.
- `auth.users.id` is authentication identity only.
- `order.id` is internal routing/query identity.
- `order.order_number` is the visible user-facing order identifier.
- `activity_log` is durable history.
- `notifications` are delivery records.
- Permission checks and responsibility checks are separate but coordinated.
- Order responsibility should override global role for order-specific workflow and notification routing.

## 1. `current_app_user_id()`

### Purpose

Map the authenticated Supabase user to Falcon's canonical app user ID.

### Inputs

Implicit:

```txt
auth.uid()
```

### Output

```txt
uuid | null
```

Returns `public.users.id`.

### Rules

- Must query `public.users.auth_id = auth.uid()`.
- Must not return `auth.uid()` directly unless it is actually the same as `public.users.id`.
- Should return null or raise a controlled error when no app user exists, depending caller context.

### Database Dependencies

- `auth.users`
- `public.users`
- `public.users.auth_id`

### App Dependencies

- Current-user hooks.
- RPC authorization.
- RLS policies.
- Notification read/write paths.
- Activity actor resolution.

### Failure Cases

- Authenticated user has no `public.users` row.
- Duplicate `public.users.auth_id`.
- User is inactive/deactivated.

### Validation Examples

- If `auth.uid() = 83159aad...` and `public.users.id = 78a90036...`, function returns `78a90036...`.
- Notification read RPC filters by returned app user ID, not auth ID.

## 2. `getEffectivePermissions(userId, companyId)`

### Purpose

Return the effective global/company permissions for a user.

### Inputs

```ts
{
  userId: string;    // public.users.id
  companyId: string;
}
```

### Output

```ts
{
  user_id: string;
  company_id: string;
  roles: Array<{ role_id: string; name: string }>;
  permissions: string[];
  is_owner: boolean;
}
```

### Rules

- User ID is always `public.users.id`.
- Permissions are additive by default.
- Inactive or expired role assignments do not grant permissions.
- Owner role grants protected owner authority.
- MVP may use legacy role-to-permission mapping until normalized role tables are live.

### Database Dependencies

Current:

- `public.users`
- `public.user_roles` text roles

Future:

- `roles`
- `permissions`
- `role_permissions`
- normalized `user_roles`

### App Dependencies

- Navigation gates.
- CRUD guards.
- Workflow action visibility.
- Settings/admin access.

### Failure Cases

- User does not belong to company.
- User has no active roles.
- Legacy role is unknown.
- Role exists but has no permissions.

### Validation Examples

- Admin + Billing roles produce union of admin and billing permissions.
- Reviewer role does not grant review authority on an unassigned order unless order responsibility also applies.

## 3. `canUserPerform(userId, permissionKey, context)`

### Purpose

Answer whether a user can perform a specific action in a given context.

### Inputs

```ts
{
  userId: string;          // public.users.id
  permissionKey: string;
  context: {
    companyId: string;
    orderId?: string;
    order?: Order;
    targetStatus?: string;
    taskId?: string;
    resourceType?: string;
    resourceId?: string;
  };
}
```

### Output

```ts
{
  allowed: boolean;
  reason: string;
  source?: "global_permission" | "order_responsibility" | "owner_override" | "denied";
}
```

### Rules

- Check global permissions through `getEffectivePermissions`.
- Check order-scoped responsibility when order context exists.
- Company membership is required.
- Owner may override standard checks except protected safety constraints.
- Deny by default.

### Database Dependencies

- `users`
- `user_roles`
- future normalized role tables
- `orders`
- future `order_participants`

### App Dependencies

- Buttons/actions.
- Route guards.
- Form enablement.
- API/RPC authorization.

### Failure Cases

- Missing company context.
- Permission key is unknown.
- Order does not belong to company.
- User has permission globally but lifecycle status blocks action.

### Validation Examples

- Assigned appraiser can submit assigned order to review.
- Global reviewer cannot approve an order they are not assigned to.
- Owner can manage company settings.

## 4. `getOrderResponsibility(order, userId)`

### Purpose

Determine a user's role/responsibility on a specific order.

### Inputs

```ts
{
  order: Order;
  userId: string; // public.users.id
}
```

### Output

```ts
{
  user_id: string;
  order_id: string;
  role_on_order: string | null;
  responsibility_type: string | null;
  is_active: boolean;
  source: "order_participant" | "order_assignment" | "task" | "none";
}
```

### Rules

- Prefer `order_participants` when available.
- Fall back to `order.appraiser_id` and `order.reviewer_id`.
- Responsibility is lifecycle-aware.
- Global role is not used to determine order-specific responsibility unless no assignment exists and a policy explicitly allows it.

### Database Dependencies

Current:

- `orders.appraiser_id`
- `orders.reviewer_id`

Future:

- `order_participants`
- `order_tasks`

### App Dependencies

- Activity note routing.
- Notification routing.
- Workflow action visibility.
- Order detail labels.

### Failure Cases

- Order missing assignment fields.
- User ID is auth ID instead of app user ID.
- Participant record conflicts with order convenience fields.

### Validation Examples

- User with global admin role assigned as appraiser returns `role_on_order = appraiser`.
- Reviewer assigned to order but status is `in_progress` may be passive/inactive depending policy.

## 5. `resolveOrderParticipants(order, eventContext)`

### Purpose

Resolve active participants, visibility, bell recipients, and actor/recipient contexts for an order event.

### Inputs

```ts
{
  order: {
    id: string;
    order_number: string;
    company_id?: string;
    status: string;
    appraiser_id?: string | null;
    reviewer_id?: string | null;
  };
  eventContext: {
    event_key: string;
    category: "lifecycle" | "communication" | "assignment" | "audit" | "document" | "billing" | "system";
    actor_user_id?: string;
    target_user_ids?: string[];
    tagged_user_ids?: string[];
    task_id?: string;
    from_status?: string;
    to_status?: string;
    importance?: "low" | "normal" | "high" | "critical";
    explicit_recipient_ids?: string[];
    suppress_self_notification?: boolean;
  };
}
```

### Output

```ts
{
  activeParticipants: Array<{
    user_id: string;
    responsibility_type: string;
    role_on_order: string;
    source: string;
  }>;
  visibleUserIds: string[];
  bellRecipientIds: string[];
  passiveParticipantIds: string[];
  actorRoleOnOrder: string | null;
  recipientContexts: Array<{
    user_id: string;
    role_on_order: string;
    reason: string;
    importance: string;
  }>;
}
```

### Rules

- Use `public.users.id`.
- Require `order.order_number` for order-related notification payloads.
- Resolve assignment before global role.
- Apply lifecycle rules.
- Apply self-notification suppression.
- Visibility does not equal bell delivery.
- Admin/owner visibility is permission-based and bell delivery is preference-based.

### Database Dependencies

- `orders`
- `users`
- future `order_participants`
- future `order_tasks`
- notification preference/settings tables

### App Dependencies

- `emitOrderEvent`
- `createNotification`
- workflow modals
- activity note form
- admin feed

### Failure Cases

- Missing order ID.
- Missing order number.
- Recipient is inactive.
- Actor equals recipient and suppression is on.
- No active recipient for event.

### Validation Examples

- Appraiser note routes to assigned reviewer.
- Reviewer note routes to assigned appraiser.
- Admin assigned as appraiser routes as appraiser.
- Routine note appears in admin feed but not admin bell unless configured.

## 6. `createActivityEvent(event)`

### Purpose

Write a durable activity/audit/communication event.

### Inputs

```ts
{
  company_id: string;
  order_id?: string;
  actor_user_id?: string; // public.users.id
  event_type: string;
  category: "lifecycle" | "communication" | "assignment" | "audit" | "document" | "billing" | "system";
  title?: string;
  body?: string;
  visibility: "internal" | "participants" | "client_visible" | "admin_only";
  importance?: "low" | "normal" | "high" | "critical";
  payload: Record<string, unknown>;
}
```

### Output

```ts
ActivityLogEvent
```

### Rules

- Activity is the durable source of history.
- Order-related events must include `payload.order_id` and `payload.order_number`.
- Actor should be `public.users.id`.
- Payload snapshots display names and role-on-order when relevant.
- Do not rely on notifications as historical source.

### Database Dependencies

- `activity_log`
- `orders`
- `users`

### App Dependencies

- Activity log UI.
- Admin communication feed.
- Notification creation.
- Audit reporting.

### Failure Cases

- Missing order number for order event.
- User cannot see/write activity in context.
- Invalid category/visibility.
- Actor user does not exist.

### Validation Examples

- Reviewer requesting revisions writes lifecycle event with `from_status` and `to_status`.
- Activity remains readable after reviewer is reassigned.

## 7. `createNotification(notification)`

### Purpose

Create one delivery record for one recipient.

### Inputs

```ts
{
  user_id: string; // public.users.id recipient
  company_id?: string;
  order_id?: string;
  activity_event_id?: string;
  type: string;
  category: string;
  title: string;
  body?: string;
  link_path?: string;
  payload: NotificationPayload;
}
```

### Output

```ts
Notification
```

### Rules

- `user_id` is recipient `public.users.id`.
- Order-related notifications must include `payload.order_number`.
- `title` and `body` should be display-ready.
- `order_id` is for routing/querying.
- Visible order label comes from `payload.order_number`.
- Notification creation should return or throw structured errors; do not silently swallow RPC errors.

### Database Dependencies

- `notifications`
- `users`
- `orders`
- `notification_preferences`
- `email_outbox` trigger/service

### App Dependencies

- Notification bell.
- Email delivery.
- Admin delivery audit.

### Failure Cases

- Recipient user does not exist.
- Payload missing `order_number` for order notification.
- FK violation on `user_id` or `order_id`.
- User preferences disable optional delivery.

### Validation Examples

- Pam's public user ID differs from auth ID; notification still inserts and appears in bell.
- Note notification renders title `Chris Rossi added a note`, body text, and `ORD-26001`.

## 8. `emitOrderEvent(eventContext)`

### Purpose

Orchestrate an order event by creating durable activity and appropriate notifications.

### Inputs

```ts
{
  order: Order;
  actor_user_id: string; // public.users.id
  event_key: string;
  category: "lifecycle" | "communication" | "assignment" | "document" | "billing";
  message?: string;
  from_status?: string;
  to_status?: string;
  target_user_ids?: string[];
  tagged_user_ids?: string[];
  importance?: "low" | "normal" | "high" | "critical";
  payload?: Record<string, unknown>;
}
```

### Output

```ts
{
  activityEvent: ActivityLogEvent;
  notifications: Notification[];
  skippedRecipients: Array<{ user_id: string; reason: string }>;
}
```

### Rules

- Calls `resolveOrderParticipants`.
- Calls `createActivityEvent`.
- Calls `createNotification` for bell recipients.
- Admin feed comes from activity, not notification spam.
- Self-notification suppression applies unless explicitly disabled.

### Database Dependencies

- `orders`
- `activity_log`
- `notifications`
- `users`
- notification settings/preferences

### App Dependencies

- Activity note form.
- Workflow modals.
- Assignment flows.
- Document/billing flows later.

### Failure Cases

- Activity event fails.
- Notification partially fails.
- No bell recipients resolved.
- Actor lacks permission for event.

### Validation Examples

- Appraiser adds note: activity event created, reviewer notified.
- Reviewer requests revisions: lifecycle event created, appraiser notified high importance.
- Admin adds routine note: activity event appears in feed, participants notified only by target/policy.

## 9. `transitionOrderStatus(orderId, targetStatus, context)`

### Purpose

Safely transition an order between lifecycle statuses.

### Inputs

```ts
{
  orderId: string;
  targetStatus: string;
  context: {
    actor_user_id: string; // public.users.id
    company_id: string;
    note?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  };
}
```

### Output

```ts
{
  order: Order;
  from_status: string;
  to_status: string;
  activityEvent: ActivityLogEvent;
  notifications: Notification[];
}
```

### Rules

- Validate allowed transition.
- Check permission and responsibility.
- Update order status atomically.
- Write activity event.
- Emit notifications to active responsible users.
- Preserve order number in all payloads.

### Database Dependencies

- `orders`
- `activity_log`
- `notifications`
- future `order_participants`
- future workflow settings

### App Dependencies

- Workflow buttons/modals.
- Dashboard queues.
- Reviewer/appraiser lifecycle.

### Failure Cases

- Invalid transition.
- Actor lacks permission.
- Order missing reviewer/appraiser for target state.
- Concurrent transition conflict.
- Activity/notification failure after status update if not transactional.

### Validation Examples

- `in_progress -> in_review` by assigned appraiser notifies reviewer.
- `in_review -> needs_revisions` by assigned reviewer notifies appraiser.
- `completed -> in_progress` requires reopen permission.

## 10. `assignOrderParticipant(orderId, userId, responsibilityType, context)`

### Purpose

Assign or reassign a user to an order responsibility.

### Inputs

```ts
{
  orderId: string;
  userId: string; // public.users.id assigned user
  responsibilityType: "appraiser" | "reviewer" | "inspector" | "field_rep" | "billing" | "client_contact" | "tagged" | "watcher";
  context: {
    actor_user_id: string; // public.users.id
    company_id: string;
    reason?: string;
    task_id?: string;
    metadata?: Record<string, unknown>;
  };
}
```

### Output

```ts
{
  participant: OrderParticipant;
  previousParticipant?: OrderParticipant;
  order: Order;
  activityEvent: ActivityLogEvent;
  notifications: Notification[];
}
```

### Rules

- Check assignment permission.
- End prior active participant of same responsibility type if applicable.
- Create new active participant.
- Keep `orders.appraiser_id` / `orders.reviewer_id` in sync for MVP convenience.
- Write assignment activity.
- Notify new participant when active or policy requires.

### Database Dependencies

Current:

- `orders.appraiser_id`
- `orders.reviewer_id`

Future:

- `order_participants`
- `order_tasks`

### App Dependencies

- Assignment UI.
- Admin order management.
- Responsibility resolver.
- Notification service.

### Failure Cases

- User not in company.
- Responsibility type invalid.
- Actor lacks assignment permission.
- Reassignment would leave active workflow blocked.
- Assigned user is inactive.

### Validation Examples

- Reassign reviewer mid-review notifies new reviewer.
- Reassign appraiser in `needs_revisions` makes new appraiser active.
- Old participant remains in activity history but is no longer active.

## 11. `generateOrderNumber(companyId)`

### Purpose

Generate the next company-facing order number.

### Inputs

```ts
{
  companyId: string;
  effectiveAt?: string;
}
```

### Output

```ts
{
  order_number: string;
  sequence: number;
  period: string;
}
```

### Rules

- Order number is visible to users and clients.
- Must be unique within company.
- Must not expose internal UUIDs.
- Must be generated transactionally to avoid collisions.
- Manual override is allowed only if company policy permits it.

### Database Dependencies

Current:

- `order_numbering_rules`
- `order_number_counters`

Future:

- `company_order_numbering`

### App Dependencies

- Order creation form.
- Setup wizard.
- Demo seed scripts.

### Failure Cases

- Company has no numbering settings.
- Sequence collision.
- Unsupported pattern.
- Manual override duplicates existing order number.

### Validation Examples

- Default company generates `2026001` or configured pattern.
- Two simultaneous order creations produce unique numbers.
- UI shows generated order number, not order UUID.

## 12. `getAdminCommunicationFeed(filters)`

### Purpose

Return admin/owner communication and workflow feed from durable activity events.

### Inputs

```ts
{
  companyId: string;
  actorUserId?: string;
  orderId?: string;
  clientId?: string;
  category?: string;
  importance?: "low" | "normal" | "high" | "critical";
  status?: string;
  search?: string;
  before?: string;
  limit?: number;
}
```

### Output

```ts
{
  items: Array<{
    id: string;
    order_id?: string;
    order_number?: string;
    title: string;
    body?: string;
    actor_name?: string;
    recipient_name?: string;
    direction_label?: string;
    kind_label?: string;
    category: string;
    importance: string;
    created_at: string;
    link_path?: string;
  }>;
  next_before?: string;
}
```

### Rules

- Feed reads from `activity_log`, not notifications.
- Requires permission such as `communications.view.all` or `activity.read.all`.
- Routine direct participant communication appears here for admins even if it does not become an admin bell notification.
- Visible order label is `order_number`.
- Should support pagination.

### Database Dependencies

- `activity_log`
- `orders`
- `clients`
- `users`
- permissions/roles

### App Dependencies

- Admin dashboard.
- Communication feed component.
- Filters/search.

### Failure Cases

- Actor lacks feed permission.
- Company context missing.
- Payload missing order number for historical items.
- Query too broad without pagination.

### Validation Examples

- Admin sees `Chris Rossi → Pam Casper · Appraiser note · ORD-26001`.
- Admin does not get a bell notification for every feed item.
- Feed filters by order and importance.

## Cross-Contract Validation Rules

- Every function receiving a user ID must document whether it expects `public.users.id` or `auth.users.id`.
- All app-facing contracts should expect `public.users.id`.
- Every order-related payload must include both `order_id` and `order_number`.
- Every notification must be display-ready without another query.
- Every workflow mutation should create an activity event.
- Every bell notification should be traceable to an activity/event context where practical.
- Permission checks answer "can this user do this?"
- Responsibility checks answer "what is this user responsible for on this order?"
