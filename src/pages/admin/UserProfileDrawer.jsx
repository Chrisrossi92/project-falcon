import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      {children}
    </label>
  );
}

export default function UserProfileDrawer({ meIsAdmin, user, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canEditAdminOnly = meIsAdmin;
  const canEditSelfPrefs = !meIsAdmin; // non-admin editing their own limited fields
  const isSelf = useMemo(() => {
    // if you pass current user id down, you can refine this; otherwise allow drawer when clicked from card
    return false;
  }, []);

  useEffect(() => {
    // start with known keys, but keep it flexible
    setForm({
      display_name: user.display_name ?? "",
      title: user.title ?? "",
      phone: user.phone ?? "",
      photo_url: user.photo_url ?? "",
      office_location: user.office_location ?? "",
      fee_split: user.fee_split ?? "",
      role: user.role ?? "",
      notification_prefs: user.notification_prefs ?? { center: {}, email: {} },
    });
  }, [user]);

  function update(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      // Build a patch with only fields you permit
      const patch = {};

      // Fields anyone (self) can edit:
      ["phone", "photo_url", "notification_prefs"].forEach((k) => {
        if (form[k] !== user[k]) patch[k] = form[k];
      });

      // Admin-only fields:
      if (canEditAdminOnly) {
        ["display_name", "title", "office_location", "fee_split", "role"].forEach((k) => {
          if (form[k] !== user[k]) patch[k] = form[k];
        });
      }

      if (Object.keys(patch).length === 0) {
        onClose?.();
        return;
      }

      const { error } = await supabase.from("users").update(patch).eq("id", user.id);
      if (error) throw error;
      onSaved?.();
    } catch (e) {
      setError(e.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Edit User</h2>
          <button className="text-sm underline" onClick={onClose}>Close</button>
        </div>

        <div className="space-y-3">
          <Field label="Display Name">
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={form.display_name}
              onChange={(e) => update("display_name", e.target.value)}
              disabled={!canEditAdminOnly}
            />
          </Field>

          <Field label="Title">
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              disabled={!canEditAdminOnly}
            />
          </Field>

          <Field label="Phone">
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </Field>

          <Field label="Photo URL">
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={form.photo_url}
              onChange={(e) => update("photo_url", e.target.value)}
            />
          </Field>

          <Field label="Office Location">
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={form.office_location}
              onChange={(e) => update("office_location", e.target.value)}
              disabled={!canEditAdminOnly}
            />
          </Field>

          <Field label="Fee Split (%)">
            <input
              type="number"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2"
              value={form.fee_split}
              onChange={(e) => update("fee_split", e.target.value === "" ? "" : Number(e.target.value))}
              disabled={!canEditAdminOnly}
            />
          </Field>

          <Field label="Role">
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              disabled={!canEditAdminOnly}
            >
              <option value="">—</option>
              <option value="admin">admin</option>
              <option value="appraiser">appraiser</option>
              <option value="reviewer">reviewer</option>
            </select>
          </Field>

          <div className="rounded-xl border p-3">
            <div className="text-sm font-medium mb-2">Notification Preferences</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!form.notification_prefs?.center?.["order.assigned"]}
                  onChange={(e) =>
                    update("notification_prefs", {
                      ...form.notification_prefs,
                      center: {
                        ...(form.notification_prefs?.center || {}),
                        "order.assigned": e.target.checked,
                      },
                    })
                  }
                />
                Center: order.assigned
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!form.notification_prefs?.email?.["order.assigned"]}
                  onChange={(e) =>
                    update("notification_prefs", {
                      ...form.notification_prefs,
                      email: {
                        ...(form.notification_prefs?.email || {}),
                        "order.assigned": e.target.checked,
                      },
                    })
                  }
                />
                Email: order.assigned
              </label>
              {/* Add more toggles here if you want */}
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button className="px-4 py-2 rounded-lg border" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
