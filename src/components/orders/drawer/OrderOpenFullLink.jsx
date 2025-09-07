import React from "react";
import { Link } from "react-router-dom";

export default function OrderOpenFullLink({ orderId, className = "" }) {
  if (!orderId) return null;
  return (
    <div className={`w-full flex justify-end ${className}`}>
      <Link
        to={`/orders/${orderId}`}
        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        title="Open full order details"
      >
        Open full order ↗
      </Link>
    </div>
  );
}

