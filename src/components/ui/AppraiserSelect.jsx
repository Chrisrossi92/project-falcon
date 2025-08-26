// src/components/ui/AppraiserSelect.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchAppraisersList } from "@/lib/services/usersService";

export default function AppraiserSelect({ value, onChange, placeholder = "Search appraisers…" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const debounceRef = useRef();

  const selected = useMemo(() => rows.find((r) => r.id === value) || null, [rows, value]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true); setErr(null);
        const list = await fetchAppraisersList({ search: query, limit: 20 });
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

  function pick(u) {
    onChange?.(u?.id || "");
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
            title="Clear selected appraiser"
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* Selected hint */}
      <div className="mt-1 text-xs text-gray-600">
        {value ? `Selected: ${selected?.display_name || selected?.name || value}` : "No appraiser selected"}
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
              {rows.map((u) => (
                <li
                  key={u.id}
                  className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                  onClick={() => pick(u)}
                >
                  <div className="font-medium">{u.display_name || u.name || "—"}</div>
                  <div className="text-xs text-gray-500">{u.email || "—"}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
