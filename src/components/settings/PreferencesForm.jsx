// src/components/settings/PreferencesForm.jsx
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/Errors";
import { LoadingState } from "@/components/ui/Loaders";
import { useSession } from "@/lib/hooks/useSession";
import { fetchMyProfileAndSettings, saveSettings } from "@/lib/api/users";
import { toast } from "react-hot-toast";

const CAL_VIEWS = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "2w", label: "Two Weeks" },
];

export default function PreferencesForm() {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [prefs, setPrefs] = useState({ default_calendar_view: "month" });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        if (!user?.id) return;
        const data = await fetchMyProfileAndSettings(user.id);
        if (!mounted) return;
        const p = (data.preferences || {});
        setPrefs({
          default_calendar_view: p.default_calendar_view || "month",
        });
      } catch (e) {
        setErr(e.message || "Failed to load preferences.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user?.id]);

  const onSave = async (e) => {
    e.preventDefault();
    try {
      if (!user?.id) return;
      await saveSettings({
        userId: user.id,
        preferences: prefs,
      });
      toast.success("Preferences saved");
    } catch (e) {
      toast.error(e.message || "Save failed");
    }
  };

  if (loading) return <LoadingState label="Loading preferences…" />;
  if (err) return <ErrorState message={err} />;

  return (
    <form onSubmit={onSave} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-500">
          Default calendar view
        </label>
        <select
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          value={prefs.default_calendar_view}
          onChange={(e) =>
            setPrefs((s) => ({ ...s, default_calendar_view: e.target.value }))
          }
        >
          {CAL_VIEWS.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </div>
      <div className="pt-2">
        <Button type="submit">Save Preferences</Button>
      </div>
    </form>
  );
}



