// src/pages/UsersDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { listTeam } from "@/lib/services/userService";
import { useRole } from "@/lib/hooks/useRole";
import SectionHeader from "@/components/SectionHeader";

/** Small avatar with fallback initial */
function Avatar({ name, url, size = 36 }) {
  const letter = (name || "").trim().charAt(0).toUpperCase() || "U";
  return url ? (
    <img src={url} alt={name || "User"} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div
      className="rounded-full bg-gray-200 text-gray-700 flex items-center justify-center"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      title={name || "User"}
    >
      {letter}
    </div>
  );
}

function Card({ u, isAdminOrManager }) {
  const display = u.display_name || u.name || "—";
  const subtitle = u.email || "—";
  const role = u.role || "—";
  const status = u.status || "—";
  const split = typeof u.fee_split === "number" ? `${u.fee_split}%` : u.fee_split ?? "—";

  return (
    <div className="border rounded-xl p-3 bg-white shadow-sm flex items-center gap-3">
      <Avatar name={display} url={u.avatar_url} size={40} />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{display}</div>
        <div className="text-xs text-gray-600 truncate">{subtitle}</div>
        <div className="mt-1 text-[11px] text-gray-500">
          <span className="mr-3">
            Role: <span className="font-medium text-gray-700">{role}</span>
          </span>
          <span className="mr-3">
            Status: <span className="font-medium text-gray-700">{status}</span>
          </span>
          <span>
            Split: <span className="font-medium text-gray-700">{split}</span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link to={`/users/view/${u.id}`} className="text-blue-600 hover:underline text-sm">
          View
        </Link>
        {isAdminOrManager && (
          <Link to={`/users/${u.id}`} className="text-blue-600 hover:underline text-sm" title="Admin edit">
            Edit
          </Link>
        )}
      </div>
    </div>
  );
}

export default function UsersDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [q, setQ] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const { isAdmin, role } = useRole() || {};
  const isManager = String(role || "").toLowerCase() === "manager";
  const isAdminOrManager = !!(isAdmin || isManager);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const data = await listTeam({ includeInactive });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr(e?.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const needle = q.toLowerCase();
    return rows.filter((u) => {
      const hay = `${u.display_name || ""} ${u.name || ""} ${u.email || ""} ${u.role || ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q]);

  return (
    <div className="p-4 space-y-4">
      <SectionHeader
        title="Team Directory"
        subtitle={loading ? "Loading…" : err ? `Failed to load: ${err}` : "People at your firm"}
        right={
          <div className="flex items-center gap-3">
            {isAdminOrManager && (
              <Link to="/admin/users">
                <Button variant="outline">Manage Roles</Button>
              </Link>
            )}
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
              Include inactive
            </label>
            <input
              placeholder="Search name/email/role…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border rounded-md px-2 py-1 text-sm"
              style={{ width: 260 }}
            />
            <Button variant="outline" onClick={load} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </Button>
          </div>
        }
      />

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          <div className="text-gray-600">Loading users…</div>
        ) : err ? (
          <div className="text-red-600">Failed to load: {err}</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-600 col-span-full">No users found.</div>
        ) : (
          filtered.map((u) => <Card key={u.id} u={u} isAdminOrManager={isAdminOrManager} />)
        )}
      </div>
    </div>
  );
}







