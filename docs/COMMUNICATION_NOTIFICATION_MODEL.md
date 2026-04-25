# Communication And Notification Model

## Goal

Falcon communication should be clear, auditable, and actionable.

Activity and notifications are related but separate:

- Activity log is the durable history.
- Notifications are delivery records to specific users.
- Admin communication feed is a visibility surface, not necessarily a bell stream.

## Core Concepts

### Activity Log

The activity log records what happened on an order.

Examples:

- Order created.
- Appraiser assigned.
- Reviewer assigned.
- Status changed.
- Note added.
- Submitted to review.
- Revisions requested.
- Marked ready for client.
- Completed.

Activity entries should store:

- Internal `order_id`.
- User-facing `order_number`.
- Event type.
- Actor user id.
- Actor display name.
- Actor role on order.
- Detail payload.
- Created timestamp.

### Notification

A notification is a delivery record for one recipient.

Notifications should store:

- Recipient user id.
- Event type.
- Category.
- Priority/importance.
- Title.
- Body.
- Internal `order_id`.
- Link path.
- Payload.
- Read state.

### Visibility

Visibility answers:

```txt
Who is allowed to see this communication?
```

### Bell Delivery

Bell delivery answers:

```txt
Who should be interrupted by this communication?
```

These must remain separate.

## User-Facing Identifier Rules

- `order.id` is internal.
- `order.order_number` is user-facing.
- Do not show UUIDs in normal notification text.
- UUIDs can be used for routing and debug fallbacks only.

## Notification Payload Standard

All order-related notifications should use this shape where possible:

```json
{
  "order_id": "internal uuid",
  "order_number": "ORD-24008",
  "event_type": "note.appraiser_added",
  "category": "communication",
  "importance": "normal",
  "note_text": "Any revisions yet?",
  "actor": {
    "user_id": "public.users.id",
    "name": "Chris Rossi",
    "role_on_order": "appraiser"
  },
  "recipient": {
    "user_id": "public.users.id",
    "name": "Pam Casper",
    "role_on_order": "reviewer"
  },
  "order_participants": {
    "appraiser_id": "public.users.id",
    "appraiser_name": "Chris Rossi",
    "reviewer_id": "public.users.id",
    "reviewer_name": "Pam Casper"
  },
  "communication": {
    "direction_label": "Chris Rossi -> Pam Casper",
    "kind_label": "Appraiser note",
    "visibility": ["appraiser", "reviewer", "admin", "owner"]
  }
}
```

## Direct Participant Notification Format

For appraisers, reviewers, inspectors, and directly responsible participants:

```txt
Chris Rossi added a note
Any revisions yet?
ORD-24008
```

The order number should be the clickable line.

## Admin Communication Feed Format

For admins/owners:

```txt
Chris Rossi -> Pam Casper · Appraiser note · ORD-24008
Any revisions yet?
Today 2:14 PM · communication · normal
```

This feed should support filtering by:

- Order.
- Actor.
- Recipient/context.
- Event type.
- Importance.
- Date.

## Bell Rules

Direct participants receive bell notifications when:

- They have active responsibility.
- They are directly assigned.
- They are directly tagged.
- A workflow state requires their action.

Admins/owners receive bell notifications when:

- They are directly tagged.
- Company preference says admins receive that category.
- Event importance is high and admin policy enables high-priority alerts.

Admins/owners should always have visibility into communication feed, regardless of bell preferences.

## Current MVP Flow

Current activity notes:

```txt
ActivityNoteForm -> logNote -> rpc_log_event
ActivityNoteForm -> emitNotification -> rpc_notification_create
```

Current workflow notes:

```txt
UnifiedOrdersTable workflow action -> logNote -> emitNotification
```

Current notification read:

```txt
NotificationBell -> rpc_get_notifications
```

## Recommended Resolver

Create a shared notification resolver:

```txt
resolveOrderNotificationContext(order, event, actorUserId, options)
```

Returns:

```js
{
  visibleTo: [],
  bellRecipients: [],
  actor: {},
  recipientContext: {},
  payload: {},
  importance: "normal"
}
```

This prevents ad hoc routing in UI components.

## Categories

Recommended categories:

- `communication`
- `workflow`
- `assignment`
- `deadline`
- `billing`
- `system`

## Importance Levels

Recommended importance:

- `low`: passive feed item.
- `normal`: normal direct notification.
- `high`: action required.
- `critical`: rare operational issue.

## What To Avoid

- Do not use notifications as the only communication history.
- Do not use activity log as per-user read state.
- Do not send all admin-visible communication as bells.
- Do not build notification text from UUIDs.
- Do not duplicate routing logic in multiple UI components.

