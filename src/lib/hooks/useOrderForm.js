import { useState, useEffect } from "react";
import supabase from "@/lib/supabaseClient";
import logOrderEvent from "@/lib/utils/logOrderEvent";
import { useUser } from "@supabase/auth-helpers-react";

export default function useOrderForm(initialOrder) {
  const [order, setOrder] = useState(initialOrder);
  const [originalOrder, setOriginalOrder] = useState(initialOrder);
  const [saving, setSaving] = useState(false);
  const user = useUser();

  useEffect(() => { setOrder(initialOrder); setOriginalOrder(initialOrder); }, [initialOrder]);
  const handleChange = (field, value) => setOrder((prev) => ({ ...prev, [field]: value }));

  const saveOrder = async () => {
    // CREATE path (inside saveOrder)
if (!order?.id) {
  // strip id and non-table fields
  const { id, ...raw } = order || {};
  const allowed = [
    'status','client_id','appraiser_id',
    'manual_client','manual_appraiser',
    'property_address','city','state','postal_code',
    'site_visit_at','review_due_at','final_due_at',
    'order_number'
  ];
  const payload = Object.fromEntries(
    Object.entries(raw).filter(([k, v]) => allowed.includes(k) && v !== undefined)
  );

  payload.status = (payload.status || 'new').toLowerCase();
  payload.created_at = new Date().toISOString();
  payload.updated_at = new Date().toISOString();

  const { data: created, error: insertErr } = await supabase
    .from('orders')
    .insert(payload)
    .select('*')
    .single();

  if (insertErr) throw insertErr;

  await logOrderEvent({
    user_id: user.id,
    order_id: created.id,
    role: 'admin',
    action: 'order_created',
    message: 'Order created',
  });

  if (created.appraiser_id) {
    await logOrderEvent({
      user_id: user.id,
      order_id: created.id,
      role: 'admin',
      action: 'assigned',
      message: `Assigned to appraiser ${created.appraiser_id}`,
    });
  }

  setOrder(created);
  setOriginalOrder(created);
  return created;
}
  };

  return { order, handleChange, saveOrder, saving };
}







