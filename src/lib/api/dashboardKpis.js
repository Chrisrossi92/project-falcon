// src/lib/api/dashboardKpis.js
import supabase from "@/lib/supabaseClient";

const ACTIVE_VIEW = "v_orders_active_frontend_v4";

function applyScope(q, { reviewerId = null, appraiserId = null, clientId = null } = {}) {
  if (reviewerId) q = q.eq("reviewer_id", reviewerId);
  else if (appraiserId) q = q.eq("appraiser_id", appraiserId);
  if (clientId) q = q.eq("client_id", clientId);
  return q;
}

async function countWithScope(scope, mutator) {
  let q = supabase.from(ACTIVE_VIEW).select("*", { count: "exact", head: true });
  q = applyScope(q, scope);
  if (mutator) q = mutator(q);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

export async function fetchDashboardKpis(scope = {}) {
  const baseScope = {
    reviewerId: scope.reviewerId || null,
    appraiserId: scope.appraiserId || null,
    clientId: scope.clientId || scope.managingAmcId || null,
  };

  const dueLimit = new Date();
  dueLimit.setDate(dueLimit.getDate() + 7);
  const dueIso = dueLimit.toISOString();
  const nowIso = new Date().toISOString();

  const [total_active, in_progress, due_in_7] = await Promise.all([
    countWithScope(baseScope),
    countWithScope(baseScope, (q) => q.eq("status", "in_progress")),
    countWithScope(baseScope, (q) =>
      q
        .gte("final_due_date", nowIso)
        .lte("final_due_date", dueIso)
        .not("final_due_date", "is", null)
    ),
  ]);

  return { total_active, in_progress, due_in_7 };
}
