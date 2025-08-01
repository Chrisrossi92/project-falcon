import React, { useEffect, useState } from "react";
import OrderDetailPanel from "./OrderDetailPanel";
import OrderSidebarPanel from "./OrderSidebarPanel";
import { useSession } from "@/lib/hooks/useSession";
import supabase from "@/lib/supabaseClient";

export default function OrderDrawerContent({ data, onClose }) {
  const { user } = useSession();
  const isAdmin = user?.role === "admin";

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchOrder = async () => {
      setLoading(true);

      const { data: fullOrder, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          client:client_id ( name ),
          appraiser:appraiser_id ( name )
        `
        )
        .eq("id", data.id)
        .single();

      if (!mounted) return;

      if (error) {
        console.error("Failed to fetch full order:", error.message);
        setOrder({
          ...data,
          client_name: data.client?.name || data.manual_client || "—",
          appraiser_name: data.appraiser?.name || data.manual_appraiser || "—",
        });
      } else {
        setOrder({
          ...fullOrder,
          client_name: fullOrder.client?.name || fullOrder.manual_client || "—",
          appraiser_name: fullOrder.appraiser?.name || fullOrder.manual_appraiser || "—",
        });
      }

      setLoading(false);
    };

    fetchOrder();

    return () => {
      mounted = false;
    };
  }, [data.id]);

  if (loading || !order) {
    return <div className="text-sm text-gray-500 p-4">Loading order details…</div>;
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6 bg-white rounded-xl shadow-md">
      <div className="grid grid-cols-[1fr_320px] gap-6">
        <OrderDetailPanel order={order} isAdmin={isAdmin} />
        <OrderSidebarPanel order={order} />
      </div>
      <div className="flex justify-end pt-4">
        <button
          onClick={onClose || (() => setOrder(null))}
          className="text-sm text-blue-600 hover:underline"
        >
          Close
        </button>
      </div>
    </div>
  );
}









