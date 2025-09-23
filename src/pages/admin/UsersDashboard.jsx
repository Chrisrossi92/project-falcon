import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "@/lib/supabaseClient";
import { useRole } from "@/lib/hooks/useRole";
import { listTeam } from "@/lib/services/userService";
import { Button } from "@/components/ui/button";
import SectionHeader from "@/components/ui/SectionHeader";
import AvatarBadge from "@/components/ui/AvatarBadge";

function UserCard({ u, isAdminish }) {
  const display = u.display_name || u.full_name || u.name || u.email || "—";
  const subtitle = u.email || "—";
  const role = u.role || "—";
  const status = u.status || "active";
  const split = typeof u.fee_split === "number" ? `${u.fee_split}` : u.fee_split ?? "—";

  return (
    <div className="border rounded-xl p-3 bg-white shadow-sm flex items-center gap-3">
      <AvatarBadge
        name={display}
        email={u.email}
        id={u.id}
        color={u.display_color}
        src={u.avatar_url}
        size={40}
        ring
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{display}</div>
        <div className="text-xs text-gray-600 truncate">{subtitle}</div>
        <div className="mt-1 text-[11px] text-gray-500">
          <span className="mr-3">Role: <span className="font-medium text-gray-700">{role}</span></span>
          <span className="mr-3">Status: <span className="font-medium text-gray-700">{status}</span></span>
          <span>Split: <span className="font-medium text-gray-700">{split}</span></span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link to={`/users/view/${u.id}`} className="text-blue-600 hover:underline text-sm">View</Link>
        {isAdminish && (
          <Link to={`/users/${u.id}`} className="text-blue-600 hover:underline text-sm" title="Admin edit">
            Edit
          </Link>
        )}
      </div>
    </div>
  );
}

export default function UsersDashboard() {
  const { isAdmin, role } = useRole() || {};
  const isAdminish = !!(isAdmin || String(role || "").toLowerCase() === "admin");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [q, setQ] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const reqKeyRef = useRef(0);

  useEffect(() => {
    reqKeyRef.current += 1;
    const myKey = reqKeyRef.current;

    (async () => {
      try {
        setLoading(true); setErr(null);

        let data = [];
        if (isAdminish) {
          let { data: all, error } = await supabase.rpc("admin_list_users");
          if (error) {
            const res2 = await supabase.rpc("team_list_users"); // alias if used
            if (res2.error) throw res2.error;
            all = res2.data || [];
          }
          data = Array.isArray(all) ? all : [];
          if (!includeInactive) data = data.filter((u) => (u.status || "active") !== "inactive");
        } else {
          data = (await listTeam({ includeInactive })) || [];
        }

        if (reqKeyRef.current === myKey) setRows(data);
      } catch (e) {
        if (reqKeyRef.current === myKey) { setErr(e?.message || String(e)); setRows([]); }
      } finally {
        if (reqKeyRef.current === myKey) setLoading(false);
      }
    })();
  }, [isAdminish, includeInactive]);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const needle = q.toLowerCase();
    return rows.filter((u) => {
      const hay = `${u.display_name || ""} ${u.full_name || ""} ${u.name || ""} ${u.email || ""} ${u.role || ""}`.toLowerCase();
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
            {isAdminish && (
              <Link to="/admin/users">
                <Button variant="outline">Manage Roles</Button>
              </Link>
            )}
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
              Include inactive
            </label>
            <input
              placeholder="Search name / email / role…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border rounded-md px-2 py-1 text-sm"
              style={{ width: 260 }}
            />
            <Button variant="outline" onClick={() => { reqKeyRef.current += 1; setIncludeInactive((v) => v); }}>
              {loading ? "Loading…" : "Refresh"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          <div className="text-gray-600">Loading users…</div>
        ) : err ? (
          <div className="text-red-600">Failed to load: {err}</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-600 col-span-full">No users found.</div>
        ) : (
          filtered.map((u) => <UserCard key={u.id} u={u} isAdminish={isAdminish} />)
        )}
      </div>
    </div>
  );
}










