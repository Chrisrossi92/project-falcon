// src/features/orders/OrdersFilters.jsx
import { useEffect, useState } from "react";
import { WorkspaceSurface } from "@/components/workspace/WorkspaceSurface";
import { listCompanyAssignableAppraisers } from "@/features/company-members/assignableUsersApi";
import { listOrderFilterClients } from "@/features/orders/orderFilterOptionsApi";
import {
  falconInteractionClasses,
  falconInteractionClassNames,
  falconInteractionStyles,
} from "@/lib/ui/falconInteractions";
import { operationalUserName } from "@/lib/utils/userDisplayName";

const ACTIVE_STATUS_FILTER_KEY = "__active";
const ACTIVE_CURRENT_STATUSES = Object.freeze([
  "new",
  "in_progress",
  "in_review",
  "needs_revisions",
  "review_cleared",
  "pending_final_approval",
  "ready_for_client",
]);

const STATUS = [
  [ACTIVE_STATUS_FILTER_KEY, "Active"],
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

const filterControlStyle = falconInteractionStyles();

export default function OrdersFilters({
  value,
  onChange,
  actions = null,
  title = "Filter Orders",
  description = "Search orders by status, owner, client, and due window.",
  searchLabel = "Search orders",
  showAppraiserFilter = true,
  showMyWorkFilter = true,
  density = "default",
}) {
  const v = value || {};
  const compact = density === "compact";
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    (async () => {
      const [assignable, clis] = await Promise.all([
        showAppraiserFilter ? listCompanyAssignableAppraisers() : Promise.resolve([]),
        listOrderFilterClients(),
      ]);

      setUsers(assignable || []);
      setClients(clis || []);
    })();
  }, [showAppraiserFilter]);

  const set = (patch) => onChange?.({ ...v, ...patch });

  // helper: convert single status to statusIn array for the table
  const isDefaultActiveStatusFilter = (statusIn = []) =>
    Array.isArray(statusIn) &&
    statusIn.length === ACTIVE_CURRENT_STATUSES.length &&
    ACTIVE_CURRENT_STATUSES.every((status) => statusIn.includes(status));
  const isActive = (key) =>
    key === ACTIVE_STATUS_FILTER_KEY
      ? isDefaultActiveStatusFilter(v.statusIn)
      : v.statusIn?.length === 1 && v.statusIn[0] === key;
  const setStatus = (key) =>
    set({
      statusIn: key === ACTIVE_STATUS_FILTER_KEY ? [...ACTIVE_CURRENT_STATUSES] : [key],
    });
  const controlClass = [
    "h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm",
    "focus:border-slate-400 focus:ring-slate-100",
    falconInteractionClasses.transition,
    falconInteractionClasses.focusVisibleRing,
  ].join(" ");
  const surfaceSpacing = compact ? "space-y-1.5 rounded-2xl p-2.5" : "space-y-3 rounded-2xl p-3";
  const headerSpacing = compact
    ? "flex flex-wrap items-start justify-between gap-1 pb-0"
    : "flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3";
  const rowSpacing = compact ? "flex flex-wrap items-stretch gap-2 sm:items-center" : "flex flex-wrap items-stretch gap-3 sm:items-center";
  const chipSpacing = compact
    ? "flex flex-wrap items-center gap-1.5"
    : "flex flex-wrap items-center gap-2";

  return (
    <WorkspaceSurface as="div" variant="secondary" className={surfaceSpacing}>
      <div className={headerSpacing}>
        {title || description ? (
          <div className="min-w-0">
            {title ? (
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</div>
            ) : null}
            {description ? <div className="mt-1 text-sm text-slate-500">{description}</div> : null}
          </div>
        ) : null}
        {actions ? (
          <div aria-label="Orders filter utilities" className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
            {actions}
          </div>
        ) : null}
      </div>

      <div className={rowSpacing}>
        {showMyWorkFilter ? (
          <div role="group" aria-label="Orders assignment scope" className="flex w-full items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:w-auto">
            {[
              ["", "All visible"],
              ["my_work", "My Work"],
            ].map(([key, label]) => {
              const active = key === "my_work" ? Boolean(v.assignedToMe) : !v.assignedToMe;
              return (
                <button
                  key={key || "all_visible"}
                  type="button"
                  onClick={() =>
                    set(
                      key === "my_work"
                        ? { assignedToMe: true, appraiserId: "", reviewerId: "", page: 0 }
                        : { assignedToMe: false, page: 0 },
                    )
                  }
                  style={filterControlStyle}
                  className={falconInteractionClassNames("quietSecondaryAction", {
                    selected: active,
                    className: [
                      "h-7 rounded-md border-transparent px-2.5 text-xs font-semibold shadow-none",
                      active
                        ? "border-slate-200 bg-white text-slate-950 ring-1 ring-slate-200"
                        : "bg-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800",
                    ],
                  })}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}

        <input
          aria-label={searchLabel}
          className={`${controlClass} w-full sm:min-w-[18rem] md:w-[360px]`}
          style={filterControlStyle}
          placeholder="Order # / Title / Address"
          value={v.search ?? ""}
          onChange={(e) => set({ search: e.target.value, page: 0 })}
        />

        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:min-w-[13rem]">
          <label htmlFor="orders-filter-client" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Client</label>
          <select
            id="orders-filter-client"
            className={`${controlClass} min-w-0 flex-1 sm:min-w-[10rem]`}
            style={filterControlStyle}
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

        {showAppraiserFilter ? (
          <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:min-w-[13rem]">
            <label htmlFor="orders-filter-appraiser" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Appraiser</label>
            <select
              id="orders-filter-appraiser"
              className={`${controlClass} min-w-0 flex-1 sm:min-w-[10rem]`}
              style={filterControlStyle}
              value={v.appraiserId ?? ""}
              onChange={(e) => set({ appraiserId: e.target.value, page: 0 })}
            >
              <option value="">All</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {operationalUserName(u, u.id)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {/* Status pills (single-select → statusIn[0]) */}
      <div role="group" aria-label="Order status filter" className={chipSpacing}>
        <div className="mr-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Status</div>
        {STATUS.map(([key, label]) => {
          const active = isActive(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(active ? ACTIVE_STATUS_FILTER_KEY : key)}
              style={filterControlStyle}
              className={falconInteractionClassNames("quietSecondaryAction", {
                selected: active,
                className: [
                  "rounded-full px-2.5 py-1.5 text-xs font-semibold shadow-sm",
                  active
                    ? "border-slate-900 bg-slate-900 text-white ring-1 ring-slate-900"
                    : "text-slate-600",
                ],
              })}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Priority + Due */}
      <div className={rowSpacing}>
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <label htmlFor="orders-filter-priority" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Priority</label>
          <select
            id="orders-filter-priority"
            className={`${controlClass} min-w-0 flex-1 sm:flex-none`}
            style={filterControlStyle}
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

        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <label htmlFor="orders-filter-due" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Due</label>
          <select
            id="orders-filter-due"
            className={`${controlClass} min-w-0 flex-1 sm:flex-none`}
            style={filterControlStyle}
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
    </WorkspaceSurface>
  );
}
