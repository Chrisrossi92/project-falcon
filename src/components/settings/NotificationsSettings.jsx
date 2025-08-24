import React, { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { useSession } from "@/lib/hooks/useSession";

// Canonical event list for the matrix
const ROWS = [
  { key: "order_assigned",     label: "Assignments" },
  { key: "status_changed",     label: "Status changes" },
  { key: "site_visit_set",     label: "Site visit scheduled" },
  { key: "review_due_updated", label: "Review due updated" },
  { key: "client_due_updated", label: "Client due updated" },
  { key: "due_dates_updated",  label: "Any due dates updated" },
  { key: "self_actions",       label: "Notify me about my own actions", selfOnly: true }, // in-app only
];

const CHANNELS = ["in_app", "email"]; // self_actions will hide email

export default function NotificationsSettings() {
  const { user } = useSession();
  const [prefs, setPrefs] = useState({}); // map: `${type}:${channel}` -> {enabled, meta}
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dndStart, setDndStart] = useState(""); // "HH:MM"
  const [dndEnd, setDndEnd] = useState("");

  const userId = user?.id;

  async function load() {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("rpc_get_notification_prefs_v1", { p_user_id: userId });
      if (error) throw error;

      const map = {};
      (data || []).forEach((r) => {
        map[`${r.type}:${r.channel}`] = { enabled: r.enabled, meta: r.meta || null };
        if (r.type === "dnd" && r.channel === "in_app" && r.meta) {
          if (typeof r.meta.start === "string") setDndStart(r.meta.start);
          if (typeof r.meta.end === "string") setDndEnd(r.meta.end);
        }
      });

      // Ensure defaults present (in_app enabled, email disabled) except self_actions (in_app disabled)
      for (const row of ROWS) {
        for (const ch of CHANNELS) {
          if (row.selfOnly && ch === "email") continue;
          const k = `${row.key}:${ch}`;
          if (!map[k]) {
            map[k] = {
              enabled:
                row.key === "self_actions"
                  ? false // default OFF
                  : ch === "in_app",
              meta: null,
            };
          }
        }
      }

      // Ensure DND present (off by default)
      if (!map["dnd:in_app"]) {
        map["dnd:in_app"] = { enabled: false, meta: null };
      }

      setPrefs(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [userId]);

  async function savePref(type, channel, enabled, meta = null) {
    setSaving(true);
    try {
      const { error } = await supabase.rpc("rpc_set_notification_pref_v1", {
        p_user_id: userId,
        p_type: type,
        p_channel: channel,
        p_enabled: enabled,
        p_meta: meta,
      });
      if (error) throw error;
      setPrefs((prev) => ({ ...prev, [`${type}:${channel}`]: { enabled, meta } }));
    } catch (e) {
      console.error(e);
      alert("Failed to save preference.");
    } finally {
      setSaving(false);
    }
  }

  async function saveDnd() {
    const enabled = Boolean(dndStart && dndEnd);
    await savePref("dnd", "in_app", enabled, enabled ? { start: dndStart, end: dndEnd } : null);
  }

  const rows = useMemo(() => ROWS, []);

  if (loading) return <div className="p-4">Loading notification settings…</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Notifications</h2>

      {/* Matrix */}
      <div className="bg-white rounded-2xl shadow border">
        <div className="p-4 border-b text-sm text-gray-700">
          Choose where you get notified. Critical items may still be surfaced.
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Event</th>
                {CHANNELS.map((ch) => (
                  <th key={ch} className="py-2 pr-4 capitalize">{ch.replace("_"," ")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t">
                  <td className="py-2 pr-4">{r.label}</td>
                  {CHANNELS.map((ch) => {
                    if (r.selfOnly && ch === "email") {
                      return <td key={`${r.key}:${ch}`} className="py-2 pr-4 text-gray-300">—</td>;
                    }
                    const k = `${r.key}:${ch}`;
                    const on = !!prefs[k]?.enabled;
                    return (
                      <td key={k} className="py-2 pr-4">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={(e) => savePref(r.key, ch, e.target.checked)}
                            disabled={saving}
                          />
                          <span>{on ? "On" : "Off"}</span>
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DND window */}
      <div className="bg-white rounded-2xl shadow border p-4 space-y-3">
        <div className="font-medium">Do Not Disturb (in-app badge)</div>
        <div className="text-xs text-gray-500">
          During DND, you won’t be bothered with badges. Items still appear in the list.
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div>
            <div className="text-xs text-gray-500 mb-1">Start</div>
            <input type="time" value={dndStart} onChange={(e) => setDndStart(e.target.value)} className="border rounded px-2 py-1"/>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">End</div>
            <input type="time" value={dndEnd} onChange={(e) => setDndEnd(e.target.value)} className="border rounded px-2 py-1"/>
          </div>
          <button
            onClick={saveDnd}
            className="ml-2 px-3 py-2 border rounded-lg hover:bg-gray-50"
            disabled={saving}
          >
            Save DND
          </button>
        </div>
      </div>
    </div>
  );
}
