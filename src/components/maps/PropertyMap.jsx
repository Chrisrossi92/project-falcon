// src/components/maps/PropertyMap.jsx
import React, { useEffect, useRef } from "react";
import { loadGooglePlaces } from "@/lib/hooks/useGooglePlaces";

export default function PropertyMap({ location, height = 220 }) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (!location?.lat || !location?.lng) return;
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) return;

    let map;
    loadGooglePlaces(key).then((google) => {
      if (!mapRef.current) return;
      map = new google.maps.Map(mapRef.current, {
        center: { lat: location.lat, lng: location.lng },
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      new google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map,
      });
    });
  }, [location?.lat, location?.lng]);

  if (!location?.lat || !location?.lng) return null;
  return <div ref={mapRef} style={{ width: "100%", height }} className="rounded-lg border" />;
}
