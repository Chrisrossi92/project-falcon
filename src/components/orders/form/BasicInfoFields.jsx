// src/components/orders/BasicInfoFields.jsx
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AddressAutocomplete from "@/components/inputs/AddressAutocomplete";
import OrderNumberField from "@/components/inputs/OrderNumberField";
import { loadGooglePlaces } from "@/lib/hooks/useGooglePlaces";

export default function BasicInfoFields({
  order = {},
  statuses = ["New", "In Progress", "Review", "Final", "Delivered"],
  onChange,
  onChangeSelect, // from parent; falls back to onChange if not provided
  onBulkChange,
}) {
  const o = order || {};
  const handle = (e) => onChange?.(e);
  const handleSelect = onChangeSelect || onChange;

  const [manualMode, setManualMode] = useState(false);
  const [pinning, setPinning] = useState(false);

  const handleResolved = (addr) => {
    onBulkChange?.({
      property_address: addr.property_address || o.property_address || "",
      city: addr.city || o.city || "",
      state: (addr.state || o.state || "").toUpperCase(),
      postal_code: addr.postal_code || o.postal_code || "",
      location: addr.location || null,
    });
  };

  const onOrderNoGenerated = (suggestion) =>
    onBulkChange?.({ order_number: suggestion });

  const pinFromTyped = async () => {
    // Geocode whatever is typed (works in manual mode too)
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) return;
    setPinning(true);
    try {
      const google = await loadGooglePlaces(key);
      const geocoder = new google.maps.Geocoder();
      const address = [o.property_address, o.city, o.state, o.postal_code]
        .filter(Boolean)
        .join(", ");

      geocoder.geocode({ address, componentRestrictions: { country: "US" } }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const g = results[0].geometry;
          const location = g?.location ? { lat: g.location.lat(), lng: g.location.lng() } : null;
          onBulkChange?.({ location });
        } else {
          onBulkChange?.({ location: null });
        }
        setPinning(false);
      });
    } catch {
      setPinning(false);
    }
  };

  return (
    <div className="grid gap-5">
      {/* Header row: Order # + Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <OrderNumberField
          value={o?.order_number ?? ""}
          onChange={handle}
          onGenerated={onOrderNoGenerated}
        />

        <div>
          <label className="block text-xs font-medium text-gray-500">Status</label>
          <select
            name="status"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={o?.status || "New"}
            onChange={handleSelect}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Address row with controls */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs font-medium text-gray-500">Property Address</label>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setManualMode((v) => !v)}>
              {manualMode ? "Autocomplete: Off" : "Autocomplete: On"}
            </Button>
            <Button type="button" variant="outline" onClick={pinFromTyped} disabled={pinning}>
              {pinning ? "Pinning…" : "Pin"}
            </Button>
          </div>
        </div>
        <AddressAutocomplete
          value={o?.property_address ?? ""}
          onChange={handle}
          onResolved={handleResolved}
          disabledAutocomplete={manualMode}
          placeholder="123 Main St…"
        />
      </div>

      {/* City/State/ZIP */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500">City</label>
          <Input
            name="city"
            value={o?.city ?? ""}
            onChange={handle}
            autoComplete="address-level2"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">State</label>
          <Input
            name="state"
            value={(o?.state ?? "").toUpperCase()}
            onChange={(e) => {
              const v = (e.target.value || "").toUpperCase();
              onChange?.({ target: { name: "state", value: v } });
            }}
            maxLength={2}
            autoComplete="address-level1"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">ZIP</label>
          <Input
            name="postal_code"
            value={o?.postal_code ?? ""}
            onChange={handle}
            autoComplete="postal-code"
          />
        </div>
      </div>
    </div>
  );
}




