import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import supabase from "@/lib/supabaseClient";
import OrderActivityPanel from "@/components/orders/OrderActivityPanel";
import { updateOrderStatus, updateOrderDates } from "@/lib/services/ordersService";

const STATUSES = [
  "new","assigned","in_progress","site_visit_done","in_review",
  "ready_to_send","sent_to_client","revisions","complete",
];

function dtToLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function endOfDayLocal(date) {
  const d = new Date(date);
  d.setHours(23, 59, 0, 0);
  return d;
}
function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        client:client_id ( name ),
        appraiser:appraiser_id ( id, display_name, name, email )
      `)
      .eq("id", id)
      .single();
    if (error) {
      console.error(error);
      toast.error("Failed to load order");
    }
    setOrder(data || null);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // Save a subset of date fields via RPC (RLS‑safe) + emit notifications via service
  async function saveDates(patch) {
    setSaving(true);
    try {
      await updateOrderDates(id, {
        siteVisit: patch.site_visit_at ?? null,
        reviewDue: patch.review_due_at ?? null,
        finalDue: patch.final_due_at ?? null,
      });
      toast.success("Saved");
      fetchOrder();
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onStatusChange(next) {
    if (!next || next === order?.status) return;
    try {
      setSaving(true);
      await updateOrderStatus(id, next); // RPC + log + fan‑out handled in service
      toast.success(`Status → ${next}`);
      fetchOrder();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  // Quick-set helpers (call saveDates which uses the RPC)
  const qs = {
    site: async (days) => {
      const base = new Date();
      const when = addDays(base, days);
      when.setHours(9, 0, 0, 0); // 9:00 AM local
      await saveDates({ site_visit_at: when.toISOString() });
    },
    review: async (days) => {
      const base = order?.site_visit_at ? new Date(order.site_visit_at) : new Date();
      const when = endOfDayLocal(addDays(base, days));
      await saveDates({ review_due_at: when.toISOString() });
    },
    final: async (days) => {
      const base = order?.review_due_at ? new Date(order.review_due_at) : new Date();
      const when = endOfDayLocal(addDays(base, days));
      await saveDates({ final_due_at: when.toISOString() });
    },
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (!order) return <div className="p-6">Order not found.</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Order {order.order_number ?? id.slice(0, 8)}</h1>
          <div className="text-sm text-gray-500">{order.client?.name ?? order.manual_client ?? "—"}</div>
        </div>
        <button className="px-3 py-2 rounded-lg border" onClick={() => navigate(-1)}>Back</button>
      </div>

      {/* Summary */}
      <section className="bg-white rounded-2xl shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Status</div>
            <select
              className="border rounded-md px-2 py-2 text-sm w-full"
              value={order.status || "new"}
              onChange={(e) => onStatusChange(e.target.value)}
              disabled={saving}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}
            </select>
          </div>

          <div className="md:col-span-3">
            <div className="text-xs text-gray-500 mb-1">Address</div>
            <div className="text-sm">
              {order.property_address || order.address || "—"}
              {order.city ? `, ${order.city}` : ""} {order.state || ""} {order.postal_code || ""}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Appraiser</div>
            <div className="text-sm">{order.appraiser?.display_name || order.appraiser?.name || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Client</div>
            <div className="text-sm">{order.client?.name || order.manual_client || "—"}</div>
          </div>
        </div>
      </section>

      {/* Dates */}
      <section className="bg-white rounded-2xl shadow p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dates</h2>
          {/* Quick-sets */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-gray-500 mr-1">Site</span>
              <button className="px-2 py-1 rounded border" onClick={() => qs.site(7)}>+7</button>
              <button className="px-2 py-1 rounded border" onClick={() => qs.site(14)}>+14</button>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 mr-1">Review</span>
              <button className="px-2 py-1 rounded border" onClick={() => qs.review(5)}>+5</button>
              <button className="px-2 py-1 rounded border" onClick={() => qs.review(10)}>+10</button>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 mr-1">Final</span>
              <button className="px-2 py-1 rounded border" onClick={() => qs.final(3)}>+3</button>
              <button className="px-2 py-1 rounded border" onClick={() => qs.final(7)}>+7</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Site Visit</div>
            <input
              type="datetime-local"
              className="w-full border rounded-md px-2 py-2 text-sm"
              defaultValue={dtToLocalInput(order.site_visit_at)}
              onBlur={(e) => {
                const v = e.target.value ? new Date(e.target.value).toISOString() : null;
                saveDates({ site_visit_at: v });
              }}
              disabled={saving}
            />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Review Due</div>
            <input
              type="datetime-local"
              className="w-full border rounded-md px-2 py-2 text-sm"
              defaultValue={dtToLocalInput(order.review_due_at)}
              onBlur={(e) => {
                const v = e.target.value ? new Date(e.target.value).toISOString() : null;
                saveDates({ review_due_at: v });
              }}
              disabled={saving}
            />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Final Due</div>
            <input
              type="datetime-local"
              className="w-full border rounded-md px-2 py-2 text-sm"
              defaultValue={dtToLocalInput(order.final_due_at)}
              onBlur={(e) => {
                const v = e.target.value ? new Date(e.target.value).toISOString() : null;
                saveDates({ final_due_at: v });
              }}
              disabled={saving}
            />
          </div>
        </div>
      </section>

      {/* Activity */}
      <section className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Activity</h2>
        <OrderActivityPanel orderId={id} />
      </section>
    </div>
  );
}










