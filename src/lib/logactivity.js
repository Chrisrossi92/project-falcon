// src/lib/logactivity.js
import { supabase } from './supabaseClient';

export async function fetchActivity(orderId) {
  const { data, error } = await supabase.rpc('get_order_activity_flexible_v3', {
    p_order_id: orderId,
  });
  if (error) throw error;
  return data ?? [];
}


