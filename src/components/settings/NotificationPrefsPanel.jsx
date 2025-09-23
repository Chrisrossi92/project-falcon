import React, { useEffect, useMemo, useState } from "react";
import {
  getCurrentUserProfile,
  rpcGetNotificationPolicies,
  rpcSetNotificationPolicy,
  updateMyNotificationPrefs,
} from "@/lib/services/api";

// Canonical event keys
const EVENT_KEYS = [
  "order.assigned",
  "order.status_changed",
  "order.appointment_updated",
  "order.due_updated",
];

// Friendly labels for UI
const LABELS = {
  "order.assigned": "Order Assigned",
  "order.status_changed": "Order Status Changed",
  "order.appointment_updated": "Site Visit / Appointment Updated",
  "order.due_updated": "Review/Final Due Updated",
};

function Switch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className={`px-3 py-1 rounded-full border text-sm transition ${
        checked ? "bg-emerald-600 border-emerald-600 text-white" : "bg-gray-100 border-gray-300 text-gray-800"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {checked ? "On" : "Off"}
    </button>
  );
}

/**
 * NotificationPrefsPanel
 * Props:
 *  - showAdminSections: boolean (render company defaults + locks)
 *  - showTitle: boolean (render H1 when used as a full page)
 */
export default function NotificationPrefsPanel({ showAdminSections = false, showTitle = false }) {
  const [me, setMe] = useState(null);
  const [policies, setPolicies] = useState([]);                 // admin-only policy rows
  const [userPrefs, setUserPrefs] = useState({ center: {}, email: {} });
  const [locks, setLocks] = useState({ email_required: [] });

  const isAdmin = showAdminSections || me?.role === "admin";

  useEffect(() => {
    (async () => {
      const prof = await getCurrentUserProfile();
      setMe(prof);
      setUserPrefs(prof?.notification_prefs ?? { center: {}, email: {} });

      if (isAdmin) {
        const p = await rpcGetNotificationPolicies();
        setPolicies(p || []);
        const lockRow = (p || []).find((r) => r.key === "locks.appraiser");
        setLocks(lockRow?.rules ?? { email_required: [] });
      }
    })();
  }, [isAdmin]);

  const adminDefaults = useMemo(() => {
    const row = policies.find((p) => p.key === "defaults.admin");
    return (
      row?.rules ?? {
        center: { "*": true },
        email: { "*": false, "order.assigned": true },
      }
    );
  }, [policies]);

  const appraiserDefaults = useMemo(() => {
    const row = policies.find((p) => p.key === "defaults.appraiser");
    return (
      row?.rules ?? {
        center: { "order.assigned": true, "order.status_changed": true },
        email: { "order.assigned": true },
      }
    );
  }, [policies]);

  function toggleUserPref(channel, key) {
    setUserPrefs((prev) => {
      const next = { ...prev, [channel]: { ...(prev[channel] || {}) } };
      next[channel][key] = !next[channel][key];
      return next;
    });
  }

  async function saveUserPrefs() {
    await updateMyNotificationPrefs(userPrefs);
    alert("Saved your preferences.");
  }

  async function saveAdminDefaults(which, rules) {
    await rpcSetNotificationPolicy(which, rules);
    const p = await rpcGetNotificationPolicies();
    setPolicies(p || []);
    alert("Saved company defaults.");
  }

  async function toggleLock(eventKey) {
    const next = { ...locks };
    const set = new Set(next.email_required || []);
    set.has(eventKey) ? set.delete(eventKey) : set.add(eventKey);
    next.email_required = Array.from(set);
    await rpcSetNotificationPolicy("locks.appraiser", next);
    const p = await rpcGetNotificationPolicies();
    setPolicies(p || []);
    const lockRow = (p || []).find((r) => r.key === "locks.appraiser");
    setLocks(lockRow?.rules ?? { email_required: [] });
    alert("Updated lock policy.");
  }

  return (
    <div className="space-y-6">
      {showTitle && <h1 className="text-2xl font-semibold">Notification Settings</h1>}

      {isAdmin && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Company Defaults (Admin)</h2>

          {/* Admin defaults */}
          <div className="border rounded-xl p-4">
            <h3 className="font-medium mb-2">Admin Defaults</h3>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">Event</th>
                  <th>Center</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {EVENT_KEYS.map((key) => (
                  <tr key={key} className="border-t">
                    <td className="py-2">{LABELS[key]}</td>
                    <td className="text-center">
                      <Switch
                        checked={!!adminDefaults.center?.[key] || adminDefaults.center?.["*"] === true}
                        onChange={(val) => {
                          const rules = JSON.parse(JSON.stringify(adminDefaults));
                          rules.center = rules.center || {};
                          rules.center[key] = val;
                          saveAdminDefaults("defaults.admin", rules);
                        }}
                      />
                    </td>
                    <td className="text-center">
                      <Switch
                        checked={!!adminDefaults.email?.[key]}
                        onChange={(val) => {
                          const rules = JSON.parse(JSON.stringify(adminDefaults));
                          rules.email = rules.email || {};
                          rules.email[key] = val;
                          saveAdminDefaults("defaults.admin", rules);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Appraiser defaults */}
          <div className="border rounded-xl p-4">
            <h3 className="font-medium mb-2">Appraiser Defaults</h3>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">Event</th>
                  <th>Center</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {EVENT_KEYS.map((key) => (
                  <tr key={key} className="border-t">
                    <td className="py-2">{LABELS[key]}</td>
                    <td className="text-center">
                      <Switch
                        checked={!!appraiserDefaults.center?.[key]}
                        onChange={(val) => {
                          const rules = JSON.parse(JSON.stringify(appraiserDefaults));
                          rules.center = rules.center || {};
                          rules.center[key] = val;
                          saveAdminDefaults("defaults.appraiser", rules);
                        }}
                      />
                    </td>
                    <td className="text-center">
                      <Switch
                        checked={!!appraiserDefaults.email?.[key]}
                        onChange={(val) => {
                          const rules = JSON.parse(JSON.stringify(appraiserDefaults));
                          rules.email = rules.email || {};
                          rules.email[key] = val;
                          saveAdminDefaults("defaults.appraiser", rules);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Locks */}
          <div className="border rounded-xl p-4">
            <h3 className="font-medium mb-2">Locked Emails for Appraisers (Company Policy)</h3>
            <p className="text-sm text-gray-600 mb-3">
              These events will always email appraisers (cannot be turned off by the appraiser).
              Default includes <strong>Order Assigned</strong>.
            </p>
            <ul className="space-y-2">
              {EVENT_KEYS.map((key) => {
                const forced = (locks.email_required || []).includes(key);
                return (
                  <li key={key} className="flex items-center justify-between">
                    <span>{LABELS[key]}</span>
                    <Switch checked={forced} onChange={() => toggleLock(key)} />
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* My preferences */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">My Preferences</h2>
        <div className="border rounded-xl p-4">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Event</th>
                <th>Center</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {EVENT_KEYS.map((key) => {
                const locked = !isAdmin && (locks.email_required || []).includes(key);
                return (
                  <tr key={key} className="border-t">
                    <td className="py-2">{LABELS[key]}</td>
                    <td className="text-center">
                      <Switch
                        checked={!!userPrefs.center?.[key]}
                        onChange={() => toggleUserPref("center", key)}
                      />
                    </td>
                    <td className="text-center">
                      <Switch
                        checked={!!userPrefs.email?.[key]}
                        onChange={() => !locked && toggleUserPref("email", key)}
                        disabled={locked}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4">
            <button onClick={saveUserPrefs} className="px-4 py-2 rounded-lg bg-black text-white">
              Save My Preferences
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
