import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

const formatFullDisplay = (iso, emptyLabel = "Set Appointment") => {
  if (!iso) return emptyLabel;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return emptyLabel;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const formatDisplay = (iso, emptyLabel = "Set Appointment", displayFormatter) => {
  if (!iso) return emptyLabel;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return emptyLabel;
  return displayFormatter?.(d, iso) ?? formatFullDisplay(iso, emptyLabel);
};

function toLocalTimestamp(value) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:00`;
}

const MINUTE_OPTIONS = ["00", "15", "30", "45"];
const PICKER_WIDTH = 240;
const VIEWPORT_MARGIN = 16;

function formatCalendarMonth(locale, value) {
  return value.toLocaleDateString(locale, { month: "long" });
}

function closestQuarterMinute(value) {
  const minute = Number.isFinite(value) ? value : 0;
  const rounded = Math.round(minute / 15) * 15;
  if (rounded >= 60) return "00";
  return String(rounded).padStart(2, "0");
}

function timePartsFromDate(value) {
  const hours = value.getHours();
  return {
    hour: String(hours % 12 || 12),
    minute: closestQuarterMinute(value.getMinutes()),
    meridiem: hours >= 12 ? "PM" : "AM",
  };
}

function mergeDateAndTimeParts(date, { hour, minute, meridiem }) {
  const parsedHour = parseInt(hour, 10);
  const parsedMinute = parseInt(minute, 10);
  const hour12 = Number.isFinite(parsedHour) ? parsedHour : 12;
  const hour24 = meridiem === "PM" ? (hour12 % 12) + 12 : hour12 % 12;
  const merged = new Date(date);
  merged.setHours(hour24);
  merged.setMinutes(Number.isFinite(parsedMinute) ? parsedMinute : 0);
  merged.setSeconds(0);
  merged.setMilliseconds(0);
  return merged;
}

export default function SiteVisitPicker({
  value,
  onChange,
  onSave,
  disabled,
  emptyLabel = "Set Appointment",
  buttonClassName = "",
  triggerVariant = "outline",
  displayFormatter,
}) {
  const initialDate = useMemo(() => {
    const d = value ? new Date(value) : new Date();
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(initialDate);
  const [timeParts, setTimeParts] = useState(() => timePartsFromDate(initialDate));
  const [popoverPosition, setPopoverPosition] = useState(null);

  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    const d = value ? new Date(value) : new Date();
    if (!Number.isNaN(d.getTime())) {
      setDate(d);
      setTimeParts(timePartsFromDate(d));
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      const target = e.target;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const contentRect = popoverRef.current?.getBoundingClientRect();
      const height = contentRect?.height || 0;
      const offset = 8;
      const roomBelow = window.innerHeight - rect.bottom;
      const roomAbove = rect.top;
      const openAbove =
        height > 0 &&
        rect.bottom + offset + height > window.innerHeight - VIEWPORT_MARGIN &&
        roomAbove > roomBelow;

      const preferredLeft = rect.left;
      const maxLeft = window.innerWidth - PICKER_WIDTH - VIEWPORT_MARGIN;
      const left = Math.max(VIEWPORT_MARGIN, Math.min(preferredLeft, maxLeft));
      const top = openAbove
        ? Math.max(VIEWPORT_MARGIN, rect.top - offset - height)
        : Math.min(rect.bottom + offset, window.innerHeight - VIEWPORT_MARGIN);

      setPopoverPosition({ left, top });
    };

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const handleSave = () => {
    const merged = mergeDateAndTimeParts(date, timeParts);
    const iso = toLocalTimestamp(merged);
    onChange?.(iso);
    onSave?.(iso);
    setOpen(false);
  };

  const handleTimePartChange = (key) => (event) => {
    setTimeParts((current) => ({ ...current, [key]: event.target.value }));
  };

  const picker = open
    ? createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Site visit picker"
          className="w-[240px] rounded-lg border border-slate-200 bg-white p-3 shadow-xl"
          style={{
            position: "fixed",
            left: popoverPosition?.left ?? 8,
            top: popoverPosition?.top ?? 8,
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 text-xs font-semibold text-gray-600">Site Visit</div>
          <Calendar
            onChange={(d) => d && setDate(d)}
            value={date}
            selectRange={false}
            formatMonthYear={formatCalendarMonth}
            prev2Label={null}
            next2Label={null}
            className="w-full [&_.react-calendar]:w-full [&_.react-calendar__navigation]:mb-1 [&_.react-calendar__navigation__label]:text-sm [&_.react-calendar__navigation__label]:font-semibold [&_.react-calendar__tile]:py-1"
          />
          <div className="mt-3">
            <div className="mb-1 text-xs text-gray-600">Time</div>
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
              <label className="text-xs font-medium text-slate-600">
                <span className="mb-1 block">Hour</span>
                <select
                  aria-label="Site visit hour"
                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
                  value={timeParts.hour}
                  onChange={handleTimePartChange("hour")}
                >
                  {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((hour) => (
                    <option key={hour} value={hour}>
                      {hour}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                <span className="mb-1 block">Minutes</span>
                <select
                  aria-label="Site visit minutes"
                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
                  value={timeParts.minute}
                  onChange={handleTimePartChange("minute")}
                >
                  {MINUTE_OPTIONS.map((minute) => (
                    <option key={minute} value={minute}>
                      {minute}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                <span className="mb-1 block">AM/PM</span>
                <select
                  aria-label="Site visit meridiem"
                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
                  value={timeParts.meridiem}
                  onChange={handleTimePartChange("meridiem")}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </label>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>,
        document.body,
      )
    : null;
  const displayValue = formatDisplay(value, emptyLabel, displayFormatter);
  const titleValue = value ? formatFullDisplay(value, emptyLabel) : undefined;

  return (
    <div ref={triggerRef} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <Button
        type="button"
        size="sm"
        variant={triggerVariant}
        className={`text-sm ${buttonClassName}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setOpen((o) => !o);
        }}
        disabled={disabled}
        title={titleValue}
      >
        {displayValue}
      </Button>

      {picker}
    </div>
  );
}
