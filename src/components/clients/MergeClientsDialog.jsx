import React, { useEffect, useMemo, useState } from "react";
import { searchClientsByName, mergeClients } from "@/lib/services/clientsService";
import toast from "react-hot-toast";

export default function MergeClientsDialog({ open, onClose, sourceClient }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setTerm("");
      setResults([]);
      setSelectedId(null);
    }
  }, [open]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!open) return;
      if ((term || "").trim().length < 2) { setResults([]); return; }
      try {
        const rows = await searchClientsByName(term, { excludeId: sourceClient?.id });
        if (active) setResults(rows);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { active = false; };
  }, [open, term, sourceClient?.id]);

  const disabled = useMemo(() => !selectedId || submitting, [selectedId, submitting]);

  async function handleMerge() {
    if (!selectedId) return;
    try {
      setSubmitting(true);
      // Conservative strategy: fill missing fields from source; do not overwrite name/category
      await mergeClients(sourceClient.id, selectedId, {
        fill_missing_from_source: true,
        prefer_source_fields: "" // comma list if you want to overwrite certain fields
      });
      toast.success("Clients merged");
      onClose({ mergedIntoId: selectedId });
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Merge failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-xl bg-white p-4 shadow-lg">
        <div className="mb-3">
          <h3 className="text-sm font-semibold">Merge “{sourceClient?.name}” into…</h3>
          <p className="text-xs text-gray-500">
            Pick the <span className="font-medium">target</span> client to keep. All orders will be moved there.
          </p>
        </div>

        <input
          className="mb-2 w-full rounded border px-3 py-2 text-sm"
          placeholder="Search clients by name…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          autoFocus
        />

        <div className="max-h-60 overflow-auto rounded border">
          {results.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">Type at least 2 characters…</div>
          ) : results.map((r) => (
            <label key={r.id} className="flex cursor-pointer items-center gap-2 border-b p-2 text-sm hover:bg-gray-50">
              <input
                type="radio"
                name="merge-target"
                value={r.id}
                checked={selectedId === r.id}
                onChange={() => setSelectedId(r.id)}
              />
              <div className="flex-1">
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-gray-500">
                  {(r.category || "client").toUpperCase()} • {r.status || "active"}
                  {r.is_merged ? " • MERGED" : ""}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button className="rounded border px-3 py-1.5 text-sm" onClick={() => onClose(null)} disabled={submitting}>
            Cancel
          </button>
          <button
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={handleMerge}
            disabled={disabled}
          >
            {submitting ? "Merging…" : "Merge"}
          </button>
        </div>
      </div>
    </div>
  );
}
