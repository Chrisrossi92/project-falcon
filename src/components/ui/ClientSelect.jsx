// src/components/ui/ClientSelect.jsx
import React, { useEffect, useState } from "react";
import { listClients } from "@/lib/services/clientsService";

export default function ClientSelect({
  value = "",
  onChange,
  placeholder = "Select client…",
  includeEmpty = true,
  disabled = false,
  className = "",
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true); setErr(null);
        const data = await listClients({ includeInactive: false });
        if (!mounted) return;
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!mounted) return;
        setErr(e?.message || String(e));
        setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className={className}>
      <select
        className="w-full border rounded-md px-2 py-1 text-sm"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value || null)}
        disabled={disabled || loading || !!err}
      >
        {includeEmpty && (
          <option value="">{loading ? "Loading…" : placeholder}</option>
        )}
        {rows.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {err ? (
        <div className="text-xs text-red-600 mt-1">
          Failed to load clients: {err}
        </div>
      ) : null}
    </div>
  );
}

