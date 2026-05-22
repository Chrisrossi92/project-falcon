// src/features/orders/OrdersFilters.jsx
import { useEffect, useState } from "react";
import { listCompanyAssignableAppraisers } from "@/features/company-members/assignableUsersApi";
import { listOrderFilterClients } from "@/features/orders/orderFilterOptionsApi";

const STATUS = [
  ["", "All"],
  ["new", "New"],
  ["in_progress", "In progress"],
  ["in_review", "In review"],
  ["needs_revisions", "Needs revisions"],
  ["review_cleared", "Review cleared"],
  ["pending_final_approval", "Pending final approval"],
  ["ready_for_client", "Ready for client"],
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

export default function OrdersFilters({ value, onChange, actions = null }) {
  const v = value || {};
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    (async () => {
      const [assignable, clis] = await Promise.all([
        listCompanyAssignableAppraisers(),
        listOrderFilterClients(),
      ]);

      setUsers(assignable || []);
      setClients(clis || []);
    })();
  }, []);

  const set = (patch) => onChange?.({ ...v, ...patch });

  // helper: convert single status to statusIn array for the table
  const isActive = (key) => (v.statusIn?.[0] || "") === key;
  const setStatus = (key) => set({ statusIn: key ? [key] : [] });
  const controlClass =
    "h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100";

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Filter Active Orders</div>
          <div className="mt-1 text-sm text-slate-500">Search active operational orders by status, owner, client, and due window.</div>
        </div>
        {actions ? (
          <div aria-label="Orders filter utilities" className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          aria-label="Search active orders"
          className={`${controlClass} w-full md:w-[360px]`}
          placeholder="Order # / Title / Address"
          value={v.search ?? ""}
          onChange={(e) => set({ search: e.target.value, page: 0 })}
        />

        <div className="flex min-w-[13rem] items-center gap-2">
          <label htmlFor="orders-filter-client" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Client</label>
          <select
            id="orders-filter-client"
            className={`${controlClass} min-w-[10rem]`}
            value={v.clientId ?? ""}
            onChange={(e) => set({ clientId: e.target.value, page: 0 })}
          >
            <option value="">All</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[13rem] items-center gap-2">
          <label htmlFor="orders-filter-appraiser" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Appraiser</label>
          <select
            id="orders-filter-appraiser"
            className={`${controlClass} min-w-[10rem]`}
            value={v.appraiserId ?? ""}
            onChange={(e) => set({ appraiserId: e.target.value, page: 0 })}
          >
            <option value="">All</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name || u.full_name || u.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status pills (single-select → statusIn[0]) */}
      <div role="group" aria-label="Order status filter" className="flex flex-wrap items-center gap-2">
        <div className="mr-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Status</div>
        {STATUS.map(([key, label]) => {
          const active = isActive(key);
          return (
            <button
              key={key || "_all"}
              type="button"
              onClick={() => setStatus(active ? "" : key)}
              className={
                "rounded-full border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition " +
                (active
                  ? "border-slate-800 bg-slate-900 text-white ring-1 ring-slate-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900")
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
          <label htmlFor="orders-filter-priority" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Priority</label>
          <select
            id="orders-filter-priority"
            className={controlClass}
            value={v.priority ?? ""}
            onChange={(e) => set({ priority: e.target.value, page: 0 })}
          >
            {PRIORITY.map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="orders-filter-due" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Due</label>
          <select
            id="orders-filter-due"
            className={controlClass}
            value={v.dueWindow ?? ""}
            onChange={(e) => set({ dueWindow: e.target.value, page: 0 })}
          >
            {DUE.map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
