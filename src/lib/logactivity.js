import supabase from './supabaseClient';

export async function logActivity({ user_id, order_id = null, action, role, visible_to = ['admin'], context = {} }) {
  const { error } = await supabase.from('activity_log').insert([
    {
      user_id,
      order_id,
      action,
      role,
      visible_to,
      context,
    }
  ]);

  if (error) {
    console.error('Error logging activity:', error.message);
  }
}
