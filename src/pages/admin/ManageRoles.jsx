import React, { useEffect, useMemo, useState } from "react";
import { listUsers, setUserRole, setUserFeeSplit, setUserActive } from "@/lib/services/usersService";
import { useRole } from "@/lib/hooks/useRole";

const ROLES = [
  { v: "admin", label: "Admin" },
  { v: "reviewer", label: "Reviewer" },
  { v: "appraiser", label: "Appraiser" },
];

export default function ManageRoles() {
  const { isAdmin } = useRole() || {};
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.email, r.full_name, r.display_name].join(" ").toLowerCase().includes(q));
  }, [rows, search]);

  async function refresh() {
    setErr(null);
    try { setRows(await listUsers()); }
    catch (e) { setErr(e); }
  }

  useEffect(() => { refresh(); }, []);

  if (!isAdmin) {
    return <div className="p-4 text-sm text-muted-foreground">Only admins can manage roles.</div>;
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Manage Roles</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className="ml-auto rounded border px-3 py-2 text-sm"
        />
      </div>

      {err && <div className="text-red-600 text-sm border rounded p-2">Failed: {err.message}</div>}

      <div className="border rounded overflow-hidden">
        <div className="grid grid-cols-7 gap-2 px-3 py-2 text-[13px] font-medium text-muted-foreground border-b">
          <div className="col-span-2">User</div>
          <div>Email</div>
          <div>Role</div>
          <div>Fee Split</div>
          <div>Active</div>
          <div>Updated</div>
        </div>

        {filtered.map((u) => (
          <div key={u.id} className="grid grid-cols-7 gap-2 px-3 py-2 border-b text-sm items-center">
            <div className="col-span-2 min-w-0">
              <div className="truncate font-medium">{u.display_name || u.full_name || "—"}</div>
            </div>
            <div className="truncate">{u.email}</div>

            {/* Role */}
            <div>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={u.role || "appraiser"}
                disabled={busyId === u.id}
                onChange={async (e) => {
                  setBusyId(u.id);
                  try {
                    const next = await setUserRole(u.id, e.target.value);
                    setRows((prev) => prev.map((r) => (r.id === u.id ? next : r)));
                  } catch (e2) { setErr(e2); } finally { setBusyId(null); }
                }}
              >
                {ROLES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
              </select>
            </div>

            {/* Fee split */}
            <div>
              <input
                type="number" step="0.01" min="0" max="100"
                className="border rounded px-2 py-1 w-24 text-right text-sm"
                value={u.fee_split ?? 50}
                disabled={busyId === u.id}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(100, Number(e.target.value)));
                  setRows((prev) => prev.map((r) => (r.id === u.id ? { ...r, fee_split: v } : r)));
                }}
                onBlur={async () => {
                  setBusyId(u.id);
                  try {
                    const next = await setUserFeeSplit(u.id, rows.find(r => r.id === u.id).fee_split);
                    setRows((prev) => prev.map((r) => (r.id === u.id ? next : r)));
                  } catch (e2) { setErr(e2); } finally { setBusyId(null); }
                }}
              />
              <span className="ml-1 text-xs text-muted-foreground">%</span>
            </div>

            {/* Active toggle */}
            <div>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!u.is_active}
                  disabled={busyId === u.id}
                  onChange={async (e) => {
                    setBusyId(u.id);
                    try {
                      const next = await setUserActive(u.id, e.target.checked);
                      setRows((prev) => prev.map((r) => (r.id === u.id ? next : r)));
                    } catch (e2) { setErr(e2); } finally { setBusyId(null); }
                  }}
                />
                <span className="text-xs text-muted-foreground">Active</span>
              </label>
            </div>

            <div className="text-xs text-muted-foreground">
              {u.updated_at ? new Date(u.updated_at).toLocaleString() : "—"}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="px-3 py-3 text-sm text-muted-foreground">No users found.</div>
        )}
      </div>
    </div>
  );
}
