import { ORDER_STATUS, normalizeOrderStatus } from "@/lib/constants/orderStatus";

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_DAYS = 2;
const STALE_REVIEW_DAYS = 5;

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysSince(date, now) {
  return Math.floor((now.getTime() - date.getTime()) / DAY_MS);
}

function firstDate(source, keys) {
  for (const key of keys) {
    const date = parseDate(source?.[key]);
    if (date) return date;
  }
  return null;
}

function activityText(activity) {
  return [
    activity?.event_type,
    activity?.event,
    activity?.action,
    activity?.title,
    activity?.message,
    activity?.note,
    activity?.body,
    activity?.detail?.action,
    activity?.detail?.status,
    activity?.detail?.to,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function activityDate(activity) {
  return firstDate(activity, ["created_at", "updated_at", "occurred_at"]);
}

function latestActivityMatching(activities, predicate) {
  if (!Array.isArray(activities)) return null;
  return activities
    .filter(predicate)
    .map((activity) => ({ activity, date: activityDate(activity) }))
    .filter((item) => item.date)
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0] || null;
}

function countActivitiesMatching(activities, predicate) {
  if (!Array.isArray(activities)) return null;
  return activities.filter(predicate).length;
}

function isReviewActivity(activity) {
  const text = activityText(activity);
  return text.includes("review") || text.includes("revision");
}

function isRevisionActivity(activity) {
  const text = activityText(activity);
  return text.includes("revision") || text.includes("revisions");
}

function isResubmissionActivity(activity) {
  const text = activityText(activity);
  return (
    text.includes("resubmit") ||
    text.includes("resubmitted") ||
    text.includes("sent to review") ||
    text.includes("send_to_review") ||
    text.includes("sent_to_review")
  );
}

function activeDocumentCount(documents) {
  if (!Array.isArray(documents)) return null;
  return documents.filter((document) => {
    const status = String(document?.status || "").toLowerCase();
    return status !== "archived" && status !== "deleted";
  }).length;
}

export function deriveReviewContextSummary({
  order = null,
  activities = null,
  documents = null,
  now = new Date(),
} = {}) {
  const status = normalizeOrderStatus(order?.status_normalized || order?.status);
  const currentTime = parseDate(now) || new Date();
  const latestReviewActivity = latestActivityMatching(activities, isReviewActivity);
  const latestRevisionActivity = latestActivityMatching(activities, isRevisionActivity);
  const latestResubmission = latestActivityMatching(activities, isResubmissionActivity);
  const revisionCount = countActivitiesMatching(activities, isRevisionActivity);
  const reviewUpdatedAt =
    latestReviewActivity?.date ||
    firstDate(order, [
      "last_review_activity_at",
      "review_updated_at",
      "review_submitted_at",
      "submitted_to_review_at",
      "last_activity_at",
      "updated_at",
    ]);
  const lastUpdate = firstDate(order, ["last_activity_at", "updated_at", "created_at"]);
  const documentCount = activeDocumentCount(documents);
  const details = [];

  if (revisionCount && revisionCount > 1) {
    details.push(`${revisionCount} revision-related updates loaded.`);
  }

  if (latestRevisionActivity?.date) {
    const age = daysSince(latestRevisionActivity.date, currentTime);
    details.push(age <= RECENT_DAYS ? "Recent revision note detected." : "Revision history is loaded.");
  }

  if (documentCount != null && documentCount > 0) {
    details.push(`${documentCount} supporting file${documentCount === 1 ? "" : "s"} loaded.`);
  }

  if (latestResubmission?.date && daysSince(latestResubmission.date, currentTime) <= RECENT_DAYS) {
    return {
      id: "recent_resubmission",
      tone: "active",
      label: "Recent resubmission",
      message: "Recent resubmission detected.",
      details,
    };
  }

  if (status === ORDER_STATUS.NEEDS_REVISIONS) {
    return {
      id: "revisions_open",
      tone: "attention",
      label: "Revisions open",
      message: "Revision follow-up may still be needed.",
      details,
    };
  }

  if (status === ORDER_STATUS.IN_REVIEW) {
    if (reviewUpdatedAt) {
      const age = daysSince(reviewUpdatedAt, currentTime);
      if (age >= STALE_REVIEW_DAYS) {
        return {
          id: "review_activity_stale",
          tone: "attention",
          label: "Review follow-up",
          message: "No recent review activity detected.",
          details,
        };
      }
      return {
        id: "review_active",
        tone: "active",
        label: "Review active",
        message: "Review appears active.",
        details,
      };
    }

    return {
      id: "review_pending",
      tone: "neutral",
      label: "Review pending",
      message: "Order appears to be waiting in review.",
      details,
    };
  }

  if (latestReviewActivity?.date && daysSince(latestReviewActivity.date, currentTime) <= RECENT_DAYS) {
    return {
      id: "recent_review_notes",
      tone: "active",
      label: "Review notes",
      message: "Review notes were recently added.",
      details,
    };
  }

  if (!status && !lastUpdate && !Array.isArray(activities)) return null;

  return null;
}
