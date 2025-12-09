// src/features/orders/api.js
import { supabase as defaultClient } from '@/lib/supabaseClient';

function normalizeQuery(q) {
  const page = Math.max(1, Number(q?.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(q?.pageSize ?? 25) || 25));
  return {
    page,
    pageSize,
    status: (q?.status ?? '').trim() || null,
    search: (q?.search ?? '').trim(),
    appraiserId: q?.appraiserId || null,
    clientId: q?.clientId || null,
    priority: (q?.priority ?? '').trim() || null,
    dueWindow: (q?.dueWindow ?? '').trim() || null, // '', 'overdue', '3','7','14'
    includeArchived: Boolean(q?.includeArchived),
    sort: q?.sort ?? 'priority_asc,due_date_asc',
  };
}

function baseSelect(client) {
  return client
    .from('v_orders_list_with_last_activity')
    .select('*', { count: 'exact', head: false });
}

function isoDateOnly(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function computePriority(row) {
  const today = new Date(isoDateOnly(new Date()));
  const due   = row.due_date ? new Date(row.due_date) : null;
  const rev   = row.review_due_date ? new Date(row.review_due_date) : null;

  if (due && due < today) return 'overdue';
  if (rev && rev < today) return 'review_overdue';
  if (due && (due - today) / 86400000 <= 2) return 'due_soon';
  if (rev && (rev - today) / 86400000 <= 2) return 'review_soon';
  return 'normal';
}

function mapOrdersFallback(rows) {
  return (rows || []).map((o) => {
    const display_address = [o.address, o.city, [o.state, o.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    return {
      ...o,
      display_address,
      priority: computePriority(o),
      last_action: null,
      last_message: null,
      last_activity_at: null,
    };
  });
}

async function tryViewList(q, client) {
  const {
    page, pageSize, status, search, appraiserId, clientId,
    priority, dueWindow, includeArchived, sort
  } = normalizeQuery(q);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = baseSelect(client);

  if (status)      query = query.eq('status', status);
  if (appraiserId) query = query.eq('appraiser_id', appraiserId);
  if (clientId)    query = query.eq('client_id', clientId);
  if (priority)    query = query.eq('priority', priority);

  if (!includeArchived) {
    query = query.or('is_archived.is.null,is_archived.eq.false');
  }

  if (dueWindow) {
    const today = isoDateOnly(new Date());
    if (dueWindow === 'overdue') {
      query = query.not('due_date', 'is', null).lt('due_date', today);
    } else {
      const days = Number(dueWindow);
      if (!Number.isNaN(days) && days > 0) {
        const end = isoDateOnly(new Date(Date.now() + days * 86400000));
        query = query
          .not('due_date', 'is', null)
          .gte('due_date', today)
          .lte('due_date', end);
      }
    }
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

  // Sorting (view supports these columns)
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

  return await query.range(from, to);
}

async function fallbackList(q, client) {
  const {
    page, pageSize, status, search, appraiserId, clientId,
    dueWindow, includeArchived
  } = normalizeQuery(q);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Base table select; keep columns used by UI
  let query = client
    .from('orders')
    .select(
      'id, order_number, title, status, created_at, updated_at, ' +
      'due_date, review_due_date, site_visit_at, ' +
      'appraiser_id, client_id, ' +
      'address, city, state, zip',
      { count: 'exact', head: false }
    );

  if (status)      query = query.eq('status', status);
  if (appraiserId) query = query.eq('appraiser_id', appraiserId);
  if (clientId)    query = query.eq('client_id', clientId);

  if (!includeArchived) {
    // If your orders table lacks is_archived, remove this line
    query = query.or('is_archived.is.null,is_archived.eq.false');
  }

  if (dueWindow) {
    const today = isoDateOnly(new Date());
    if (dueWindow === 'overdue') {
      query = query.not('due_date', 'is', null).lt('due_date', today);
    } else {
      const days = Number(dueWindow);
      if (!Number.isNaN(days) && days > 0) {
        const end = isoDateOnly(new Date(Date.now() + days * 86400000));
        query = query
          .not('due_date', 'is', null)
          .gte('due_date', today)
          .lte('due_date', end);
      }
    }
  }

  if (search) {
    const term = `%${search}%`;
    query = query.or(
      [
        `title.ilike.${term}`,
        `order_number.ilike.${term}`,
        `address.ilike.${term}`,
        `city.ilike.${term}`,
        `state.ilike.${term}`,
        `zip.ilike.${term}`,
      ].join(',')
    );
  }

  // Fall back to a stable order; we compute "priority" client-side
  query = query.order('created_at', { ascending: false });

  const { data, error, count } = await query.range(from, to);
  if (error) return { data: [], count: 0, error: error.message };

  return { data: mapOrdersFallback(data), count: count || 0 };
}

/**
 * Fetch paginated orders from the view; if the view/columns aren’t present,
 * fall back to base `orders` with computed fields.
 */
export async function getOrdersList(q = {}, client = defaultClient) {
  try {
    const { data, error, count } = await tryViewList(q, client);
    if (!error) return { data: data || [], count: count || 0 };
    // 400s from PostgREST → fallback
    console.warn('[orders] view query failed, falling back:', error?.message);
    return await fallbackList(q, client);
  } catch (e) {
    console.warn('[orders] view query threw, falling back:', e?.message);
    return await fallbackList(q, client);
  }
}

/** Fetch one order by id (view → fallback) */
export async function getOrderById(orderId, client = defaultClient) {
  try {
    const { data, error } = await client
      .from('v_orders_list_with_last_activity')
      .select('*')
      .eq('id', orderId)
      .single();
    if (!error && data) return { data };
  } catch {}
  const { data, error } = await client
    .from('orders')
    .select('*, address, city, state, zip, due_date, review_due_date, site_visit_at')
    .eq('id', orderId)
    .single();
  if (error) return { data: null, error: error.message };
  return { data };
}

/** Count matching orders (view → fallback) */
export async function getOrdersCount(q = {}, client = defaultClient) {
  try {
    const { status, search, appraiserId, clientId, priority, dueWindow, includeArchived } = normalizeQuery(q);
    let query = client
      .from('v_orders_list_with_last_activity')
      .select('*', { count: 'exact', head: true });

    if (status)      query = query.eq('status', status);
    if (appraiserId) query = query.eq('appraiser_id', appraiserId);
    if (clientId)    query = query.eq('client_id', clientId);
    if (priority)    query = query.eq('priority', priority);

    if (!includeArchived) query = query.or('is_archived.is.null,is_archived.eq.false');

    if (dueWindow) {
      const today = isoDateOnly(new Date());
      if (dueWindow === 'overdue') {
        query = query.not('due_date', 'is', null).lt('due_date', today);
      } else {
        const days = Number(dueWindow);
        if (!Number.isNaN(days) && days > 0) {
          const end = isoDateOnly(new Date(Date.now() + days * 86400000));
          query = query
            .not('due_date', 'is', null)
            .gte('due_date', today)
            .lte('due_date', end);
        }
      }
    }

    const { error, count } = await query;
    if (!error) return { count: count || 0 };
    console.warn('[orders] view count failed, falling back:', error?.message);
  } catch (e) {
    console.warn('[orders] view count threw, falling back:', e?.message);
  }

  // Fallback count from base table
  const { status, search, appraiserId, clientId, dueWindow, includeArchived } = normalizeQuery(q);
  let q2 = client.from('orders').select('*', { count: 'exact', head: true });
  if (status)      q2 = q2.eq('status', status);
  if (appraiserId) q2 = q2.eq('appraiser_id', appraiserId);
  if (clientId)    q2 = q2.eq('client_id', clientId);
  if (!includeArchived) q2 = q2.or('is_archived.is.null,is_archived.eq.false');

  if (search) {
    const term = `%${search}%`;
    q2 = q2.or(
      [
        `title.ilike.${term}`,
        `order_number.ilike.${term}`,
        `address.ilike.${term}`,
      ].join(',')
    );
  }
  if (dueWindow) {
    const today = isoDateOnly(new Date());
    if (dueWindow === 'overdue') {
      q2 = q2.not('due_date', 'is', null).lt('due_date', today);
    } else {
      const days = Number(dueWindow);
      if (!Number.isNaN(days) && days > 0) {
        const end = isoDateOnly(new Date(Date.now() + days * 86400000));
        q2 = q2
          .not('due_date', 'is', null)
          .gte('due_date', today)
          .lte('due_date', end);
      }
    }
  }

  const { error: e2, count: c2 } = await q2;
  if (e2) return { count: 0, error: e2.message };
  return { count: c2 || 0 };
}



