import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { useRole } from "@/lib/hooks/useRole";

// Admin view
import OrderAdminInfoPanel from "@/components/orders/view/OrderAdminInfoPanel";
// correct path
import OrderActivity from "@/components/orders/view/OrderActivity";
import OrderOpenFullLink from "@/components/orders/drawer/OrderOpenFullLink";

// Appraiser/Reviewer summary (map)
import AppraiserDrawerSummary from "@/components/orders/view/AppraiserDrawerSummary";

export default function OrderDrawerContent({ orderId, order: row, compact = true, onRefresh }) {
  const { isAdmin } = useRole() || {};
  const [order, setOrder] = useState(row || null);
  const [loading, setLoading] = useState(!row);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!orderId || row) return;
      try {
        setLoading(true); setErr(null);
        const { data, error } = await supabase
          .from("v_orders_frontend")
          .select("*")
          .eq("id", orderId)
          .maybeSingle();
        if (error) throw error;
        if (!cancel) setOrder(data || null);
      } catch (e) {
        if (!cancel) setErr(e?.message || "Failed to load order");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [orderId, row]);

  if (loading) return <div className="p-3 text-sm text-muted-foreground">Loading order details…</div>;
  if (err || !order) return <div className="p-3 text-sm text-red-600">{err || "Order not found"}</div>;

  // ── ADMIN: Activity-first left, Admin info right ──
  if (isAdmin) {
    return (
      <div className={`grid gap-3 ${compact ? "grid-cols-3" : "grid-cols-2"}`}>
        <div className={compact ? "col-span-2" : "col-span-1"}>
          <div className="grid h-full grid-rows-[1fr_auto] gap-3">
            <div className="min-h-0 overflow-y-auto">
              <OrderActivity orderId={order.id} />
            </div>
          </div>
        </div>
        <div className="col-span-1 h-full">
          <OrderAdminInfoPanel order={order} />
        </div>
      </div>
    );
  }

  // ── APPRAISER / REVIEWER: actions moved to row → simple drawer ──
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <OrderOpenFullLink orderId={order.id} />
      </div>

      <AppraiserDrawerSummary order={order} height={300} />

      <div className="bg-white border rounded-xl p-3">
        <OrderActivity orderId={order.id} />
        </div>
    </div>
  );
}

























