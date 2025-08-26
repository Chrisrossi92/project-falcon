// src/pages/Orders.jsx
import React, { useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import OrdersTable from "@/features/orders/OrdersTable";
import AppraiserFilterBar from "@/components/ui/AppraiserFilterBar";

export default function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const status = params.get("review") ? "__REVIEW__" : null;
  const appraiserId = params.get("appraiser") || "";
  const clientId = params.get("client") || null;

  const setAppraiser = useCallback(
    (id) => {
      const next = new URLSearchParams(params);
      if (id) next.set("appraiser", id);
      else next.delete("appraiser");
      setParams(next, { replace: false });
    },
    [params, setParams]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Orders</h1>
        <div className="text-xs text-gray-500">
          {status === "__REVIEW__" ? "Review queue" : "All orders"}
        </div>
      </header>

      <AppraiserFilterBar value={appraiserId} onChange={setAppraiser} />

      <section className="w-full bg-white rounded-2xl shadow p-4">
        <OrdersTable
          status={status}
          appraiserId={appraiserId || null}
          clientId={clientId}
          onRowClick={(o) => navigate(`/orders/${o.id}`)}
        />
      </section>
    </div>
  );
}
























