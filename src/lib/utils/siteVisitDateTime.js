const SITE_VISIT_WALL_TIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;

const pad = (value) => String(value).padStart(2, "0");

export function parseSiteVisitWallTime(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const match = value.match(SITE_VISIT_WALL_TIME_RE);
    if (match) {
      const [, year, month, day, hour, minute, second = "00"] = match;
      const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
        0,
      );
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatSiteVisitLocalTimestamp(value) {
  const date = parseSiteVisitWallTime(value);
  if (!date) return null;

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    ":",
    pad(date.getSeconds()),
  ].join("");
}

export function siteVisitToCalendarStart(value) {
  const timestamp = formatSiteVisitLocalTimestamp(value);
  return timestamp ? new Date(timestamp).toISOString() : null;
}
