import { describe, expect, it } from "vitest";
import { deriveReviewContextSummary } from "../deriveReviewContextSummary";

const NOW = new Date("2026-05-24T12:00:00.000Z");

function activity(overrides = {}) {
  return {
    id: "activity-1",
    event_type: "note.reviewer_added",
    message: "Review note added",
    created_at: "2026-05-23T12:00:00.000Z",
    ...overrides,
  };
}

describe("deriveReviewContextSummary", () => {
  it("flags review pending from in-review status", () => {
    expect(
      deriveReviewContextSummary({
        order: { id: "order-1", status: "in_review" },
        now: NOW,
      }),
    ).toMatchObject({
      id: "review_pending",
      label: "Review pending",
      message: "Order appears to be waiting in review.",
    });
  });

  it("flags open revisions from needs-revisions status", () => {
    expect(
      deriveReviewContextSummary({
        order: { id: "order-1", status: "needs_revisions" },
        now: NOW,
      }),
    ).toMatchObject({
      id: "revisions_open",
      tone: "attention",
      message: "Revision follow-up may still be needed.",
    });
  });

  it("flags recent resubmission from loaded activity rows", () => {
    expect(
      deriveReviewContextSummary({
        order: { id: "order-1", status: "in_review" },
        activities: [
          activity({
            event_type: "sent_to_review",
            message: "Order resubmitted to review",
            created_at: "2026-05-23T12:00:00.000Z",
          }),
        ],
        now: NOW,
      }),
    ).toMatchObject({
      id: "recent_resubmission",
      tone: "active",
      message: "Recent resubmission detected.",
    });
  });

  it("flags stale review activity from loaded review timestamps", () => {
    expect(
      deriveReviewContextSummary({
        order: {
          id: "order-1",
          status: "in_review",
          last_review_activity_at: "2026-05-10T12:00:00.000Z",
        },
        now: NOW,
      }),
    ).toMatchObject({
      id: "review_activity_stale",
      label: "Review follow-up",
      message: "No recent review activity detected.",
    });
  });

  it("flags recent review notes from loaded activity rows", () => {
    expect(
      deriveReviewContextSummary({
        order: { id: "order-1", status: "in_progress" },
        activities: [activity()],
        now: NOW,
      }),
    ).toMatchObject({
      id: "recent_review_notes",
      label: "Review notes",
      message: "Review notes were recently added.",
    });
  });

  it("includes conservative detail chips from loaded revision loops and documents", () => {
    const result = deriveReviewContextSummary({
      order: { id: "order-1", status: "needs_revisions" },
      activities: [
        activity({ id: "activity-1", event_type: "request_revisions" }),
        activity({ id: "activity-2", event_type: "revision_note" }),
      ],
      documents: [
        { id: "doc-1", status: "active" },
        { id: "doc-2", status: "archived" },
      ],
      now: NOW,
    });

    expect(result.details).toContain("2 revision-related updates loaded.");
    expect(result.details).toContain("1 supporting file loaded.");
  });

  it("returns null when no review context can be derived", () => {
    expect(
      deriveReviewContextSummary({
        order: { id: "order-1", status: "in_progress" },
        now: NOW,
      }),
    ).toBeNull();
  });
});
