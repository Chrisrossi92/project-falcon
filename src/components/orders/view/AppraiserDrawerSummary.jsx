import React from "react";
import MapContainer from "@/components/maps/MapContainer";

export default function AppraiserDrawerSummary({ order, height = 280 }) {
  if (!order) return null;

  const address = [
    order.property_address || order.address || "",
    order.city || "",
    order.state || "",
    order.postal_code || order.zip || "",
  ]
    .filter(Boolean)
    .join(", ");

  if (!address) return null;

  return (
    <div className="rounded-xl overflow-hidden border bg-white">
      <div className="px-3 py-2 text-xs text-gray-500 border-b">
        Location
      </div>
      <div style={{ height }} className="w-full">
        <MapContainer address={address} />
      </div>
    </div>
  );
}

