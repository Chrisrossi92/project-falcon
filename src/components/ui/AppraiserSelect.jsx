// src/components/ui/AppraiserSelect.jsx
import React, { useEffect, useState } from "react";
import { listAppraisers } from "@/lib/services/userService";

/**
 * Props:
 *  - value?: string | null
 *  - onChange: (id: string|null) => void
 *  - placeholder?: string
 *  - includeEmpty?: boolean (default true)
 */
export default function AppraiserSelect({
  value = "",
  onChange,
  placeholder = "Select appraiser…",
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
        const data = await listAppraisers({ includeInactive: false });
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
        {includeEmpty && <option value="">{loading ? "Loading…" : placeholder}</option>}
        {rows.map((u) => (
          <option key={u.id} value={u.id}>
            {u.display_name || u.name || u.email || "Unnamed"}
          </option>
        ))}
      </select>
      {err ? <div className="text-xs text-red-600 mt-1">Failed to load appraisers: {err}</div> : null}
    </div>
  );
}

