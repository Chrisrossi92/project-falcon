// src/components/maps/GoogleMapEmbed.jsx
import React from "react";

export default function GoogleMapEmbed({
  addressLine1,
  address_line1,
  address,
  street_address,
  city,
  state,
  zip,
  postal_code,
  height = 260,
  zoom = 13,
}) {
  const line1 = addressLine1 || address_line1 || address || street_address || null;
  const zipVal = zip || postal_code || null;
  const parts = [line1, city, state, zipVal].filter(Boolean);
  const addressStr = parts.join(", ");

  if (!addressStr) {
    return (
      <div className="text-xs text-gray-500 p-3 text-center border rounded-lg bg-gray-50">
        No address available.
      </div>
    );
  }

  const encoded = encodeURIComponent(addressStr);
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_KEY;

  if (import.meta?.env?.DEV) {
    console.debug("[GoogleMapEmbed] key present:", Boolean(apiKey));
  }

  if (!apiKey) {
    return (
      <div className="text-xs text-gray-700 p-3 border rounded-lg bg-gray-50 space-y-2">
        <div>Google Maps embed requires an API key.</div>
        <a className="text-indigo-600 hover:underline text-sm" href={mapsLink} target="_blank" rel="noreferrer">
          Open in Google Maps
        </a>
      </div>
    );
  }

  const mapSrc = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encoded}&zoom=${zoom}`;

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div style={{ height }} className="w-full">
        <iframe
          title="Property Location Map"
          src={mapSrc}
          className="w-full h-full"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div className="px-3 py-2 text-xs">
        <a className="text-indigo-600 hover:underline" href={mapsLink} target="_blank" rel="noreferrer">
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}
