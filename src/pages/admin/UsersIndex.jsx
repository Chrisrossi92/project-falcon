import { useEffect, useRef, useState } from "react";
import { listUsers, setUserRole, setUserActive, updateUserProfile, createUserRecord } from "@/lib/services/usersService";
import { getCurrentUserProfile } from "@/lib/services/api";
import toast from "react-hot-toast";

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
    split_pct: 50,
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
        fee_split: form.split_pct === "" ? null : Number(form.split_pct),
        phone: form.phone || null,
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
        split_pct: 50,
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
                value={form.split_pct}
                onChange={handleChange("split_pct")}
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
    display_name: user.display_name || user.full_name || user.name || "",
    role: user.role || "",
    split_pct: user.fee_split ?? "",
    is_active: user.is_active ?? true,
    color: getUserColor(user),
  });
  const [selfColor, setSelfColor] = useState(getUserColor(user));
  const colorInputRef = useRef(null);

  useEffect(() => {
    setForm({
      display_name: user.display_name || user.full_name || user.name || "",
      role: user.role || "",
      split_pct: user.fee_split ?? "",
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
      display_name: form.display_name || name,
      color: form.color,
      display_color: form.color,
    };

    const roleChanged = (form.role || "").toLowerCase() !== targetRole;

    if (isOwnerOrAdmin) {
      if (!(targetRole === "owner" && !isOwner)) {
        if (roleChanged) payload.role = form.role || null;
        const pctVal = form.split_pct === "" ? null : Number(form.split_pct);
        payload.fee_split = pctVal;
      }
      payload.status = form.is_active ? "active" : "inactive";
      payload.is_active = form.is_active;
    } else if (roleChanged) {
      // Non-owners shouldn't change roles; warn but continue with other fields
      // eslint-disable-next-line no-console
      console.warn("Only the owner can change roles");
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
            {isOwnerOrAdmin && (
              <Row
                label="Fee split"
                value={user.fee_split != null ? `${Number(user.fee_split).toFixed(2)}%` : "-"}
              />
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
            <label className="block text-sm">
              <span className="text-gray-600">Display name</span>
              <input
                type="text"
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              />
            </label>

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
                    value={form.split_pct}
                    onChange={(e) => setForm((f) => ({ ...f, split_pct: e.target.value }))}
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
                  value={form.is_active ? "active" : "inactive"}
                  onChange={(e) => {
                    const next = e.target.value || "inactive";
                    setForm((f) => ({ ...f, is_active: next === "active" }));
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
                  display_name: user.display_name || user.full_name || user.name || "",
                  role: user.role || "",
                  split_pct: user.fee_split ?? "",
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
                    "This will deactivate the user in the directory (no hard delete). Historical orders will not be rewritten. Continue?"
                  );
                  if (ok) onDelete(user.id);
                }}
                disabled={savingId === user.id}
              >
                Deactivate user
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
  const [showInactive, setShowInactive] = useState(false);

  const isOwnerOrAdmin = ["owner", "admin"].includes(String(me?.role || "").toLowerCase());


  async function load(includeInactiveParam) {
    const includeInactive = isOwnerOrAdmin ? !!(includeInactiveParam ?? showInactive) : false;
    setLoading(true);
    try {
      const prof = await getCurrentUserProfile();
      const rows = await listUsers({ includeInactive });
      const mergedMe = prof ? rows.find((u) => u.id === prof.id) || prof : prof;
      setMe(mergedMe || prof);
      setList(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [showInactive, isOwnerOrAdmin]);

  async function saveUserPatch(id, patch) {
    setSavingId(id);
    try {
      const isOwner = String(me?.role || "").toLowerCase() === "owner";
      if (patch.role !== undefined) {
        if (!isOwner) {
          console.warn("Only owner can change roles");
        } else {
          await setUserRole(id, patch.role);
        }
      }

      const profilePatch = {};
      const copyKeys = [
        "display_name",
        "full_name",
        "name",
        "color",
        "display_color",
        "avatar_url",
        "fee_split",
        "is_active",
        "status",
      ];
      copyKeys.forEach((k) => {
        if (patch[k] !== undefined) profilePatch[k] = patch[k];
      });
      if (Object.keys(profilePatch).length > 0) {
        await updateUserProfile(id, profilePatch);
      }

      await load();
    } finally {
      setSavingId(null);
    }
  }

  async function deleteUser(id) {
    setSavingId(id);
    try {
      await setUserActive(id, false);
      await load();
    } finally {
      setSavingId(null);
    }
  }

  async function createUser(patch) {
    try {
      const row = await createUserRecord(patch);
      toast.success("User created");
      await load();
    } catch (e) {
      if (e?.code === "23505" || (e?.message || "").toLowerCase().includes("duplicate")) {
        toast.error("Email already exists");
      } else {
        toast.error(e?.message || "Failed to create user");
      }
      throw e;
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <div className="flex items-center gap-3">
          {isOwnerOrAdmin && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Show inactive
            </label>
          )}
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
