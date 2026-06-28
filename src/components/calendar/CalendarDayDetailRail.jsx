import { useMemo } from "react";
import {
  formatCalendarEventTime,
  normalizeCalendarEventType,
} from "@/lib/calendar/normalizeCalendarEvent";
import { classifyCalendarDayCapacity } from "@/lib/calendar/calendarCapacity";

const TYPE_LABELS = {
  site: "Site visits",
  review: "Review handoffs",
  final: "Client due",
  other: "Other",
};

const TYPE_SHORT_LABELS = {
  site: "Site",
  review: "Review",
  final: "Final",
  other: "Event",
};

const TYPE_STYLES = {
  site: "border-slate-200 bg-slate-50 text-slate-700",
  review: "border-amber-100 bg-amber-50/70 text-amber-800",
  final: "border-blue-100 bg-blue-50/70 text-blue-800",
  other: "border-slate-200 bg-white text-slate-700",
};

const DETAIL_GROUP_ORDER = ["final", "review", "site", "other"];

const CAPACITY_STYLES = {
  open: "border-slate-200 bg-slate-50/80 text-slate-600",
  light: "border-emerald-100 bg-emerald-50/70 text-emerald-800",
  steady: "border-blue-100 bg-blue-50/70 text-blue-800",
  heavy: "border-amber-100 bg-amber-50/70 text-amber-800",
  overloaded: "border-rose-100 bg-rose-50/70 text-rose-800",
};

function startOfDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function dateLabel(date) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "Selected day";
  return value.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function eventSort(a, b) {
  return new Date(a.start || a.date).getTime() - new Date(b.start || b.date).getTime();
}

function eventAddress(event) {
  return event?.street || event?.address_line1 || event?.address || event?.title || event?.label || "Scheduled event";
}

function ownerLine(event) {
  const parts = [];
  if (event?.appraiserName || event?.appraiser_name) {
    parts.push(`Appraiser: ${event.appraiserName || event.appraiser_name}`);
  }
  if (event?.reviewerName || event?.reviewer_name) {
    parts.push(`Reviewer: ${event.reviewerName || event.reviewer_name}`);
  }
  return parts.join(" · ");
}

function orderLabel(event) {
  return event?.orderNumber || event?.order_number || event?.order_no || event?.orderId || event?.order_id || "";
}

function totalLabel(total) {
  return `${total} ${total === 1 ? "event" : "events"}`;
}

function countPhrase(count, singular, plural = `${singular}s`) {
  if (!count) return "";
  return `${count} ${count === 1 ? singular : plural}`;
}

function joinPhrases(parts) {
  const values = parts.filter(Boolean);
  if (values.length <= 1) return values[0] || "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function capacityReason(groups) {
  const parts = [
    countPhrase(groups.site.length, "site visit"),
    countPhrase(groups.review.length, "review handoff"),
    countPhrase(groups.final.length, "client due date"),
    countPhrase(groups.other.length, "other event"),
  ];
  return joinPhrases(parts);
}

function capacityExplanation(capacity, groups, total) {
  if (total === 0) {
    return "Open capacity because no operational events are scheduled for this day.";
  }

  const reason = capacityReason(groups);
  if (!reason) return `${capacity.label} because ${totalLabel(total)} are scheduled.`;
  return `${capacity.label} because of ${reason}.`;
}

function daySignals(groups) {
  const notes = [];
  if (groups.final.length >= 3) {
    notes.push("Heavy final-delivery concentration for this day.");
  }
  if (groups.review.length >= 3) {
    notes.push("Heavy review handoff concentration for this day.");
  }
  if (groups.review.length + groups.final.length >= 5) {
    notes.push("Review and client due work are clustered on this day.");
  }
  return notes.slice(0, 2);
}

