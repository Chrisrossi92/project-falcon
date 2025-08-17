// src/features/orders/api.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { supa as defaultClient } from '../../lib/supa.client';

export type Priority = 'overdue' | 'review_overdue' | 'due_soon' | 'review_soon' | 'normal';

export type OrdersListRow = {
  id: string;
  order_number: string | null;
  title: string | null;
  status: string | null;
  paid_status: string | null;
  created_at: string | null;
  updated_at: string | null;
  due_date: string | null;
  review_due_date: string | null;
  site_visit_at: string | null;
  appraiser_id: string | null;
  assigned_to: string | null;
  client_id: number | null;
  branch_id: number | null;
  address: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  zip: string | null;
  display_address: string | null;
  is_overdue: boolean | null;
  is_review_overdue: boolean | null;
  has_site_visit: boolean | null;
  is_archived: boolean | null;
  due_in_days: number | null;
  review_due_in_days: number | null;
  priority: Priority | null;

  // from last-activity view
  last_action?: string | null;
  last_message?: string | null;
  last_activity_at?: string | null;
};

export type OrdersListQuery = {
  page?: number;          // 1-based
  pageSize?: number;      // default 25
  status?: string;        // exact match
  search?: string;        // matches title/order_number/display_address
  branchId?: number;      // optional filter
  includeArchived?: boolean; // default false
};

export async function getOrdersList(
  q: OrdersListQuery = {},
  client: SupabaseClient = defaultClient
): Promise<{ data: OrdersListRow[]; count: number; error?: string }> {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let s = client
    .from('v_orders_list_with_last_activity')
    .select('*', { count: 'exact', head: false })
    .order('priority', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .range(from, to);

  if (q.status) s = s.eq('status', q.status);
  if (q.branchId != null) s = s.eq('branch_id', q.branchId);
  if (!q.includeArchived) s = s.or('is_archived.is.null,is_archived.eq.false');

  if (q.search?.trim()) {
    const term = `%${q.search.trim()}%`;
    // OR across a few safe text columns
    s = s.or(
      [
        `title.ilike.${term}`,
        `order_number.ilike.${term}`,
        `display_address.ilike.${term}`,
      ].join(',')
    );
  }

  const { data, error, count } = await s;
  if (error) return { data: [], count: 0, error: error.message };
  return { data: (data as OrdersListRow[]) ?? [], count: count ?? 0 };
}
