import React, { useMemo, useState, useEffect, useRef } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

const formatDisplay = (iso) => {
  if (!iso) return "Set Appointment";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Set Appointment";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

export default function SiteVisitPicker({ value, onChange, onSave, disabled }) {
  const initialDate = useMemo(() => {
    const d = value ? new Date(value) : new Date();
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(() => {
    const h = initialDate.getHours().toString().padStart(2, "0");
    const m = initialDate.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  });

  const popoverRef = useRef(null);

  useEffect(() => {
    const d = value ? new Date(value) : new Date();
    if (!Number.isNaN(d.getTime())) {
      setDate(d);
      setTime(`${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSave = () => {
    const [hh, mm] = time.split(":").map((t) => parseInt(t || "0", 10));
    const merged = new Date(date);
    merged.setHours(Number.isFinite(hh) ? hh : 0);
    merged.setMinutes(Number.isFinite(mm) ? mm : 0);
    merged.setSeconds(0);
    merged.setMilliseconds(0);
    const iso = merged.toISOString();
    onChange?.(iso);
    onSave?.(iso);
    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="text-sm"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        {formatDisplay(value)}
      </Button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute z-50 mt-2 w-[280px] rounded-lg border bg-white shadow-xl p-3"
          style={{ right: 0 }}
        >
          <div className="text-xs font-semibold text-gray-600 mb-2">Site Visit</div>
          <Calendar
            onChange={(d) => d && setDate(d)}
            value={date}
            selectRange={false}
            className="w-full [&_.react-calendar]:w-full [&_.react-calendar__tile]:py-1 [&_.react-calendar__navigation__label]:text-sm"
          />
          <div className="mt-3">
            <div className="text-xs text-gray-600 mb-1">Time</div>
            <input
              type="time"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
