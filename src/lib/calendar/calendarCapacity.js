import { normalizeCalendarEventType } from "@/lib/calendar/normalizeCalendarEvent";

const CAPACITY_WEIGHTS = Object.freeze({
  site: 3,
  review: 2,
  final: 2,
  other: 1,
});

export const CALENDAR_CAPACITY_LEVELS = Object.freeze({
  open: Object.freeze({
    id: "open",
    label: "Open Capacity",
    scoreMax: 0,
    trackClassName: "bg-slate-200",
    textClassName: "text-slate-400",
    widthClassName: "w-1/6",
  }),
  light: Object.freeze({
    id: "light",
    label: "Light",
    scoreMax: 2,
    trackClassName: "bg-emerald-300",
    textClassName: "text-emerald-700",
    widthClassName: "w-1/4",
  }),
  steady: Object.freeze({
    id: "steady",
    label: "Steady",
    scoreMax: 4,
    trackClassName: "bg-blue-300",
    textClassName: "text-blue-700",
    widthClassName: "w-1/2",
  }),
  heavy: Object.freeze({
    id: "heavy",
    label: "Heavy",
    scoreMax: 7,
    trackClassName: "bg-amber-300",
    textClassName: "text-amber-700",
    widthClassName: "w-3/4",
  }),
  overloaded: Object.freeze({
    id: "overloaded",
    label: "Overloaded",
    scoreMax: Infinity,
    trackClassName: "bg-rose-300",
    textClassName: "text-rose-700",
    widthClassName: "w-full",
  }),
});

function eventCapacityWeight(event) {
  const type = normalizeCalendarEventType(event?.type || event?.eventType || event?.event_type);
  return CAPACITY_WEIGHTS[type] || CAPACITY_WEIGHTS.other;
}

export function calendarDayCapacityScore(eventsForDay = []) {
  return (eventsForDay || []).reduce((total, event) => total + eventCapacityWeight(event), 0);
}

export function classifyCalendarDayCapacity(eventsForDay = []) {
  const score = calendarDayCapacityScore(eventsForDay);

  // Conservative thresholds keep the cue advisory: site visits carry the most weight,
  // while review/client due dates add pressure without implying hard scheduling capacity.
  if (score <= CALENDAR_CAPACITY_LEVELS.open.scoreMax) return CALENDAR_CAPACITY_LEVELS.open;
  if (score <= CALENDAR_CAPACITY_LEVELS.light.scoreMax) return CALENDAR_CAPACITY_LEVELS.light;
  if (score <= CALENDAR_CAPACITY_LEVELS.steady.scoreMax) return CALENDAR_CAPACITY_LEVELS.steady;
  if (score <= CALENDAR_CAPACITY_LEVELS.heavy.scoreMax) return CALENDAR_CAPACITY_LEVELS.heavy;
  return CALENDAR_CAPACITY_LEVELS.overloaded;
}
