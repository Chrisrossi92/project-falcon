# Orders RPCs (RPC-only writes)

RLS enabled on `public.orders`; direct writes are blocked. Use RPCs:

- `rpc_update_order_status(order_id, new_status, note?) -> orders`
- `rpc_assign_order(order_id, assigned_to, note?) -> orders`
- `rpc_update_due_dates(order_id, due_date, review_due_date) -> orders`

**Example:**
```ts
await supabase.rpc('rpc_update_order_status', {
  p_order_id: orderId, p_new_status: 'review', p_note: 'QA passed'
});
await supabase.rpc('rpc_assign_order', {
  p_order_id: orderId, p_assigned_to: userId, p_note: 'Reassign to Alex'
});
```
