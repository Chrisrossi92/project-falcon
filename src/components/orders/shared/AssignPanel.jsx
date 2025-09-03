// src/components/orders/AssignPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useRole } from "@/lib/hooks/useRole";
import { useUsers } from "@/lib/hooks/useUsers";
import { assignAppraiser, updateOrder } from "@/lib/services/ordersService";

export default function AssignPanel({ order, onAfterChange }) {
  const { isAdmin } = useRole() || {};
  const { data: users = [], loading, error } = useUsers();
  const [appraiserId, setAppraiserId] = useState(order?.appraiser_id || "");
  const [reviewerId, setReviewerId] = useState(order?.reviewer_id || "");

  useEffect(() => {
    setAppraiserId(order?.appraiser_id || "");
    setReviewerId(order?.reviewer_id || "");
  }, [order?.appraiser_id, order?.reviewer_id]);

  const appraisers = useMemo(
    () =>
      users.filter(
        (u) => ["appraiser", "admin"].includes(String(u.role || "").toLowerCase())
      ),
    [users]
  );
  const reviewers = useMemo(
    () =>
      users.filter(
        (u) => ["reviewer", "admin"].includes(String(u.role || "").toLowerCase())
      ),
    [users]
  );

  if (!isAdmin || !order) return null;

  async function saveAssignments() {
    await toast.promise(
      (async () => {
        // IMPORTANT: send users.id (matches FK); allow null to unassign
        await assignAppraiser(order.id, appraiserId || null);
        await updateOrder(order.id, { reviewer_id: reviewerId || null });
      })().then(() => onAfterChange?.()),
      {
        loading: "Saving assignments…",
        success: "Assignments saved",
        error: (e) => e?.message || "Failed to save assignments",
      }
    );
  }

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <div className="text-sm font-medium">Assignments</div>

      {loading && <div className="text-xs text-gray-500">Loading users…</div>}
      {error && (
        <div className="text-xs text-red-700 bg-red-50 border rounded p-2">
          Failed to load users: {error.message}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="text-xs text-gray-500 mb-1">Appraiser</div>
              <select
                className="w-full rounded border px-2 py-2 text-sm"
                value={appraiserId || ""}
                onChange={(e) => setAppraiserId(e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {appraisers.map((u) => (
                  <option key={u.id || u.auth_id} value={u.id}>
                    {u.name || u.email || u.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <div className="text-xs text-gray-500 mb-1">Reviewer</div>
              <select
                className="w-full rounded border px-2 py-2 text-sm"
                value={reviewerId || ""}
                onChange={(e) => setReviewerId(e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {reviewers.map((u) => (
                  <option key={u.id || u.auth_id} value={u.id}>
                    {u.name || u.email || u.id}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <button
              className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
              onClick={saveAssignments}
            >
              Save Assignments
            </button>
          </div>
        </>
      )}
    </div>
  );
}

