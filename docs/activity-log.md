# Activity Log

MVP backend for the Order Drawer “Activity” tab.

- Table: `public.activity_log`
- RPC-only writes:
  - `rpc_log_status_change(order_id, prev_status, new_status, message?)`
  - `rpc_log_note(order_id, message)`
- RLS: `authenticated` can read (tighten later by role).
- Indexes: `(order_id)`, `(created_at desc)`

**UI usage (Supabase JS):**
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
