import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail fast in dev so we don't chase phantom auth/data errors
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Create .env from .env.example and restart Vite.'
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;

// Optionally keep your helpers if you use them elsewhere:
export async function getClients() {
  const { data, error } = await supabase.from('clients').select('*');
  if (error) {
    console.error('Error fetching clients:', error);
    return [];
  }
  return data;
}

export async function getUsers() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return data;
}

export async function updateOrder(order) {
  const { id, appraiser, client, appraiser_name, client_name, ...fields } = order;
  const { data, error } = await supabase.from('orders').update(fields).eq('id', id);
  return { data, error };
}








