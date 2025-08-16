import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import supabase from "@/lib/supabaseClient";

export default function OrderNumberField({ value, onChange }) {
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const debounceRef = useRef();

  useEffect(() => {
    setAvailable(null);
    if (!value) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setChecking(true);
      const { data, error } = await supabase
        .from("orders")
        .select("id")
        .eq("order_number", value)
        .limit(1);
      if (!error) setAvailable(!data?.length);
      setChecking(false);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

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

