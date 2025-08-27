// src/components/settings/NotificationPrefsCard.jsx
import React, { useMemo, useState } from "react";
import {
  useNotificationPrefs,
} from "@/features/notifications/hooks";
import {
  markAllRead,
} from "@/features/notifications/api";
import { Button } from "@/components/ui/button";

/** Utility: ISO for "now + N minutes" */
function isoPlusMinutes(n) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + n);
  return d.toISOString();
}

/** Utility: ISO for "tomorrow at 8:00 AM local" */
function isoTomorrowAt(hour = 8, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** Compact switch */
function Toggle({ label, checked, onChange, disabled }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="h-4 w-4"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span>{label}</span>
    </label>
  );
}

/** Chips for category toggles */
function CategoryChip({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded-full text-xs border ${
        active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

export default function NotificationPrefsCard() {
  const {
    prefs,
    loading,
    err,
    refresh,
    save,
    isDndActive,
    isSnoozed,
  } = useNotificationPrefs();

  const [saving, setSaving] = useState(false);
  const categories = useMemo(() => {
    // Default set you can expand
    const defaults = { assignments: true, reminders: true, messages: true };
    // Merge any existing keys from prefs.categories
    const existing = (prefs?.categories && typeof prefs.categories === "object") ? prefs.categories : {};
    return { ...defaults, ...existing };
  }, [prefs?.categories]);

  const [localCats, setLocalCats] = useState(categories);

  // derive quick flags
  const dndFlag = prefs?.dnd_until ? new Date(prefs.dnd_until).getTime() > Date.now() : false;
  const snoozeFlag = prefs?.snooze_until ? new Date(prefs.snooze_until).getTime() > Date.now() : false;

  function toggleCategory(key) {
    setLocalCats((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function saveCategories() {
    setSaving(true);
    try {
      await save({ categories: localCats });
    } finally {
      setSaving(false);
    }
  }

  async function toggleEmail(val) {
    await save({ email_enabled: !!val });
  }

  async function togglePush(val) {
    await save({ push_enabled: !!val });
  }

  async function doSnooze(minutes) {
    await save({ snooze_until: isoPlusMinutes(minutes) });
    await refresh();
  }

  async function clearSnooze() {
    await save({ snooze_until: null });
    await refresh();
  }

  async function doDndTomorrow8() {
    await save({ dnd_until: isoTomorrowAt(8, 0) });
    await refresh();
  }

  async function clearDnd() {
    await save({ dnd_until: null });
    await refresh();
  }

  async function onMarkAllRead() {
    await markAllRead();
  }

  if (loading) {
    return (
      <div className="border rounded-xl p-4 bg-white">
        <div className="flex items-center gap-3 text-gray-600">
          <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
          <span className="text-sm">Loading notification preferences…</span>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="border rounded-xl p-4 bg-white">
        <div className="text-sm text-red-600">Failed to load: {String(err)}</div>
      </div>
    );
  }

  return (
    <div className="border rounded-xl p-4 bg-white space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Notifications</h2>
        <Button variant="outline" onClick={onMarkAllRead}>
          Mark all read
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Delivery */}
        <div>
          <h3 className="text-sm font-medium text-gray-800 mb-2">Delivery Channels</h3>
          <div className="space-y-2">
            <Toggle
              label="Email alerts"
              checked={!!prefs?.email_enabled}
              onChange={toggleEmail}
            />
            <Toggle
              label="Push/browser alerts"
              checked={!!prefs?.push_enabled}
              onChange={togglePush}
            />
          </div>
        </div>

        {/* Categories */}
        <div>
          <h3 className="text-sm font-medium text-gray-800 mb-2">Categories</h3>
          <div className="flex flex-wrap gap-2">
            {Object.keys(localCats).map((k) => (
              <CategoryChip
                key={k}
                label={k}
                active={!!localCats[k]}
                onClick={() => toggleCategory(k)}
              />
            ))}
          </div>
          <div className="mt-3">
            <Button variant="outline" onClick={saveCategories} disabled={saving}>
              {saving ? "Saving…" : "Save Categories"}
            </Button>
          </div>
        </div>

        {/* Snooze / DND */}
        <div>
          <h3 className="text-sm font-medium text-gray-800 mb-2">Snooze & DND</h3>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-600 mb-1">
                Snooze (temporary mute)
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => doSnooze(60)}>1h</Button>
                <Button variant="outline" onClick={() => doSnooze(240)}>4h</Button>
                <Button variant="outline" onClick={() => doSnooze(1440)}>1d</Button>
                <Button variant="outline" onClick={clearSnooze} disabled={!snoozeFlag}>
                  Clear Snooze
                </Button>
              </div>
              {snoozeFlag && (
                <div className="text-[11px] text-gray-500 mt-1">
                  Snoozed until {new Date(prefs?.snooze_until).toLocaleString()}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs text-gray-600 mb-1">
                Do Not Disturb (DND)
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={doDndTomorrow8}>
                  Until tomorrow 8:00 AM
                </Button>
                <Button variant="outline" onClick={clearDnd} disabled={!dndFlag}>
                  Clear DND
                </Button>
              </div>
              {dndFlag && (
                <div className="text-[11px] text-gray-500 mt-1">
                  DND until {new Date(prefs?.dnd_until).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Tip: categories control which alerts reach you. Snooze temporarily mutes everything; DND is for scheduled quiet hours.
      </p>
    </div>
  );
}
