// src/pages/admin/UsersIndex.jsx
import { useEffect, useMemo, useState } from "react";
import  supabase  from "@/lib/supabaseClient"; // if you only have a default export, change to `import supabase from ...`
import { getCurrentUserProfile } from "@/lib/services/api";

function Badge({ children }) {
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border">{children}</span>;
}

function Row({ label, value }) {
  return (
    <div className="text-sm flex items-center gap-2">
      <span className="text-gray-600">{label}:</span>
      <span className="text-gray-800">{value ?? "—"}</span>
    </div>
  );
}

export default function UsersIndex() {
  const [me, setMe] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const isAdmin = useMemo(() => me?.role === "admin", [me]);

  async function load() {
    setLoading(true);
    try {
      const prof = await getCurrentUserProfile();
      setMe(prof);

      if (prof?.role === "admin") {
     // admin gets everything via SECURITY DEFINER RPC (bypasses RLS safely)
     const { data, error } = await supabase.rpc("admin_list_users");
        if (error) throw error;
        setList(data || []);
      } else if (prof) {
        setList([prof]);
      } else {
        setList([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveUserPatch(id, patch) {
    setSavingId(id);
    try {
      const { error } = await supabase.from("users").update(patch).eq("id", id);
      if (error) throw error;
      await load();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <button className="px-3 py-1.5 rounded-lg border text-sm" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-sm text-gray-500">No users found.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {list.map((u) => {
            const name = u.display_name || u.full_name || u.name || u.email;
            const canEditSelf = u.id === me?.id;
            return (
              <div key={u.id} className="rounded-2xl border p-4 shadow-sm">
                {/* Header */}
                <div className="flex items-center gap-3">
                  {u.photo_url ? (
                    <img src={u.photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200" />
                  )}
                  <div>
                    <div className="font-semibold">{name}</div>
                    <div className="text-xs text-gray-600">{u.email}</div>
                  </div>
                </div>

                {/* Meta */}
                <div className="mt-3 space-y-1">
                  <Row label="Role" value={<Badge>{u.role || "—"}</Badge>} />
                  {"fee_split" in u && <Row label="Split" value={u.fee_split != null ? `${Number(u.fee_split).toFixed(2)}%` : "—"} />}
                  {u.phone && <Row label="Phone" value={<a className="underline" href={`tel:${u.phone}`}>{u.phone}</a>} />}
                  {u.title && <Row label="Title" value={u.title} />}
                </div>

                {/* Admin-only: inline role & split editor */}
                {isAdmin && (
                  <div className="mt-3 rounded-xl border p-3 space-y-2">
                    <div className="text-sm font-medium">Manage (Admin)</div>

                    <label className="block text-sm">
                      <span className="text-gray-600">Role</span>
                      <select
                        className="mt-1 w-full border rounded-lg px-3 py-2"
                        defaultValue={u.role || ""}
                        onChange={(e) => saveUserPatch(u.id, { role: e.target.value || null })}
                        disabled={savingId === u.id}
                      >
                        <option value="">—</option>
                        <option value="admin">admin</option>
                        <option value="appraiser">appraiser</option>
                        <option value="reviewer">reviewer</option>
                        <option value="manager">manager</option>
                      </select>
                    </label>

                    {"fee_split" in u && (
                      <label className="block text-sm">
                        <span className="text-gray-600">Fee Split (%)</span>
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={u.fee_split ?? ""}
                          onBlur={(e) => {
                            const v = e.target.value === "" ? null : Number(e.target.value);
                            if (v !== u.fee_split) saveUserPatch(u.id, { fee_split: v });
                          }}
                          className="mt-1 w-full border rounded-lg px-3 py-2"
                          disabled={savingId === u.id}
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* Self-edit prefs (non-admins at least get this) */}
                {!isAdmin && canEditSelf && (
                  <div className="mt-3 text-xs text-gray-600">
                    Edit your phone/photo from your profile; notification prefs in Settings → Notifications.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


