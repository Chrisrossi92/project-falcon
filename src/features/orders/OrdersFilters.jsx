import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";

const STATUS = [
  ["", "All"],
  ["new", "New"],
  ["in_progress", "In progress"],
  ["in_review", "In review"],
  ["needs_revisions", "Needs revisions"],
  ["completed", "Completed"],
];

const PRIORITY = [
  ["", "All priorities"],
  ["normal", "Normal"],
  ["overdue", "Overdue"],
  ["urgent", "Urgent"],
];

const DUE = [
  ["", "Any due date"],
  ["1", "Due in 1 day"],
  ["2", "Due in 2 days"],
  ["7", "Due in 7 days"],
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
        supabase.from("profiles").select("id, display_name, name, role").order("display_name", { ascending: true }),
        supabase.from("clients").select("id, name").order("name", { ascending: true }),
      ]);
      setAppraisers((users || []).filter((u) => String(u.role || "").toLowerCase() === "appraiser"));
      setClients(clis || []);
    })();
  }, []);

  const set = (patch) => onChange?.({ ...v, ...patch });

  // helper: convert single status to statusIn array for the table
  const isActive = (key) => (v.statusIn?.[0] || "") === key;
  const setStatus = (key) => set({ statusIn: key ? [key] : [] });

  return (
    <div className="rounded-2xl border bg-white p-4 space-y-3">
      {/* Search row */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="w-full md:w-[380px] rounded-md border px-3 py-2 text-sm"
          placeholder="Order # / Title / Address"
          value={v.search ?? ""}
          onChange={(e) => set({ search: e.target.value, page: 0 })}
        />

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Client</label>
          <select
            className="border rounded-md px-3 py-2 text-sm min-w-[12rem]"
            value={v.clientId ?? ""}
            onChange={(e) => set({ clientId: e.target.value, page: 0 })}
          >
            <option value="">All</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Appraiser</label>
          <select
            className="border rounded-md px-3 py-2 text-sm min-w-[10rem]"
            value={v.appraiserId ?? ""}
            onChange={(e) => set({ appraiserId: e.target.value, page: 0 })}
          >
            <option value="">All</option>
            {appraisers.map((a) => <option key={a.id} value={a.id}>{a.display_name || a.name}</option>)}
          </select>
        </div>
      </div>

      {/* Status pills (single-select → statusIn[0]) */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm text-gray-600 mr-1">Status</div>
        {STATUS.map(([key, label]) => {
          const active = isActive(key);
          return (
            <button
              key={key || "_all"}
              type="button"
              onClick={() => setStatus(active ? "" : key)}
              className={
                "text-xs px-2.5 py-1.5 rounded-md border " +
                (active ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50")
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Priority + Due */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Priority</label>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={v.priority ?? ""}
            onChange={(e) => set({ priority: e.target.value, page: 0 })}
          >
            {PRIORITY.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Due</label>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={v.dueWindow ?? ""}
            onChange={(e) => set({ dueWindow: e.target.value, page: 0 })}
          >
            {DUE.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
