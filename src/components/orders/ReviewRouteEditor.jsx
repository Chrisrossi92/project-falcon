// src/components/orders/ReviewRouteEditor.jsx
import React, { useEffect, useMemo, useState } from "react";
import AppraiserSelect from "@/components/ui/AppraiserSelect";
import { setReviewRoute, assignNextReviewer } from "@/lib/services/ordersService";

/**
 * Props:
 *  - orderId: string (required)
 *  - initialRoute: { steps: Array<{ reviewer_id: string }> } | null
 *  - currentReviewerId?: string | null
 *  - onSaved?: () => void
 */
export default function ReviewRouteEditor({ orderId, initialRoute, currentReviewerId = null, onSaved }) {
  const [steps, setSteps] = useState(() =>
    Array.isArray(initialRoute?.steps) ? initialRoute.steps.map(s => ({ reviewer_id: s.reviewer_id || "" })) : []
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    // Sync if the order reloads
    setSteps(Array.isArray(initialRoute?.steps) ? initialRoute.steps.map(s => ({ reviewer_id: s.reviewer_id || "" })) : []);
  }, [initialRoute?.steps]);

  const cleanSteps = useMemo(
    () => steps.filter(s => s.reviewer_id && String(s.reviewer_id).trim().length > 0),
    [steps]
  );
  const canSave = cleanSteps.length > 0 && !busy;

  function setReviewer(idx, id) {
    setSteps(prev => prev.map((s, i) => (i === idx ? { reviewer_id: id } : s)));
  }
  function addStep() {
    setSteps(prev => [...prev, { reviewer_id: "" }]);
  }
  function removeStep(idx) {
    setSteps(prev => prev.filter((_, i) => i !== idx));
  }
  function move(idx, dir) {
    setSteps(prev => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      const tmp = next[idx];
      next[idx] = next[j];
      next[j] = tmp;
      return next;
    });
  }

  async function saveRoute() {
    try {
      setBusy(true); setErr(null);
      await setReviewRoute(orderId, { steps: cleanSteps });
      onSaved?.();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function assignFirst() {
    try {
      setBusy(true); setErr(null);
      await assignNextReviewer(orderId); // lets RPC (or fallback) pick the first
      onSaved?.();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Review Route</h2>
        <div className="text-xs text-gray-500">Define the reviewer sequence</div>
      </div>

      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="text-sm w-8 text-gray-500">{i + 1}.</div>
            <div className="min-w-[260px] flex-1">
              <AppraiserSelect value={s.reviewer_id} onChange={(id) => setReviewer(i, id)} />
            </div>
            <div className="flex items-center gap-1">
              <button type="button" className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
                onClick={() => move(i, -1)} title="Move up">↑</button>
              <button type="button" className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
                onClick={() => move(i, +1)} title="Move down">↓</button>
              <button type="button" className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
                onClick={() => removeStep(i)} title="Remove">✕</button>
            </div>
          </div>
        ))}
        <div>
          <button type="button" className="px-2 py-1 border rounded text-xs hover:bg-gray-50" onClick={addStep}>
            + Add reviewer
          </button>
        </div>
      </div>

      {err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          onClick={saveRoute}
          disabled={!canSave}
        >
          Save route
        </button>

        <button
          type="button"
          className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          onClick={assignFirst}
          disabled={busy || cleanSteps.length === 0 || !!currentReviewerId}
          title={currentReviewerId ? "Current reviewer already assigned" : "Assign first reviewer"}
        >
          Assign first reviewer
        </button>
      </div>
    </div>
  );
}
