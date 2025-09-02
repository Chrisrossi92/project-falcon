// src/components/orders/AssignAppraiser.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useUsers } from "@/lib/hooks/useUsers";
import { assignAppraiser } from "@/lib/services/ordersService";

export default function AssignAppraiser({ order, onAfterChange }) {
  const { data: users = [], loading, error } = useUsers();
  const [appraiserId, setAppraiserId] = useState(order?.appraiser_id || "");

  useEffect(() => {
    setAppraiserId(order?.appraiser_id || "");
  }, [order?.appraiser_id]);

  // Admins can be assignees too if you want; mirror your AssignPanel filter
  const appraisers = useMemo(
    () =>
      users.filter((u) =>
        ["appraiser", "admin"].includes(String(u.role || "").toLowerCase())
      ),
    [users]
  );

  async function save() {
    if (!order?.id) return;
    // Pass public.users.id (our FK) – the RPC normalizer will also accept auth_id,
    // but using users.id is the cleanest path with current FK+RLS.
    await assignAppraiser(order.id, appraiserId || null);
    onAfterChange?.();
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="border rounded px-2 py-1 text-xs"
        value={appraiserId || ""}
        onChange={(e) => setAppraiserId(e.target.value || "")}
        disabled={loading}
      >
        <option value="">— Unassigned —</option>
        {appraisers.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name || u.email || u.id}
          </option>
        ))}
      </select>
      <button
        onClick={save}
        className="text-xs px-2 py-1 rounded border"
        disabled={loading || !order?.id}
      >
        Save
      </button>
      {error && (
        <span className="text-xs text-red-600">Failed to load users</span>
      )}
    </div>
  );
}


