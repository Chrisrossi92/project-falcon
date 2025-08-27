# Activity Log

MVP backend for the Order Drawer “Activity” tab.

## Table
- `public.activity_log`

## RPCs (write-only)
- `rpc_log_status_change(order_id, prev_status, new_status, message?)`
- `rpc_log_note(order_id, message)`

## RLS
- Role: `authenticated` can read  
- (Tighten by role later)

## Indexes
- `(order_id)`
- `(created_at desc)`

## UI Usage (Supabase JS)
```ts
await supabase.rpc('rpc_log_status_change', {
  p_order_id: orderId,
  p_prev_status: prev,
  p_new_status: next,
  p_message: note ?? null
});

const { data } = await supabase
  .from('activity_log')
  .select('*')
  .eq('order_id', orderId)
  .order('created_at', { ascending: false });

  :contentReference[oaicite:0]{index=0}

---

## `docs/audit/admin-calendar.md`
```md
# Admin Calendar

## Base
- Table: `calendar_events`
- Event types: `site_visit`, `due_for_review`, `due_to_client`

## Views
- `v_admin_calendar` — raw events
- `v_admin_calendar_enriched` — adds `appraiser_name`, `appraiser_color`, `event_icon`

## Suggested icons
- `map-pin`
- `alert-triangle`
- `send`


