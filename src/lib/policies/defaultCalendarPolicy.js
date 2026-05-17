// Current single-company platform defaults.
// Future company policy layer should override through company-aware policy resolution.

export const DEFAULT_REVIEW_COMPRESSION_THRESHOLD_DAYS = 2;

export const DEFAULT_CALENDAR_POLICY = Object.freeze({
  weekendsVisibleDefault: true,
  schedulingTimezoneBehavior: "browser_local_until_company_timezone_exists",
  siteVisitExpectation: "expected_before_review_or_final_due",
  reviewCompressionThresholdDays: DEFAULT_REVIEW_COMPRESSION_THRESHOLD_DAYS,
  calendarEventSource: "order_schedule_fields",
  calendarSignalDelivery: "contextual_only",
});

export function getDefaultCalendarPolicy() {
  return DEFAULT_CALENDAR_POLICY;
}
