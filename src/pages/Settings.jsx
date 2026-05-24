import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getNotificationPrefs, updateNotificationPrefs } from "@/features/notifications/api";
import { settingsPageUtilityLinks } from "@/lib/navigation/currentSettingsUtilityLinks";
import { getCurrentUserSettings, updateCurrentUserSettings } from "@/features/user-settings/api";

// theme helpers
const THEME_KEY = "falcon.theme";
function applyTheme(theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  const effective = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
  if (effective === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export default function Settings() {
  const [prefs, setPrefs] = useState({ dnd: false, dnd_until: null, snooze_until: null });
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [color, setColor] = useState("");
  const [savingColor, setSavingColor] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "system");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = (await getNotificationPrefs()) || {};
      if (cancelled) return;
      setPrefs({
        dnd: !!p.dnd,
        dnd_until: p.dnd_until || null,
        snooze_until: p.snooze_until || null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await getCurrentUserSettings();
        if (!cancelled) {
          setColor(settings?.display_color || settings?.color || "");
        }
      } catch {
        if (!cancelled) setColor("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => applyTheme("system");
      mq.addEventListener?.("change", listener);
      return () => mq.removeEventListener?.("change", listener);
    }
  }, [theme]);

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
    setSavingColor(true);
    try {
      const settings = await updateCurrentUserSettings({ display_color: color || null });
      setColor(settings?.display_color || settings?.color || "");
      toast.success("Color saved");
    } catch (e) {
      const message = String(e?.message || "");
      if (message.includes("invalid_profile_color")) {
        toast.error("Use a valid hex color like #3366FF.");
      } else if (
        message.includes("permission")
        || message.includes("not authorized")
        || message.includes("app_user_not_found")
        || e?.code === "42501"
      ) {
        toast.error("Falcon could not update your profile settings.");
      } else {
        toast.error("Falcon could not save your settings.");
      }
    } finally {
      setSavingColor(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Account Settings</h1>
          <p className="text-sm text-gray-600">
            Personal theme, notification pause, and profile preferences.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {settingsPageUtilityLinks.map((link) => (
            <Link
              key={link.id}
              to={link.path}
              className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50"
              title={`Open ${link.label.replace(/\s+→$/, '')}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <div className="text-sm font-medium">Theme</div>
        <div className="flex items-center gap-3">
          {["light", "dark", "system"].map((t) => (
            <label key={t} className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="theme"
                value={t}
                checked={theme === t}
                onChange={(e) => setTheme(e.target.value)}
              />
              {t === "light" ? "Light" : t === "dark" ? "Dark" : "System"}
            </label>
          ))}
        </div>
        <div className="text-xs text-gray-500">
          System follows your OS. We remember your choice for future sessions.
        </div>
      </div>

      {/* DND / Snooze */}
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

      {/* Profile color */}
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
            className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50 disabled:opacity-50"
            disabled={savingColor}
            onClick={saveColor}
          >
            {savingColor ? "Saving…" : "Save Color"}
          </button>
        </div>
      </div>
    </div>
  );
}


