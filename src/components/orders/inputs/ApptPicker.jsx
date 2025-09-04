import React, { useMemo, useState, useEffect } from "react";

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1)); // "1".."12"
const MINUTES = ["00", "15", "30", "45"];
const AMPM = ["AM", "PM"];

function partsFromIso(iso) {
  if (!iso) {
    const d = new Date();
    const h = d.getHours();
    return {
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      hour: String(((h + 11) % 12) + 1),
      minute: MINUTES.reduce((best, m) => (Math.abs(parseInt(m) - d.getMinutes()) < Math.abs(parseInt(best) - d.getMinutes()) ? m : best), "00"),
      ampm: h >= 12 ? "PM" : "AM",
    };
  }
  const d = new Date(iso);
  const h24 = d.getHours();
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    hour: String(((h24 + 11) % 12) + 1),
    minute: String(d.getMinutes()).padStart(2, "0").replace(/^[0134]\d$/, (x) => (["00","15","30","45"].sort((a,b)=>Math.abs(+a-x)-Math.abs(+b-x))[0])),
    ampm: h24 >= 12 ? "PM" : "AM",
  };
}

function isoFromParts({ date, hour, minute, ampm }) {
  if (!date || !hour || !minute || !ampm) return null;
  const [y, m, d] = date.split("-").map(Number);
  let h = parseInt(hour, 10) % 12;
  if (ampm === "PM") h += 12;
  const mm = parseInt(minute, 10);
  const local = new Date(y, m - 1, d, h, mm, 0, 0);
  return isNaN(local) ? null : local.toISOString();
}

export default function ApptPicker({
  value,                // ISO string or null
  onSave,               // (iso) => void
  onCancel,             // () => void (optional)
  className = "",
}) {
  const initial = useMemo(() => partsFromIso(value), [value]);
  const [date, setDate] = useState(initial.date);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [ampm, setAmPm] = useState(initial.ampm);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // keep in sync if parent changes the value
    const p = partsFromIso(value);
    setDate(p.date); setHour(p.hour); setMinute(p.minute); setAmPm(p.ampm);
  }, [value]);

  async function handleSave() {
    const iso = isoFromParts({ date, hour, minute, ampm });
    if (!iso) return;
    try {
      setBusy(true);
      await onSave?.(iso);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <input
        type="date"
        className="w-full border rounded px-2 py-1 text-sm"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <select className="border rounded px-2 py-1 text-sm" value={hour} onChange={(e) => setHour(e.target.value)}>
          {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-sm">:</span>
        <select className="border rounded px-2 py-1 text-sm" value={minute} onChange={(e) => setMinute(e.target.value)}>
          {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="border rounded px-2 py-1 text-sm" value={ampm} onChange={(e) => setAmPm(e.target.value)}>
          {AMPM.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <button
          className="ml-auto px-3 py-1.5 rounded border text-sm hover:bg-slate-50 disabled:opacity-50"
          onClick={handleSave}
          disabled={busy || !date || !hour || !minute || !ampm}
        >
          Save
        </button>
        {onCancel && (
          <button
            className="px-2 py-1.5 rounded border text-xs hover:bg-slate-50 disabled:opacity-50"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
