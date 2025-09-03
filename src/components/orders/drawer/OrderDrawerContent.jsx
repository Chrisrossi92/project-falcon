// src/components/orders/drawer/OrderDrawerContent.jsx
import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { useRole } from "@/lib/hooks/useRole";

// Admin detail (full) + shared panels
import OrderDetailPanel from "@/components/orders/view/OrderDetailPanel";
import OrderSidebarPanel from "@/components/orders/view/OrderSidebarPanel";

// Appraiser/Reviewer compact panels
import AppraiserDrawerSummary from "@/components/orders/view/AppraiserDrawerSummary";
import QuickActionsDrawerPanel from "@/components/orders/view/QuickActionsDrawerPanel";

/**
 * Role-aware drawer content
 *
 * - Admin:       Full details (left) + Activity (right)
 * - Appraiser / Reviewer:  Map + Quick actions (top, split)  and  Activity (bottom full-width)
 *
 * Props:
 *  - orderId:   uuid (required if `order` is not provided)
 *  - order:     thin order row (optional; used for fast first paint)
 *  - compact:   boolean (admin layout only; default true -> 2/3 + 1/3 columns)
 *  - onRefresh: optional callback after actions/notes to let parent refresh
 */
export default function OrderDrawerContent({
  orderId,
  order: row,
  compact = true,
  onRefresh,
}) {
  const { isAdmin } = useRole() || {};
  const [order, setOrder] = useState(row || null);
  const [loading, setLoading] = useState(!row);
  const [err, setErr] = useState(null);

  // Load from v_orders_frontend only when we don't have a row yet
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!orderId || row) return; // already have enough to render
      try {
        setLoading(true);
        setErr(null);
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
    return () => {
      cancel = true;
    };
  }, [orderId, row]);

  if (loading) {
    return (
      <div className="p-3 text-sm text-muted-foreground">
        Loading order details…
      </div>
    );
  }

  if (err || !order) {
    return (
      <div className="p-3 text-sm text-red-600">
        {err || "Order not found"}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────
  // Admin layout: Full details + Activity side-by-side
  // ───────────────────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <div className={`grid gap-3 ${compact ? "grid-cols-3" : "grid-cols-2"}`}>
        <div className={compact ? "col-span-2" : "col-span-1"}>
          <OrderDetailPanel order={order} isAdmin />
        </div>
        <div className="col-span-1">
          <OrderSidebarPanel
            order={order}
            orderId={order.id}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────
  // Appraiser / Reviewer layout:
  //   Top row:  Map (left, 2/3)  |  Quick actions (right, 1/3)
  //   Bottom:   Activity full width
  // ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Top row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <AppraiserDrawerSummary order={order} />
        </div>
        <div className="col-span-1">
          <QuickActionsDrawerPanel
            orderId={order.id}
            onAfterChange={() => {
              // Let the activity panel refresh & parent react if needed
              onRefresh?.();
            }}
          />
        </div>
      </div>

      {/* Bottom row: activity full width */}
      <div>
        <OrderSidebarPanel
          order={order}
          orderId={order.id}
          onRefresh={onRefresh}
        />
      </div>
    </div>
  );
}















