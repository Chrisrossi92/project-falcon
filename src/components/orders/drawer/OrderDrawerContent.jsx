import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import normalizeOrder from "@/lib/orders/normalizeOrder";

import OrderDetailPanel from "@/components/orders/view/OrderDetailPanel";
import OrderAdminInfoPanel from "@/components/orders/view/OrderAdminInfoPanel";
import OrderDatesPanel from "@/components/orders/view/OrderDatesPanel";
import ActivityLog from "@/components/activity/ActivityLog";
import OrderOpenFullLink from "@/components/orders/drawer/OrderOpenFullLink";
import OrderSidebarPanel from "@/components/orders/view/OrderSidebarPanel";

const fmt = (d) => (!d ? "—" : isNaN(new Date(d)) ? "—" : new Date(d).toLocaleString());

// fetch a complete row from the view (already includes client_name, appraiser_name, fee_amount, etc.)
async function fetchOrderFull(orderId) {
  const res = await supabase
    .from("v_orders_frontend")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (res.error) throw res.error;
  return res.data;
}

function SafePanel({ children, title }) {
  try {
    return children;
  } catch (e) {
    return (
      <div className="rounded border bg-rose-50 p-2 text-rose-700 text-xs">
        {title ? `${title}: ` : ""}{e?.message || "Panel failed to render"}
      </div>
    );
  }
}

export default function OrderDrawerContent({ orderId, order: rowFromTable, onRefresh }) {
  const id = orderId ?? rowFromTable?.id ?? null;
  const [row, setRow] = useState(rowFromTable || null);
  const [loading, setLoading] = useState(!rowFromTable);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) return;
      try {
        setLoading(true);
        const full = await fetchOrderFull(id);
        if (mounted) setRow(full || rowFromTable || null);
      } catch (e) {
        if (mounted) setErr(e?.message || "Failed to load order");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, rowFromTable]);

  const n = normalizeOrder(row || {});

  if (!id) return <div className="p-3 text-sm text-muted-foreground">No order selected.</div>;
  if (loading) return <div className="p-3 text-sm text-muted-foreground">Loading…</div>;
  if (err) return <div className="p-3 text-sm text-rose-700 bg-rose-50 border rounded">{err}</div>;

  return (
    <div className="grid grid-cols-12 gap-3">
      {/* Left column */}
      <div className="col-span-12 lg:col-span-8 space-y-3">
        <div className="rounded border bg-white p-3">
          <div className="text-sm font-semibold mb-1">Order {n.orderNo || n.id}</div>
          <div className="text-xs text-muted-foreground">Created {fmt(n.createdAt)}</div>
        </div>

        <SafePanel title="Details">
          <OrderDetailPanel order={row} />
        </SafePanel>

        <SafePanel title="Activity">
          <ActivityLog orderId={id} />
        </SafePanel>
      </div>

      {/* Right column */}
      <div className="col-span-12 lg:col-span-4 space-y-3">
        <div className="flex items-center justify-between rounded border bg-white p-3">
          <div className="font-medium">Admin</div>
          <OrderOpenFullLink orderId={id} />
        </div>

        <SafePanel title="Admin info">
          <OrderAdminInfoPanel order={row} />
        </SafePanel>

        <SafePanel title="Dates">
          <OrderDatesPanel order={row} />
        </SafePanel>

        <SafePanel title="Quick actions">
          <OrderSidebarPanel order={row} orderId={id} onRefresh={onRefresh} />
        </SafePanel>
      </div>
    </div>
  );
}


























