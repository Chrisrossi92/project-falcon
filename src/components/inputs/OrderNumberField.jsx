import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { isOrderNumberAvailableV2 } from "@/lib/services/ordersService";

export default function OrderNumberField({ value, onChange, orderId = null }) {
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const debounceRef = useRef();

  useEffect(() => {
    const orderNumber = String(value || "").trim();
    setAvailable(null);
    if (!orderNumber) return;
    clearTimeout(debounceRef.current);
    let cancelled = false;
    debounceRef.current = setTimeout(async () => {
      setChecking(true);
      try {
        const nextAvailable = await isOrderNumberAvailableV2(orderNumber, { orderId });
        if (!cancelled) setAvailable(nextAvailable);
      } catch (error) {
        console.error("Failed to check order number availability", error);
        if (!cancelled) setAvailable(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(debounceRef.current);
    };
  }, [orderId, value]);

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500">Order #</label>
      <Input name="order_number" value={value ?? ""} onChange={onChange} placeholder="YYYYNNN" />
      <div className="mt-1 text-xs">
        {checking && <span className="text-gray-500">Checking…</span>}
        {!checking && available === true && <span className="text-green-600">Available</span>}
        {!checking && available === false && <span className="text-red-600">Already used</span>}
      </div>
    </div>
  );
}
