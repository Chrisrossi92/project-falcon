// src/components/orders/OrderSidebarPanel.jsx
import React, { useState } from "react";
import MapContainer from "@/components/MapContainer";
import OrderActivityPanel from "./OrderActivityPanel";
import { useSession } from "@/lib/hooks/useSession";

export default function OrderSidebarPanel({ order }) {
  const [activeTab, setActiveTab] = useState("activity"); // "activity" or "map"
  const { user } = useSession();

  const tabs = [
    { key: "activity", label: "Activity" },
    { key: "map", label: "Map" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex space-x-2 mb-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-xs px-3 py-1 rounded-t-md ${
              activeTab === tab.key
                ? "bg-blue-100 text-blue-700 font-medium"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="flex-1 rounded-md border bg-white shadow-sm p-2 overflow-y-auto">
        {activeTab === "activity" && (
          <OrderActivityPanel orderId={order.id} currentUser={user} />
        )}
        {activeTab === "map" && (
          <MapContainer
            address={`${order.address || ""}, ${order.city || ""}, ${order.state || ""} ${order.zip || ""}`}
          />
        )}
      </div>
    </div>
  );
}



