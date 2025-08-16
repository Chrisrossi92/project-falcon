import React, { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import supabase from "@/lib/supabaseClient";

export default function ReviewersModal({ open, onOpenChange, value = [], onSave }) {
  const [allReviewers, setAllReviewers] = useState([]);
  const [selected, setSelected] = useState(value);

  useEffect(() => setSelected(value), [value]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      // roles that can review; adjust as needed
      const { data, error } = await supabase
        .from("users").select("id, name, role")
        .in("role", ["reviewer", "admin"])
        .order("name");
      if (!error) setAllReviewers(data || []);
    })();
  }, [open]);

  // Default Pam if none selected
  useEffect(() => {
    if (!open || selected?.length) return;
    const pam = allReviewers.find((u) => /^pam/i.test(u.name || ""));
    if (pam) setSelected([{ reviewer_id: pam.id, name: pam.name, position: 1, required: true }]);
  }, [open, allReviewers, selected]);

  const toggle = (u) => {
    setSelected((s) => {
      const exists = s.find((r) => r.reviewer_id === u.id);
      if (exists) return s.filter((r) => r.reviewer_id !== u.id).map((r, i) => ({ ...r, position: i + 1 }));
      return [...s, { reviewer_id: u.id, name: u.name, position: s.length + 1, required: true }];
    });
  };

  const setRequired = (id, val) =>
    setSelected((s) => s.map((r) => (r.reviewer_id === id ? { ...r, required: val } : r)));

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select reviewers</DialogTitle>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-2 overflow-auto">
          {allReviewers.map((u) => {
            const sel = selected.find((r) => r.reviewer_id === u.id);
            return (
              <div key={u.id} className="flex items-center justify-between rounded border p-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!sel}
                    onChange={() => toggle(u)}
                  />
                  <span>{u.name}</span>
                </label>

                {sel && (
                  <div className="flex items-center gap-2">
                    <button className="text-xs underline" onClick={() => move(u.id, "up")}>Up</button>
                    <button className="text-xs underline" onClick={() => move(u.id, "down")}>Down</button>
                    <label className="text-xs">
                      <input
                        className="mr-1"
                        type="checkbox"
                        checked={sel.required}
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              onSave?.(selected);
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


