// src/pages/Settings.jsx
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSession } from "@/lib/hooks/useSession";
import { getNotificationPrefs, updateNotificationPrefs } from "@/features/notifications/api";
import { setUserColor } from "@/lib/services/usersService";

export default function Settings() {
  const { user } = useSession();
  const [prefs, setPrefs] = useState({ dnd: false, dnd_until: null, snooze_until: null });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [color, setColor] = useState("");

  useEffect(() => {
    (async () => {
      const p = (await getNotificationPrefs()) || {};
      setPrefs({
        dnd: !!p.dnd,
        dnd_until: p.dnd_until || null,
        snooze_until: p.snooze_until || null,
      });
    })();
  }, []);

  async function savePrefs() {
    setSavingPrefs(true);
    try {
      const patch = {
        dnd: !!prefs.dnd,
        dnd_until: prefs.dnd_until || null,
        snooze_until: prefs.snooze_until || null,
      };
      await updateNotificationPrefs(patch);
      toast.success("Preferences saved");
    } catch (e) {
      toast.error(e?.message || "Failed to save preferences");
    } finally {
      setSavingPrefs(false);
    }
  }

  async function saveColor() {
    try {
      await setUserColor(user?.id || user?.user_id || user?.auth_id || user?.uid, color || null);
      toast.success("Color saved");
    } catch (e) {
      toast.error(e?.message || "Failed to save color");
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-gray-600">Notification preferences and profile color.</p>
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-3">
        <div className="text-sm font-medium">Notifications</div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!prefs.dnd}
            onChange={(e) => setPrefs((p) => ({ ...p, dnd: e.target.checked }))}
          />
          Do Not Disturb
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm">
            <div className="text-xs text-gray-500 mb-1">DND Until (ISO or empty)</div>
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="2025-09-01T17:00:00Z"
              value={prefs.dnd_until || ""}
              onChange={(e) => setPrefs((p) => ({ ...p, dnd_until: e.target.value || null }))}
            />
          </label>
          <label className="text-sm">
            <div className="text-xs text-gray-500 mb-1">Snooze Until (ISO or empty)</div>
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="2025-09-01T12:00:00Z"
              value={prefs.snooze_until || ""}
              onChange={(e) => setPrefs((p) => ({ ...p, snooze_until: e.target.value || null }))}
            />
          </label>
        </div>

        <div>
          <button
            className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50 disabled:opacity-50"
            disabled={savingPrefs}
            onClick={savePrefs}
          >
            {savingPrefs ? "Saving…" : "Save Preferences"}
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-3">
        <div className="text-sm font-medium">Profile Color</div>
        <div className="flex items-center gap-2">
          <input
            className="w-32 rounded border px-3 py-2 text-sm"
            placeholder="#A3E635"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <div className="h-6 w-6 rounded border" style={{ background: color || "#fff" }} />
          <button
            className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
            onClick={saveColor}
          >
            Save Color
          </button>
        </div>
        <div className="text-xs text-gray-500">Tip: paste a hex like <code>#A3E635</code>.</div>
      </div>
    </div>
  );
}




