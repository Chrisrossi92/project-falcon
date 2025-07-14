import { createClient } from '@supabase/supabase-js';

// Replace with your actual values
const supabaseUrl = 'https://okwqhkrsjgxrhyisaovc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rd3Foa3Jzamd4cmh5aXNhb3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNDkyMDAsImV4cCI6MjA2NTgyNTIwMH0.FTFa5XKGtzdZ_Q4_oQHzTn_asbgy6nkj_uRnRV_tFYg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;

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
  const {
    id,
    appraiser, client,
    appraiser_name, client_name,
    ...fields
  } = order;

  const { data, error } = await supabase
    .from('orders')
    .update(fields)
    .eq('id', id);

  return { data, error };
}







