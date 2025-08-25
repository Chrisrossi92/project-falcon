import React, { useEffect, useState } from "react";
import OrderDetailPanel from "./OrderDetailPanel";
import OrderSidebarPanel from "./OrderSidebarPanel";
import { useSession } from "@/lib/hooks/useSession";
import { fetchOrderById } from "@/lib/services/ordersService";

export default function OrderDrawerContent({ data, onClose }) {
  const { user } = useSession();
  const isAdmin = user?.role === "admin";

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const full = await fetchOrderById(data.id);
        if (!mounted) return;
        setOrder(full);
      } catch (e) {
        console.error("Failed to fetch full order:", e?.message);
        if (!mounted) return;
        // best-effort fallback with minimal fields
        setOrder({
          ...data,
          client_name: data.client?.name || data.manual_client || "—",
          appraiser_name: data.appraiser?.display_name || data.manual_appraiser || "—",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
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
          onClick={onClose || (() => undefined)}
          className="text-sm text-blue-600 hover:underline"
        >
          Close
        </button>
      </div>
    </div>
  );
}










