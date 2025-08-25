import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import supabase from "@/lib/supabaseClient";
import { setReviewRoute, assignNextReviewer } from "@/lib/services/ordersService";
import { useSession } from "@/lib/hooks/useSession";

/**
 * Admin/Mike-only modal to define the review route (sequential) and assign the first reviewer.
 * Props:
 *  - open, onOpenChange
 *  - orderId (required)
 *  - initial (optional): preselected reviewers [{ reviewer_id, name, position, required }]
 */
export default function ReviewersModal({ open, onOpenChange, orderId, initial = [] }) {
  const { user } = useSession();
  const role = String(user?.role || "").toLowerCase();
  const canEdit = role === "admin" || role === "owner" || role === "manager" || user?.email?.toLowerCase()?.includes("mike"); // Mike/Owner/Admin only

  const [allReviewers, setAllReviewers] = useState([]);
  const [selected, setSelected] = useState(initial);

  useEffect(() => setSelected(initial), [initial]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, display_name, role")
        .in("role", ["reviewer", "admin", "owner", "manager"])
        .order("name");
      if (!error) setAllReviewers(data || []);
    })();
  }, [open]);

  const toggle = (u) => {
    setSelected((s) => {
      const exists = s.find((r) => r.reviewer_id === u.id);
      if (exists) return s.filter((r) => r.reviewer_id !== u.id).map((r, i) => ({ ...r, position: i + 1 }));
      const name = u.display_name || u.name;
      return [...s, { reviewer_id: u.id, name, position: s.length + 1, required: true }];
    });
  };

  const setRequired = (id, val) => setSelected((s) => s.map((r) => (r.reviewer_id === id ? { ...r, required: val } : r)));
  const move = (id, dir) =>
    setSelected((s) => {
      const idx = s.findIndex((r) => r.reviewer_id === id);
      if (idx < 0) return s;
      const j = dir === "up" ? idx - 1 : idx + 1;
      if (j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next.map((r, i) => ({ ...r, position: i + 1 }));
    });

  async function saveRoute() {
    if (!canEdit || !orderId) return;
    const steps = [...selected].sort((a, b) => (a.position || 0) - (b.position || 0)).map((r, i) => ({
      reviewer_id: r.reviewer_id,
      position: i + 1,
      required: r.required !== false,
      fallback_ids: r.fallback_ids || [], // optional future field
    }));
    const route = { policy: "sequential", steps, template: "Custom" };
    await setReviewRoute(orderId, route);
    await assignNextReviewer(orderId); // assign the first step
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Set Review Route</DialogTitle>
        </DialogHeader>

        {!canEdit ? (
          <div className="text-sm text-gray-600">Only Admin/Mike can modify the review route.</div>
        ) : (
          <>
            <div className="max-h-[50vh] space-y-2 overflow-auto">
              {allReviewers.map((u) => {
                const name = u.display_name || u.name || u.email || "User";
                const sel = selected.find((r) => r.reviewer_id === u.id);
                return (
                  <div key={u.id} className="flex items-center justify-between rounded border p-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={!!sel} onChange={() => toggle(u)} />
                      <span>{name}</span>
                      <span className="text-xs text-gray-500">({u.role})</span>
                    </label>

                    {sel && (
                      <div className="flex items-center gap-2">
                        <button className="text-xs underline" onClick={() => move(u.id, "up")}>
                          Up
                        </button>
                        <button className="text-xs underline" onClick={() => move(u.id, "down")}>
                          Down
                        </button>
                        <label className="text-xs">
                          <input
                            className="mr-1"
                            type="checkbox"
                            checked={sel.required !== false}
                            onChange={(e) => setRequired(u.id, e.target.checked)}
                          />
                          required
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
              {!allReviewers.length && <div className="text-sm text-gray-500">No reviewers found.</div>}
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Tip: Default template is Pam → Mike. You can customize here and save per-order.
            </p>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await saveRoute();
              onOpenChange(false);
            }}
            disabled={!canEdit}
          >
            Save & Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