export default function CalendarDayDetailRail({
  selectedDay,
  events = [],
  onOpenOrder,
}) {
  const day = startOfDay(selectedDay || new Date()) || startOfDay(new Date());
  const groups = useMemo(() => {
    const base = { site: [], review: [], final: [], other: [] };
    (events || []).forEach((event) => {
      const type = normalizeCalendarEventType(event?.type || event?.eventType || event?.event_type);
      base[type || "other"].push(event);
    });
    Object.values(base).forEach((list) => list.sort(eventSort));
    return base;
  }, [events]);

  const counts = {
    site: groups.site.length,
    review: groups.review.length,
    final: groups.final.length,
  };
  const total = events.length;
  const totalText = totalLabel(total);
  const aggregateSignals = daySignals(groups);
  const capacity = classifyCalendarDayCapacity(events);
  const capacityStyle = CAPACITY_STYLES[capacity.id] || CAPACITY_STYLES.open;
  const explanation = capacityExplanation(capacity, groups, total);

  return (
    <aside
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100"
      aria-labelledby="calendar-day-detail-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Selected Day
          </div>
          <h2 id="calendar-day-detail-heading" className="mt-1 text-base font-semibold text-slate-950">
            {dateLabel(day)}
          </h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            {total === 0
              ? "No scheduled operational events for this day."
              : `${total} operational ${total === 1 ? "event" : "events"} scheduled.`}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600"
          aria-label={`Selected day has ${totalText}`}
        >
          {totalText}
        </span>
      </div>

      <div
        className={`mt-4 rounded-xl border px-3 py-2.5 ${capacityStyle}`}
        aria-label={`Selected day capacity: ${capacity.label}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">
            Capacity read
          </div>
          <div className="text-xs font-semibold">
            {capacity.label}
          </div>
        </div>
        <p className="mt-1.5 text-xs leading-5 text-slate-600">
          {explanation}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Selected day event counts">
        {["final", "review", "site"].map((type) => (
          <div key={type} className={`rounded-lg border px-2.5 py-2 ${TYPE_STYLES[type]}`}>
            <div className="text-lg font-semibold leading-none">{counts[type]}</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em]">
              {TYPE_SHORT_LABELS[type]}
            </div>
          </div>
        ))}
      </div>

      {aggregateSignals.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Operational notes
          </div>
          <div className="mt-1.5 space-y-1">
            {aggregateSignals.map((note) => (
              <div key={note} className="text-xs leading-5 text-slate-600">
                {note}
              </div>
            ))}
          </div>
        </div>
      )}

      {total === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4">
          <div className="text-sm font-semibold text-slate-800">
            No events on this day
          </div>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            Select another date or adjust the calendar lens to inspect a different part of the active schedule.
          </p>
        </div>
      )}

      <div className="mt-4 space-y-4">
        {DETAIL_GROUP_ORDER.map((type) => {
          const list = groups[type];
          if (!list.length) return null;
          return (
            <section key={type} className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/40 p-2.5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {TYPE_LABELS[type]}
                </h3>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  {list.length}
                </span>
              </div>

              <div className="space-y-2">
                {list.map((event) => {
                  const ref = orderLabel(event);
                  const time = formatCalendarEventTime(event?.start || event?.date);
                  const owners = ownerLine(event);
                  const signals = (event?.operationalSignals || event?.operational_signals || []).slice(0, 2);
                  return (
                    <article
                      key={event.id || `${event.orderId || ref}-${event.type}-${event.start}`}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-[0_1px_0_rgba(15,23,42,0.03)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                              {TYPE_SHORT_LABELS[type]}
                            </span>
                            {time && <span className="text-xs text-slate-500">{time}</span>}
                          </div>
                          <div className="mt-1 truncate text-sm font-medium text-slate-900">
                            {eventAddress(event)}
                          </div>
                          {event?.clientName || event?.client_name ? (
                            <div className="mt-0.5 truncate text-xs text-slate-500">
                              {event.clientName || event.client_name}
                            </div>
                          ) : null}
                          {owners ? (
                            <div className="mt-1 truncate text-xs text-slate-500">
                              {owners}
                            </div>
                          ) : null}
                          {signals.length > 0 ? (
                            <div className="mt-2 space-y-1">
                              {signals.map((signal) => (
                                <div key={signal.id || signal.label} className="rounded-md border border-slate-200 bg-slate-50/80 px-2 py-1 text-xs leading-4 text-slate-600">
                                  {signal.label}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        {ref ? (
                          <button
                            type="button"
                            className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                            onClick={() => onOpenOrder?.(event.orderId || event.order_id)}
                            aria-label={`Open order ${ref}`}
                          >
                            {ref}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
