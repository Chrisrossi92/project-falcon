# Orders RPCs (RPC-only writes)
:contentReference[oaicite:4]{index=4}

---

## `docs/audit/orders-activity.md`
```md
# Orders + Last Activity

## View
- `v_orders_list_with_last_activity` — joins each order with most recent `activity_log` row

## Adds
- `last_action`
- `last_message`
- `last_activity_at`

## Usage
- Orders table “Activity” column
- Drawer header

