import { useEffect, useRef, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { getCurrentUserProfile } from "@/lib/services/api";

const DEFAULT_COLOR = "#6B82A7";

function Badge({ children }) {
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border">{children}</span>;
}

function Row({ label, value }) {
  return (
    <div className="text-sm flex items-center gap-2">
      <span className="text-gray-600">{label}:</span>
      <span className="text-gray-800">{value ?? "-"}</span>
    </div>
  );
}

function getUserColor(user) {
  return user?.color || user?.display_color || DEFAULT_COLOR;
}

function roleLabel(role) {
  if (!role) return "-";
  const map = {
    owner: "Owner",
    admin: "Admin",
    appraiser: "Appraiser",
    reviewer: "Reviewer",
    manager: "Manager",
  };
  const key = String(role).toLowerCase();
  return map[key] || role;
}

function NewUserModal({ open, onClose, onCreate, currentUser }) {
  const isOwner = String(currentUser?.role || "").toLowerCase() === "owner";
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: isOwner ? "owner" : "appraiser",
    fee_split: 50,
    phone: "",
    title: "",
  });
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleChange = (key) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [key]: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email) return;
    setSubmitting(true);
    try {
      await onCreate({
        name: form.full_name,
        display_name: form.full_name,
        full_name: form.full_name,
        email: form.email,
        role: form.role,
        fee_split: form.fee_split === "" ? null : Number(form.fee_split),
        phone: form.phone || null,
        // title: form.title || null, // enable when DB column exists
        status: "active",
        is_active: true,
        color: DEFAULT_COLOR,
        display_color: DEFAULT_COLOR,
      });
      onClose();
      setForm({
        full_name: "",
        email: "",
        role: isOwner ? "owner" : "appraiser",
        fee_split: 50,
        phone: "",
        title: "",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">New user</h2>
          <button className="text-sm text-gray-500" onClick={onClose} disabled={submitting}>
            Close
          </button>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="text-gray-700">Full name</span>
            <input
              type="text"
              className="mt-1 w-full border rounded-lg px-3 py-2"
              required
              value={form.full_name}
              onChange={handleChange("full_name")}
              disabled={submitting}
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-700">Email</span>
            <input
              type="email"
              className="mt-1 w-full border rounded-lg px-3 py-2"
              required
              value={form.email}
              onChange={handleChange("email")}
              disabled={submitting}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-gray-700">Role</span>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={form.role}
                onChange={handleChange("role")}
                disabled={submitting}
              >
                {isOwner && <option value="owner">Owner</option>}
                <option value="admin">Admin</option>
                <option value="appraiser">Appraiser</option>
                <option value="reviewer">Reviewer</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-gray-700">Fee split (%)</span>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={form.fee_split}
                onChange={handleChange("fee_split")}
                disabled={submitting}
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-gray-700">Phone</span>
            <input
              type="text"
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={form.phone}
              onChange={handleChange("phone")}
              disabled={submitting}
            />
          </label>

          <div className="text-xs text-gray-500">Login credentials are managed separately in Supabase Auth.</div>

          <div className="flex justify-end gap-2">
            <button type="button" className="px-3 py-1.5 rounded-lg border text-sm" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="px-3 py-1.5 rounded-lg border text-sm bg-gray-900 text-white" disabled={submitting}>
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserCard({ user, currentUser, savingId, onSavePatch, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    role: user.role || "",
    fee_split: user.fee_split ?? "",
    status: user.status || (user.is_active === false ? "inactive" : "active"),
    is_active: user.is_active ?? true,
    color: getUserColor(user),
  });
  const [selfColor, setSelfColor] = useState(getUserColor(user));
  const colorInputRef = useRef(null);

  useEffect(() => {
    setForm({
      role: user.role || "",
      fee_split: user.fee_split ?? "",
      status: user.status || (user.is_active === false ? "inactive" : "active"),
      is_active: user.is_active ?? true,
      color: getUserColor(user),
    });
    setSelfColor(getUserColor(user));
    setIsEditing(false);
  }, [user]);

  const themeColor = getUserColor(user);
  const borderTint = `${themeColor}33`;
  const name = user.display_name || user.full_name || user.name || user.email;
  const isSelf = user.id === currentUser?.id;
  const currentRole = String(currentUser?.role || "").toLowerCase();
  const targetRole = String(user.role || "").toLowerCase();
  const isOwner = currentRole === "owner";
  const isAdmin = currentRole === "admin";
  const isOwnerOrAdmin = isOwner || isAdmin;
  const canManage = isOwnerOrAdmin && !(targetRole === "owner" && !isOwner);
  const isActive = user.is_active ?? (user.status ? user.status.toLowerCase() !== "inactive" : true);

  const handleSave = async () => {
    const payload = {
      color: form.color,
      display_color: form.color,
    };

    if (isOwnerOrAdmin) {
      if (!(targetRole === "owner" && !isOwner)) {
        payload.role = form.role || null;
        payload.fee_split = form.fee_split === "" ? null : Number(form.fee_split);
      }
      payload.status = form.status || null;
      payload.is_active = form.is_active;
    }

    await onSavePatch(user.id, payload);
    setIsEditing(false);
  };

  const handleSelfColorSave = async () => {
    await onSavePatch(user.id, { color: selfColor, display_color: selfColor });
  };

  return (
    <div className="flex h-80 flex-col rounded-2xl border p-4 shadow-sm overflow-hidden" style={{ borderColor: borderTint }}>
      {!isEditing ? (
        <div className="flex h-full flex-col transition-opacity duration-200">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: themeColor }}
              title={name}
            >
              {user.photo_url ? <img src={user.photo_url} alt="" className="w-12 h-12 rounded-full object-cover" /> : (name || "?")[0]}
            </div>
            <div>
              <div className="font-semibold">{name}</div>
              <div className="text-xs text-gray-600">{user.email}</div>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            <Row label="Role" value={<Badge>{roleLabel(user.role)}</Badge>} />
            <Row label="Email" value={user.email} />
            {isOwnerOrAdmin && "fee_split" in user && (
              <Row label="Fee split" value={user.fee_split != null ? `${Number(user.fee_split).toFixed(2)}%` : "-"} />
            )}
            {user.phone && <Row label="Phone" value={<a className="underline" href={`tel:${user.phone}`}>{user.phone}</a>} />}
            <Row
              label="Status"
              value={
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${
                    isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-700 border-gray-200"
                  }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
              }
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            {canManage && (
              <button
                className="text-sm px-3 py-1.5 rounded-lg border"
                onClick={() => setIsEditing(true)}
                disabled={savingId === user.id}
              >
                Edit
              </button>
            )}
            {isSelf && !canManage && (
              <div className="flex items-center gap-2">
                <button
                  className="text-sm px-3 py-1.5 rounded-lg border"
                  onClick={() => colorInputRef.current?.click()}
                  disabled={savingId === user.id}
                >
                  Change color
                </button>
                <input
                  ref={colorInputRef}
                  type="color"
                  className="hidden"
                  value={selfColor}
                  onChange={(e) => setSelfColor(e.target.value)}
                />
                <button
                  className="text-sm px-3 py-1.5 rounded-lg border"
                  onClick={handleSelfColorSave}
                  disabled={savingId === user.id || selfColor === themeColor}
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col transition-opacity duration-200">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: themeColor }}
              title={name}
            >
              {user.photo_url ? <img src={user.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" /> : (name || "?")[0]}
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate">{name}</div>
              <div className="text-xs text-gray-600 truncate">{user.email}</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 border-t pt-3">
            {isOwnerOrAdmin && (
              <>
                <label className="block text-sm">
                  <span className="text-gray-600">Role</span>
                  <select
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    disabled={targetRole === "owner" && !isOwner}
                  >
                    <option value="">-</option>
                    {isOwner && <option value="owner">owner</option>}
                    <option value="admin">admin</option>
                    <option value="appraiser">appraiser</option>
                    <option value="reviewer">reviewer</option>
                    <option value="manager">manager</option>
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="text-gray-600">Fee split (%)</span>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={form.fee_split}
                    onChange={(e) => setForm((f) => ({ ...f, fee_split: e.target.value }))}
                    disabled={targetRole === "owner" && !isOwner}
                  />
                </label>
              </>
            )}

            {isOwnerOrAdmin && (
              <label className="block text-sm">
                <span className="text-gray-600">Status</span>
                <select
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={form.status || ""}
                  onChange={(e) => {
                    const next = e.target.value || "inactive";
                    setForm((f) => ({ ...f, status: next, is_active: next === "active" }));
                  }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                {/* TODO: Add "Out of office" toggle here next to status when backend flag is ready. */}
              </label>
            )}

            <label className="block text-sm">
              <span className="text-gray-600">Color</span>
              <input
                type="color"
                className="mt-1 w-full border rounded-lg px-3 py-2 h-10"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              />
            </label>
          </div>

          <div className="flex items-center gap-2 pt-3">
            <button
              className="text-sm px-3 py-1.5 rounded-lg border"
              onClick={() => {
                setForm({
                  role: user.role || "",
                  fee_split: user.fee_split ?? "",
                  status: user.status || (user.is_active === false ? "inactive" : "active"),
                  is_active: user.is_active ?? true,
                  color: getUserColor(user),
                });
                setIsEditing(false);
              }}
              disabled={savingId === user.id}
            >
              Cancel
            </button>
            <button
              className="text-sm px-3 py-1.5 rounded-lg border bg-gray-900 text-white"
              onClick={handleSave}
              disabled={savingId === user.id}
            >
              Save
            </button>
            {isOwner && targetRole !== "owner" && (
              <button
                type="button"
                className="text-sm px-3 py-1.5 rounded-lg border border-red-300 text-red-700"
                onClick={() => {
                  const ok = window.confirm(
                    "This will permanently remove the user from the directory. Historical orders will not be rewritten. Continue?"
                  );
                  if (ok) onDelete(user.id);
                }}
                disabled={savingId === user.id}
              >
                Delete user
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsersIndex() {
  const [me, setMe] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [newOpen, setNewOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const prof = await getCurrentUserProfile();
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      const rows = data || [];
      const mergedMe = prof ? rows.find((u) => u.id === prof.id) || prof : prof;
      setMe(mergedMe || prof);
      setList(rows);
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

  async function deleteUser(id) {
    setSavingId(id);
    try {
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (error) throw error;
      await load();
    } finally {
      setSavingId(null);
    }
  }

  async function createUser(patch) {
    const { error } = await supabase.from("users").insert([patch]).select().single();
    if (error) throw error;
    await load();
  }

  const isOwnerOrAdmin = ["owner", "admin"].includes(String(me?.role || "").toLowerCase());

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <div className="flex items-center gap-2">
          {isOwnerOrAdmin && (
            <button className="px-3 py-1.5 rounded-lg border text-sm" onClick={() => setNewOpen(true)}>
              + New user
            </button>
          )}
          <button className="px-3 py-1.5 rounded-lg border text-sm" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : list.length === 0 ? (
        <div className="text-sm text-gray-500">No users found.</div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              currentUser={me}
              savingId={savingId}
              onSavePatch={saveUserPatch}
              onDelete={deleteUser}
            />
          ))}
        </div>
      )}

      <NewUserModal open={newOpen} onClose={() => setNewOpen(false)} onCreate={createUser} currentUser={me} />
    </div>
  );
}
