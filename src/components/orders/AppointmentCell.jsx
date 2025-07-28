import { useState } from "react";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function AppointmentCell({ siteVisitAt, onSetAppointment }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const initial = siteVisitAt ? new Date(siteVisitAt) : new Date();
  const [date, setDate] = useState(initial);
  const [hour, setHour] = useState(initial.getHours() % 12 || 12);
  const [minute, setMinute] = useState(Math.round(initial.getMinutes() / 15) * 15);
  const [ampm, setAmPm] = useState(initial.getHours() >= 12 ? "PM" : "AM");

  const timeOptions = {
    hours: Array.from({ length: 12 }, (_, i) => i + 1),
    minutes: ["00", "15", "30", "45"],
    ampm: ["AM", "PM"],
  };

  const handleSave = () => {
    const adjustedHour = ampm === "PM" ? (hour % 12) + 12 : hour % 12;
    const updated = new Date(date);
    updated.setHours(adjustedHour);
    updated.setMinutes(parseInt(minute));
    updated.setSeconds(0);
    onSetAppointment(updated.toISOString());
    setIsEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="text-sm w-fit">
      {!isEditing && (
        <div className="flex flex-col gap-1">
          {siteVisitAt ? (
            <span className="text-gray-800 font-medium">
              {format(new Date(siteVisitAt), "MMM d, yyyy • h:mm a")}
            </span>
          ) : (
            <span className="text-gray-400 italic">No appointment set</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {siteVisitAt ? "Update Appointment" : "Set Appointment"}
          </Button>
          {saved && (
            <div className="text-green-600 text-xs mt-1 animate-bounce">
              ✅ Saved!
            </div>
          )}
        </div>
      )}

      {isEditing && (
        <div
          className="bg-white border border-gray-200 rounded-md p-4 shadow-xl flex flex-col gap-3 w-[260px] animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Pick a date</label>
            <DatePicker
              selected={date}
              onChange={(d) => setDate(d)}
              dateFormat="MMMM d, yyyy"
              className="border px-3 py-2 rounded-md text-sm w-full shadow-sm"
              popperPlacement="bottom-start"
              inline={false}
              showPopperArrow={false}
            />
          </div>

          <div className="flex items-center gap-2 text-sm">
            <select
              value={hour}
              onChange={(e) => setHour(parseInt(e.target.value))}
              className="border px-2 py-1 rounded-md"
            >
              {timeOptions.hours.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
            :
            <select
              value={minute.toString().padStart(2, "0")}
              onChange={(e) => setMinute(parseInt(e.target.value))}
              className="border px-2 py-1 rounded-md"
            >
              {timeOptions.minutes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={ampm}
              onChange={(e) => setAmPm(e.target.value)}
              className="border px-2 py-1 rounded-md"
            >
              {timeOptions.ampm.map((ampmVal) => (
                <option key={ampmVal}>{ampmVal}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>
              ✅ Update Appointment
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}




