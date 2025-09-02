// src/pages/admin/ManageRoles.jsx
import React, { useEffect, useMemo, useState } from "react";
import { listUsersWithRoles, setUserRole, getMyRole } from "@/lib/services/rolesService";

const ROLE_OPTIONS = ["admin", "reviewer", "appraiser"];

export default function ManageRoles() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [myRole, setMyRole] = useState("appraiser");
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const [role, list] = await Promise.all([getMyRole(), listUsersWithRoles()]);
        setMyRole(role || "appraiser");
        setRows(
          list.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.display_name || u.email,
            role: u.role || "appraiser",
            fee_split: u.fee_split ?? "",
          }))
        );
      } catch (e) {
        setErr(e?.message || String(e));
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isAdmin = myRole === "admin";

  const handleSave = async (row) => {
    try {
      setSavingId(row.id);
      await setUserRole(row.id, row.role, row.fee_split === "" ? null : Number(row.fee_split));
    } catch (e) {
      alert(e?.message || String(e));
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div className="p-4">Loading…</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Manage Roles</h1>
        <p className="text-sm text-gray-600">
          Set each user’s role and fee split. {isAdmin ? "" : "(read-only; admin required to save)"}
        </p>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-left px-3 py-2">Fee split (%)</th>
              <th className="text-right px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-gray-600">{r.email}</td>
                <td className="px-3 py-2">
                  <select
                    className="border rounded px-2 py-1"
                    value={r.role}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x) => (x.id === r.id ? { ...x, role: e.target.value } : x))
                      )
                    }
                    disabled={!isAdmin}
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.01"
                    className="border rounded px-2 py-1 w-28"
                    value={r.fee_split}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x) => (x.id === r.id ? { ...x, fee_split: e.target.value } : x))
                      )
                    }
                    placeholder="e.g., 50"
                    disabled={!isAdmin}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className={`px-3 py-1 rounded text-white ${
                      isAdmin ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300"
                    }`}
                    disabled={!isAdmin || savingId === r.id}
                    onClick={() => handleSave(r)}
                  >
                    {savingId === r.id ? "Saving…" : "Save"}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
