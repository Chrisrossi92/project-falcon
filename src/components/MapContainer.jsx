// src/components/MapContainer.jsx

import React from "react";

export default function MapContainer({ address }) {
  if (!address || address.trim() === "") {
    return (
      <div className="text-xs text-gray-500 p-3 text-center border rounded-md bg-gray-50">
        No valid address to display on map.
      </div>
    );
  }

  const encodedAddress = encodeURIComponent(address);
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapSrc = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodedAddress}`;

  return (
    <iframe
      title="Property Location Map"
      src={mapSrc}
      className="w-full h-64 rounded-md border"
      allowFullScreen
      loading="lazy"
    ></iframe>
  );
}

