import React from "react";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";

export default function DashboardOrdersTable() {
  return (
    <div className="rounded-xl border bg-white">
      <UnifiedOrdersTable
        role="admin"
        pageSize={15}
        // Force non-complete orders on the dashboard
        filters={{
          activeOnly: true,
          page: 0,
          pageSize: 15,
          orderBy: "order_number",
          ascending: false,
        }}
      />
    </div>
  );
}







