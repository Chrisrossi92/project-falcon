// src/pages/AdminUsers.jsx
import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useUsers } from "@/lib/hooks/useUsers";
import {
  setUserRole,
  setUserFeeSplit,
  setUserStatus,
  setUserColor,
} from "@/lib/services/usersService";

const ROLES = ["admin", "reviewer", "appraiser"];
const STATUSES = ["active", "inactive"];

function EditableRow({ u, onChanged }) {
  const [role, setRole] = useState(u.role || "appraiser");
  const [fee, setFee] = useState(
    u.fee_split == null ? "" : Number(u.fee_split).toFixed(2)
  );
  const [status, setStatus] = useState(u.status || "active");
  const [color, setColor] = useState(u.display_color || "");

  async function saveRole() {
    await toast.promise(setUserRole(u.auth_id, role), {
      loading: "Updating role…",
      success: "Role updated",
      error: (e) => e.message || "Failed to update role",
    });
    onChanged?.();
  }
  async function saveFee() {
    const val = fee === "" ? null : Number(fee);
    await toast.promise(setUserFeeSplit(u.auth_id, val), {
      loading: "Updating fee split…",
      success: "Fee split updated",
      error: (e) => e.message || "Failed to update fee split",
    });
    onChanged?.();
  }
  async function saveStatus() {
    await toast.promise(setUserStatus(u.auth_id, status), {
      loading: "Updating status…",
      success: "Status updated",
      error: (e) => e.message || "Failed to update status",
    });
    onChanged?.();
  }
  async function saveColor() {
    await toast.promise(setUserColor(u.auth_id, color || null), {
      loading: "Saving color…",
      success: "Color saved",
      error: (e) => e.message || "Failed to save color",
    });
    onChanged?.();
  }

  return (
    <tr className="border-t">
      <td className="px-3 py-2 text-sm">{u.email || "—"}</td>
      <td className="px-3 py-2 text-sm">{u.name || "—"}</td>
      <td className="px-3 py-2 text-sm">
        <div className="flex items-center gap-2">
          <select
            className="rounded border px-2 py-1 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="text-xs px-2 py-1 border rounded hover:bg-gray-50" onClick={saveRole}>
            Save
          </button>
        </div>
      </td>
      <td className="px-3 py-2 text-sm">
        <div className="flex items-center gap-2">
          <input
            className="w-24 rounded border px-2 py-1 text-sm"
            inputMode="decimal"
            placeholder="50.00"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
          <button className="text-xs px-2 py-1 border rounded hover:bg-gray-50" onClick={saveFee}>
            Save
          </button>
        </div>
      </td>
      <td className="px-3 py-2 text-sm">
        <div className="flex items-center gap-2">
          <select
            className="rounded border px-2 py-1 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="text-xs px-2 py-1 border rounded hover:bg-gray-50" onClick={saveStatus}>
            Save
          </button>
        </div>
      </td>
      <td className="px-3 py-2 text-sm">
        <div className="flex items-center gap-2">
          <input
            className="w-28 rounded border px-2 py-1 text-sm"
            placeholder="#A3E635"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <div className="h-5 w-5 rounded border" style={{ background: color || "#fff" }} />
          <button className="text-xs px-2 py-1 border rounded hover:bg-gray-50" onClick={saveColor}>
            Save
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const { data, loading, error } = useUsers({ search, role });

  const rows = useMemo(() => data || [], [data]);

  async function refresh() {
    // Quick and dirty: just reload the page; or we could plumb a refetch state.
    window.location.reload();
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Manage Roles</h1>
        <p className="text-sm text-gray-600">
          Admin-only: set roles, fee splits, status, and display color.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="w-72 rounded border px-3 py-2 text-sm"
          placeholder="Search name / email / role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded border px-2 py-2 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {loading && <div className="p-3 text-sm text-gray-600">Loading users…</div>}
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border rounded">
          Failed to load users: {error.message}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Fee Split</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Color</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-sm text-gray-500">No users found.</td></tr>
              ) : (
                rows.map((u) => <EditableRow key={u.auth_id || u.id} u={u} onChanged={refresh} />)
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}





