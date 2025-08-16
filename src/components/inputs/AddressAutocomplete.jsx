// src/components/inputs/AddressAutocomplete.jsx
import React, { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { loadGooglePlaces } from "@/lib/hooks/useGooglePlaces";

function parseAddress(place) {
  const comps = place.address_components || [];
  const find = (type) => comps.find((c) => c.types.includes(type))?.long_name || "";
  const streetNumber = find("street_number");
  const route = find("route");
  const city = find("locality") || find("sublocality") || find("postal_town");
  const state = comps.find((c) => c.types.includes("administrative_area_level_1"))?.short_name || "";
  const zip = find("postal_code");
  const zip4 = comps.find((c) => c.types.includes("postal_code_suffix"))?.long_name || "";

  return {
    property_address: [streetNumber, route].filter(Boolean).join(" "),
    city,
    state,
    postal_code: zip4 ? `${zip}-${zip4}` : zip,
    formatted: place.formatted_address || "",
    location: place.geometry?.location
      ? { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
      : null,
  };
}

/**
 * Props:
 * - value, onChange
 * - onResolved: called with parsed address + {location}
 * - disabledAutocomplete: boolean (manual mode)
 * - placeholder
 */
export default function AddressAutocomplete({
  value,
  onChange,
  onResolved,
  disabledAutocomplete = false,
  placeholder = "Start typing address…",
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (disabledAutocomplete) return; // manual mode
    let ac;
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) return;

    loadGooglePlaces(key).then((google) => {
      if (!inputRef.current) return;
      ac = new google.maps.places.Autocomplete(inputRef.current, {
        fields: ["address_components", "formatted_address", "geometry"],
        types: ["address"],
        componentRestrictions: { country: ["us"] },
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const parsed = parseAddress(place);
        onResolved?.(parsed);
      });
    });
    return () => void 0;
  }, [disabledAutocomplete, onResolved]);

  return (
    <Input
      ref={inputRef}
      name="property_address"
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete="street-address"
    />
  );
}

