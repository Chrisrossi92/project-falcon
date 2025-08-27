# Calendar Events (Admin)

:contentReference[oaicite:2]{index=2}

---

## `docs/audit/calendar-events.md`
```md
# Calendar Events (Admin)

## Table
- `public.calendar_events`
- `event_type`: `site_visit`, `due_for_review`, `due_to_client`

## RPCs
- `rpc_create_calendar_event(...)`  
  *(security definer; RPC-only writes)*

## Views
- `v_admin_calendar` (optional convenience)

## RLS
- `authenticated` can read (tighten later)

## Example Usage (Supabase JS)
```ts
await supabase.rpc('rpc_create_calendar_event', {
  p_event_type: 'site_visit',
  p_title: 'Site Visit – 123 Main',
  p_start_at: new Date().toISOString(),
  p_end_at: new Date(Date.now() + 60*60*1000).toISOString(),
  p_order_id: orderId,
  p_appraiser_id: appraiserId,
  p_location: '123 Main St',
  p_notes: 'Lockbox code…'
});

