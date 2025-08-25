// src/components/ActiveOrdersList.jsx
import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const ActiveOrdersList = ({ orders = [], selectedOrderId = null }) => {
  const navigate = useNavigate();

  // Consider non-complete as "active"
  const activeOrders =
    orders?.filter((o) => (o.status || "").toLowerCase() !== "complete") || [];

  const orderRefs = useRef({});
  const lastHighlightedRef = useRef(null);

  useEffect(() => {
    if (selectedOrderId && orderRefs.current[selectedOrderId]) {
      const newEl = orderRefs.current[selectedOrderId];

      if (lastHighlightedRef.current && lastHighlightedRef.current !== newEl) {
        lastHighlightedRef.current.classList.remove("ring-4", "ring-blue-400");
      }

      newEl.scrollIntoView({ behavior: "smooth", block: "center" });
      newEl.classList.add("ring-4", "ring-blue-400");
      lastHighlightedRef.current = newEl;

      const timeout = setTimeout(() => {
        newEl.classList.remove("ring-4", "ring-blue-400");
        if (lastHighlightedRef.current === newEl) lastHighlightedRef.current = null;
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [selectedOrderId]);

  return (
    <div>
      {activeOrders.length === 0 ? (
        <p className="text-gray-400 italic">No active orders.</p>
      ) : (
        activeOrders.map((order) => (
          <div
            key={order.id}
            ref={(el) => (orderRefs.current[order.id] = el)}
            onClick={() => navigate(`/orders/${order.id}`)}
            className="border p-4 rounded-xl mb-3 bg-gray-50 hover:bg-blue-50 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <p className="font-semibold text-gray-800 text-lg">
              {order.property_address || order.address || "—"}
            </p>
            <p className="text-sm text-gray-500">
              Due:{" "}
              {order.final_due_at
                ? new Date(order.final_due_at).toLocaleString()
                : "—"}
            </p>
          </div>
        ))
      )}
    </div>
  );
};

export default ActiveOrdersList;
