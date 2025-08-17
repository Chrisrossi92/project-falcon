import { supa as defaultClient } from '../../lib/supa.client';

/**
 * Fetch orders list from the view with pagination and filtering.
 * @param {Object} q
 * @param {number} [q.page=1] 1-based page number
 * @param {number} [q.pageSize=25] items per page
 * @param {string} [q.status] filter by status
 * @param {string} [q.search] search term for title/order number/address
 * @param {number} [q.branchId] filter by branch id
 * @param {boolean} [q.includeArchived=false] include archived orders
 * @param {Object} [client=defaultClient] Supabase client instance
 * @returns {Promise<{ data: any[], count: number, error?: string }>} results and count
 */
export async function getOrdersList(q = {}, client = defaultClient) {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let s = client
    .from('v_orders_list_with_last_activity')
    .select('*', { count: 'exact', head: false })
    .order('priority', { ascending: true })
    .order('due_date', { ascending: true });

  if (q.status) s = s.eq('status', q.status);
  if (q.branchId != null) s = s.eq('branch_id', q.branchId);
  if (!q.includeArchived) s = s.or('is_archived.is.null,is_archived.eq.false');

  if (q.search && q.search.trim()) {
    const term = `%${q.search.trim()}%`;
    s = s.or([
      `title.ilike.${term}`,
      `order_number.ilike.${term}`,
      `display_address.ilike.${term}`,
    ].join(','));
  }

  const { data, error, count } = await s.range(from, to);
  if (error) {
    return { data: [], count: 0, error: error.message };
  }
  return { data: data || [], count: count || 0 };
}
