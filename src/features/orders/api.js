// src/features/orders/api.js
import { supa as defaultClient } from '../../lib/supa.client';

/** Normalize and clamp query params */
function normalizeQuery(q) {
  const page = Math.max(1, Number(q?.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(q?.pageSize ?? 25) || 25));
  return {
    page,
    pageSize,
    status: q?.status ?? null,
    search: (q?.search ?? '').trim(),
    branchId: q?.branchId ?? null,
    includeArchived: Boolean(q?.includeArchived),
    sort: q?.sort ?? 'priority_asc,due_date_asc', // e.g. "created_at_desc"
  };
}

function baseSelect(client) {
  return client
    .from('v_orders_list_with_last_activity')
    .select('*', { count: 'exact', head: false });
}

/**
 * Fetch paginated orders from the view.
 * @param {Object} q
 * @param {number} [q.page=1]
 * @param {number} [q.pageSize=25]
 * @param {string} [q.status]
 * @param {string} [q.search]
 * @param {number} [q.branchId]
 * @param {boolean} [q.includeArchived=false]
 * @param {string} [q.sort] e.g. "priority_asc,due_date_asc" or "created_at_desc"
 * @param {*} client Supabase client (optional)
 * @returns {Promise<{data: Array, count: number, error?: string}>}
 */
export async function getOrdersList(q = {}, client = defaultClient) {
  const { page, pageSize, status, search, branchId, includeArchived, sort } = normalizeQuery(q);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = baseSelect(client);

  if (status) query = query.eq('status', status);
  if (branchId != null) query = query.eq('branch_id', branchId);

  // Legacy rows may have NULL is_archived
  if (!includeArchived) {
    query = query.or('is_archived.is.null,is_archived.eq.false');
  }

  if (search) {
    const term = `%${search}%`;
    query = query.or(
      [
        `title.ilike.${term}`,
        `order_number.ilike.${term}`,
        `display_address.ilike.${term}`,
        `city.ilike.${term}`,
        `state.ilike.${term}`,
        `zip.ilike.${term}`,
      ].join(',')
    );
  }

  // Sorting
  const sortParts = (sort || '').split(',').map(s => s.trim()).filter(Boolean);
  if (sortParts.length === 0) {
    query = query
      .order('priority', { ascending: true })
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false });
  } else {
    for (const s of sortParts) {
      const desc = s.endsWith('_desc');
      const asc = s.endsWith('_asc');
      const col = s.replace(/_(asc|desc)$/, '');
      query = query.order(col, { ascending: asc || !desc });
    }
  }

  const { data, error, count } = await query.range(from, to);
  if (error) return { data: [], count: 0, error: error.message };

  return { data: data || [], count: count || 0 };
}

/**
 * Fetch one order (with last-activity fields) by id.
 * @param {string} orderId
 * @param {*} client
 * @returns {Promise<{data: Object|null, error?: string}>}
 */
export async function getOrderById(orderId, client = defaultClient) {
  const { data, error } = await client
    .from('v_orders_list_with_last_activity')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data };
}

/**
 * Count orders matching filters (no data payload).
 * Mirrors getOrdersList filtering.
 * @param {Object} q
 * @param {*} client
 * @returns {Promise<{count: number, error?: string}>}
 */
export async function getOrdersCount(q = {}, client = defaultClient) {
  const { status, search, branchId, includeArchived } = normalizeQuery(q);

  let query = client
    .from('v_orders_list_with_last_activity')
    .select('*', { count: 'exact', head: true });

  if (status) query = query.eq('status', status);
  if (branchId != null) query = query.eq('branch_id', branchId);
  if (!includeArchived) query = query.or('is_archived.is.null,is_archived.eq.false');

  if (search) {
    const term = `%${search}%`;
    query = query.or(
      [
        `title.ilike.${term}`,
        `order_number.ilike.${term}`,
        `display_address.ilike.${term}`,
      ].join(',')
    );
  }

  const { error, count } = await query;
  if (error) return { count: 0, error: error.message };
  return { count: count || 0 };
}

