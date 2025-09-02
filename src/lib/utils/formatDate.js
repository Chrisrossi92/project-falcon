/** ISO -> human label (local tz) */
export function formatDateLabel(iso, opts) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, opts ?? { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** ISO -> value for <input type="datetime-local"> (local tz) */
export function toLocalInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

/** value from <input type="datetime-local"> -> ISO (UTC) */
export function fromLocalInputValue(local) {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
