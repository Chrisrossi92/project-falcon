// src/components/orders/FeeFields.jsx
import React, { useEffect, useRef } from "react";

export default function FeeFields({ value, onChange, disabled }) {
  const lastCalcRef = useRef(null);
  const base = Number(value.base_fee || 0);
  const pct  = Number(value.split_pct || 0);

  // auto-calc appraiser_fee when base or split change (if user hasn't manually overridden)
  useEffect(() => {
    const calc = Math.round(base * (pct / 100) * 100) / 100;
    if (value.appraiser_fee === "" || value.appraiser_fee === String(lastCalcRef.current)) {
      onChange({ ...value, appraiser_fee: String(calc) });
      lastCalcRef.current = calc;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, pct]);

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">Base Fee</label>
        <input
          type="number"
          name="base_fee"
          value={value.base_fee || ""}
          onChange={(e) => onChange({ ...value, base_fee: e.target.value })}
          disabled={disabled}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
          step="0.01"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Appraiser Split (%)</label>
        <input
          type="number"
          name="split_pct"
          value={value.split_pct || ""}
          onChange={(e) => onChange({ ...value, split_pct: e.target.value })}
          disabled={disabled}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
          step="0.1"
          min="0"
          max="100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Appraiser Fee</label>
        <input
          type="number"
          name="appraiser_fee"
          value={value.appraiser_fee || ""}
          onChange={(e) => onChange({ ...value, appraiser_fee: e.target.value })}
          disabled={disabled}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
          step="0.01"
          min="0"
        />
      </div>
    </>
  );
}
