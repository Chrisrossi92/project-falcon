import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  rpcGetCurrentUserNotificationPreferences,
  rpcGetNotificationPolicyLocks,
  rpcUpdateCurrentUserNotificationPreference,
  rpcUpdateNotificationPolicyLock,
} from "@/lib/services/api";
import {
  NOTIFICATION_SETTINGS_EVENTS,
} from "@/features/notifications/notificationEvents";

const EVENT_KEYS = NOTIFICATION_SETTINGS_EVENTS.map((event) => event.key);
const LABELS = Object.fromEntries(
  NOTIFICATION_SETTINGS_EVENTS.map((event) => [event.key, event.label])
);
const CHANNELS = [
  { key: "in_app", label: "In-app" },
  { key: "email", label: "Email" },
];

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
  const [effectivePrefs, setEffectivePrefs] = useState([]);
  const [appraiserLocks, setAppraiserLocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = showAdminSections;

  const loadEffectivePrefs = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await rpcGetCurrentUserNotificationPreferences();
      setEffectivePrefs(rows || []);
      if (isAdmin) {
        const lockRows = await rpcGetNotificationPolicyLocks({ role: "appraiser" });
        setAppraiserLocks(lockRows || []);
      }
    } catch (error) {
      toast.error(error?.message || "Could not load notification preferences");
      setEffectivePrefs([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadEffectivePrefs();
  }, [loadEffectivePrefs]);

  const prefByEventChannel = useMemo(() => {
    const map = new Map();
    for (const pref of effectivePrefs) {
      map.set(`${pref.event_key}:${pref.channel}`, pref);
    }
    return map;
  }, [effectivePrefs]);

  const appraiserLockByEventChannel = useMemo(() => {
    const map = new Map();
    for (const lock of appraiserLocks) {
      map.set(`${lock.event_key}:${lock.channel}`, lock);
    }
    return map;
  }, [appraiserLocks]);

  async function toggleUserPref(eventKey, channel, currentValue) {
    try {
      const next = await rpcUpdateCurrentUserNotificationPreference({
        eventKey,
        channel,
        enabled: !currentValue,
      });
      setEffectivePrefs((prev) => prev.map((pref) => (
        pref.event_key === eventKey && pref.channel === channel
          ? { ...pref, ...(next || {}), effective_enabled: next?.effective_enabled ?? !currentValue }
          : pref
      )));
      toast.success("Preferences saved");
    } catch (error) {
      toast.error(error?.message || "Could not save preferences");
      await loadEffectivePrefs();
    }
  }

  async function toggleAppraiserEmailLock(eventKey, currentLocked) {
    try {
      await rpcUpdateNotificationPolicyLock({
        eventKey,
        channel: "email",
        locked: !currentLocked,
        role: "appraiser",
        lockReason: "Required by company policy.",
      });
      await loadEffectivePrefs();
      toast.success("Lock policy updated");
    } catch (error) {
      toast.error(error?.message || "Could not update lock policy");
    }
  }

  return (
    <div className="space-y-6">
      {showTitle && <h1 className="text-2xl font-semibold">Notification Settings</h1>}

      {isAdmin && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Company Notification Locks</h2>
          <div className="border rounded-xl p-4">
            <h3 className="font-medium mb-2">Locked Emails for Appraisers (Company Policy)</h3>
            <p className="text-sm text-gray-600 mb-3">
              Locked events cannot be disabled by appraisers. Policy changes are applied by the backend and reflected in each user's effective preferences.
            </p>
            <ul className="space-y-2">
              {EVENT_KEYS.map((key) => {
                const emailPref = prefByEventChannel.get(`${key}:email`);
                const lockPref = appraiserLockByEventChannel.get(`${key}:email`);
                const forced = !!lockPref?.locked || !!emailPref?.locked;
                return (
                  <li key={key} className="flex items-center justify-between">
                    <span>{LABELS[key]}</span>
                    <Switch checked={forced} onChange={() => toggleAppraiserEmailLock(key, forced)} />
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
          {loading && (
            <div className="py-3 text-sm text-gray-600">Loading notification preferences...</div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Event</th>
                {CHANNELS.map((channel) => (
                  <th key={channel.key}>{channel.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EVENT_KEYS.map((key) => {
                return (
                  <tr key={key} className="border-t">
                    <td className="py-2">{LABELS[key]}</td>
                    {CHANNELS.map((channel) => {
                      const pref = prefByEventChannel.get(`${key}:${channel.key}`);
                      return (
                        <td key={channel.key} className="text-center">
                          <Switch
                            checked={!!pref?.effective_enabled}
                            onChange={() => toggleUserPref(key, channel.key, !!pref?.effective_enabled)}
                            disabled={loading || !!pref?.locked}
                          />
                          {pref?.locked && (
                            <div className="mt-1 text-xs text-gray-500">
                              Locked
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
