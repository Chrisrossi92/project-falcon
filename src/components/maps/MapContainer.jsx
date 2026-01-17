// src/components/maps/MapContainer.jsx
// Legacy name kept for compatibility; now a thin wrapper around GoogleMapEmbed.
import React from "react";
import GoogleMapEmbed from "./GoogleMapEmbed";

export default function MapContainer(props) {
  return <GoogleMapEmbed {...props} />;
}
