// src/pages/ReviewerDashboard.jsx
import React, { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useSession } from "@/lib/hooks/useSession";
import OrdersTable from "@/features/orders/OrdersTable";
import ReviewActions from "@/components/orders/ReviewActions";
import AssignAppraiser from "@/components/orders/AssignAppraiser";
import AppraiserFilterBar from "@/components/ui/AppraiserFilterBar";

export default function ReviewerDashboard() {
  const { isAdmin } = useSession();
  const [params, setParams] = useSearchParams();

  const appraiserId = params.get("appraiser") || "";

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
        <h1 className="text-xl font-semibold">Reviewer Dashboard</h1>
        <div className="text-xs text-gray-500">
          Showing: In Review / Revisions / Ready to Send
        </div>
      </header>

      <AppraiserFilterBar value={appraiserId} onChange={setAppraiser} />

      <section className="w-full bg-white rounded-2xl shadow p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Review Queue</h2>
        </div>

        <OrdersTable
          status="__REVIEW__"
          appraiserId={appraiserId || null}
          renderActions={(order) => (
            <div className="flex items-center gap-2">
              {isAdmin ? <AssignAppraiser order={order} /> : null}
              <ReviewActions order={order} />
            </div>
          )}
        />
      </section>
    </div>
  );
}








