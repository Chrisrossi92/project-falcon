import supabase from '@/lib/supabaseClient';

export default async function handler(req, res) {
  const { orderId } = req.query;

  if (!orderId) {
    return res.status(400).json({ error: 'Missing orderId' });
  }

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('order_id', orderId)
    .eq('visible_to_appraiser', true)
    .order('timestamp', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Supabase error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch activity log' });
  }

  return res.status(200).json(data);
}
