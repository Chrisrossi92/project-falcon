// src/features/orders/OrdersFilters.jsx
import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";

const STATUS_OPTIONS = [
  ["", "All"],
  ["new", "New"],
  ["assigned", "Assigned"],
  ["in_progress", "In progress"],
  ["site_visit_done", "Site visit done"],
  ["in_review", "In review"],
  ["ready_to_send", "Ready to send"],
  ["sent_to_client", "Sent to client"],
  ["revisions", "Revisions"],
  ["complete", "Complete"],
];

const PRIORITY_OPTIONS = [
  ["", "All priorities"],
  ["normal", "Normal"],
  ["overdue", "Overdue"],
  ["urgent", "Urgent"],
];

const DUE_OPTIONS = [
  ["", "Any due date"],
  ["this_week", "This week"],
  ["next_week", "Next week"],
  ["overdue", "Overdue"],
];

export default function OrdersFilters({ value, onChange }) {
  const v = value || {};
  const [appraisers, setAppraisers] = useState([]);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    (async () => {
      const [{ data: users }, { data: clis }] = await Promise.all([
        supabase
          .from("users")
          .select("id, display_name, name, role")
          .order("display_name", { ascending: true }),
        supabase.from("clients").select("id, name").order("name", { ascending: true }),
      ]);
      setAppraisers(
        (users || []).filter((u) => String(u.role || "").toLowerCase() === "appraiser")
      );
      setClients(clis || []);
    })();
  }, []);

  const set = (patch) => onChange?.({ ...v, ...patch });

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Status */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Status</label>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={v.status ?? ""}
            onChange={(e) => set({ status: e.target.value })}
          >
            {STATUS_OPTIONS.map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Appraiser */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Appraiser</label>
          <select
            className="border rounded-md px-3 py-2 text-sm min-w-[10rem]"
            value={v.appraiserId ?? ""}
            onChange={(e) => set({ appraiserId: e.target.value })}
          >
            <option value="">All</option>
            {appraisers.map((a) => (
              <option key={a.id} value={a.id}>
                {a.display_name || a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Client */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Client</label>
          <select
            className="border rounded-md px-3 py-2 text-sm min-w-[12rem]"
            value={v.clientId ?? ""}
            onChange={(e) => set({ clientId: e.target.value })}
          >
            <option value="">All</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Priority</label>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={v.priority ?? ""}
            onChange={(e) => set({ priority: e.target.value })}
          >
            {PRIORITY_OPTIONS.map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Due */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Due</label>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={v.dueWindow ?? ""}
            onChange={(e) => set({ dueWindow: e.target.value })}
          >
            {DUE_OPTIONS.map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Right-aligned checkboxes */}
        <div className="ml-auto flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!v.reviewOnly}
              onChange={(e) => set({ reviewOnly: e.target.checked })}
            />
            Show In Review
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!v.includeArchived}
              onChange={(e) => set({ includeArchived: e.target.checked })}
            />
            Show archived
          </label>
        </div>
      </div>
    </div>
  );
}
