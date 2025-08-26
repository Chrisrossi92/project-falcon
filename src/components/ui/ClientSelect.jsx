// src/components/ui/ClientSelect.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchClientsList } from "@/lib/services/clientsService";

export default function ClientSelect({ value, onChange, placeholder = "Search clients…" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const debounceRef = useRef();

  const selected = useMemo(() => rows.find(r => r.id === value) || null, [rows, value]);

  useEffect(() => {
    // Debounced fetch on query change
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true); setErr(null);
        const list = await fetchClientsList({ search: query, limit: 20 });
        setRows(list);
      } catch (e) {
        setErr(e?.message || String(e));
        setRows([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function pick(c) {
    onChange?.(c?.id || "");
    setOpen(false);
  }
  function clearSel() {
    onChange?.("");
    setOpen(false);
  }

  return (
    <div className="relative">
      {/* Control */}
      <div className="flex gap-2">
        <input
          className="w-full border rounded px-2 py-1 text-sm"
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        <button
          type="button"
          className="px-2 py-1 border rounded text-sm hover:bg-gray-50"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "▲" : "▼"}
        </button>
        {value ? (
          <button
            type="button"
            className="px-2 py-1 border rounded text-sm hover:bg-gray-50"
            onClick={clearSel}
            title="Clear selected client"
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* Selected hint */}
      <div className="mt-1 text-xs text-gray-600">
        {value
          ? `Selected: ${selected?.name || value}`
          : "No client selected"}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow">
          {loading ? (
            <div className="p-2 text-sm text-gray-600">Loading…</div>
          ) : err ? (
            <div className="p-2 text-sm text-red-600">Failed: {err}</div>
          ) : rows.length === 0 ? (
            <div className="p-2 text-sm text-gray-600">No results</div>
          ) : (
            <ul className="max-h-64 overflow-auto">
              {rows.map((c) => (
                <li
                  key={c.id}
                  className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                  onClick={() => pick(c)}
                >
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500">
                    {c.email || "—"} {c.phone ? `• ${c.phone}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
