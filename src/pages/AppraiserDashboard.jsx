// src/pages/AppraiserDashboard.jsx
import React, { useMemo } from "react";
import { useOrders } from "@/lib/hooks/useOrders";
import { useSession } from "@/lib/hooks/useSession";
import OrdersTable from "@/components/orders/OrdersTable";

export default function AppraiserDashboard() {
  const ordersHook = useOrders() || {};
  const { data: rawData, loading, error, refetch } = ordersHook;

  const orders = Array.isArray(rawData) ? rawData : [];

  const { user } = useSession();
  const uid = user?.id ?? null;

  // my appraisal assignments OR review tasks assigned to me
  const myOrders = useMemo(() => {
    if (!uid) return orders;
    return orders.filter((o) => {
      const isAppraiser = o && o.appraiser_id === uid;
      const isMyReviewTask = o && o.current_reviewer_id === uid;
      return isAppraiser || isMyReviewTask;
    });
  }, [orders, uid]);

  if (error) {
    return (
      <div className="p-6 text-red-600">
        <h2 className="font-semibold">Error loading your orders</h2>
        <pre className="text-sm">{error.message}</pre>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 flex flex-col gap-6">
      <section className="w-full bg-white rounded-2xl shadow p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Work</h2>
          <div className="text-xs text-gray-500">
            Appraisal jobs + any review tasks assigned to you
          </div>
        </div>
        <OrdersTable orders={myOrders} loading={loading} onRefresh={refetch} />
      </section>
    </div>
  );
}

















