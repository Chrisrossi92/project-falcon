





// src/components/orders/view/AppointmentCell.jsx
import React, { useState } from "react";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

export default function AppointmentCell({ siteVisitAt, onSetAppointment, compact = true }) {
  const [isEditing, setIsEditing] = useState(false);
  const initial = siteVisitAt ? new Date(siteVisitAt) : new Date();
  const [date, setDate] = useState(initial);
  const [hour, setHour] = useState(initial.getHours() % 12 || 12);
  const [minute, setMinute] = useState(Math.round(initial.getMinutes() / 15) * 15);
  const [ampm, setAmPm] = useState(initial.getHours() >= 12 ? "PM" : "AM");

  const handleSave = () => {
    const h24 = ampm === "PM" ? (hour % 12) + 12 : hour % 12;
    const updated = new Date(date);
    updated.setHours(h24);
    updated.setMinutes(parseInt(minute));
    updated.setSeconds(0);
    onSetAppointment?.(updated.toISOString());
    setIsEditing(false);
  };

  return (
    <div className="relative inline-flex items-center gap-2">
      {siteVisitAt ? (
        <>
          <span className="text-sm text-gray-800">
            {format(new Date(siteVisitAt), "MMM d, yyyy • h:mm a")}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
            aria-label="Edit appointment"
            title="Edit appointment"
          >
            <Pencil size={14} />
          </button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
        >
          Set Appointment
        </Button>
      )}

      {isEditing && (
        <div
          className="absolute right-0 top-8 z-[9999] w-[280px] rounded-md border border-gray-200 bg-white p-3 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 text-xs font-semibold text-gray-600">Pick a date</div>
          <DatePicker
            selected={date}
            onChange={(d) => setDate(d)}
            dateFormat="MMMM d, yyyy"
            className="w-full rounded-md border px-3 py-2 text-sm shadow-sm"
            popperPlacement="bottom-start"
            withPortal
            showPopperArrow={false}
          />

          <div className="mt-2 flex items-center gap-2 text-sm">
            <select className="rounded-md border px-2 py-1" value={hour} onChange={(e) => setHour(parseInt(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h}>{h}</option>)}
            </select>
            :
            <select className="rounded-md border px-2 py-1" value={String(minute).padStart(2, "0")} onChange={(e) => setMinute(parseInt(e.target.value))}>
              {["00","15","30","45"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select className="rounded-md border px-2 py-1" value={ampm} onChange={(e) => setAmPm(e.target.value)}>
              {["AM","PM"].map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>

          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleSave}>✅ Update Appointment</Button>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
