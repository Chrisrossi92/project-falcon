import React from "react";
import { useSession } from "@/lib/hooks/useSession";
import AdminCalendar from "@/components/admin/AdminCalendar";
import OrdersListAll from "@/components/orders/OrdersListAll";
import MyOrdersCard from "@/components/orders/MyOrdersCard";

export default function Dashboard() {
  const { isAdmin } = useSession();

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {isAdmin ? (
        <>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <AdminCalendar />
          <OrdersListAll />
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <MyOrdersCard />
        </>
      )}
    </div>
  );
}

