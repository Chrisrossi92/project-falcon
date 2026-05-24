import { describe, expect, it } from "vitest";
import { deriveOperationalStatusSignals } from "../deriveOperationalStatusSignals";

const NOW = new Date("2026-05-24T12:00:00.000Z");

function ids(signals) {
  return signals.map((signal) => signal.id);
}

function baseOrder(overrides = {}) {
  return {
    id: "order-1",
    status: "in_progress",
    updated_at: "2026-05-23T12:00:00.000Z",
    ...overrides,
  };
}

describe("deriveOperationalStatusSignals", () => {
  it("derives due soon from loaded final due fields", () => {
    const signals = deriveOperationalStatusSignals({
      order: baseOrder({ final_due_at: "2026-05-26T12:00:00.000Z" }),
      now: NOW,
    });

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "due_soon",
          severity: "attention",
          message: "Final due date is in 2 days.",
        }),
      ]),
    );
  });

  it("derives overdue from loaded final due fields", () => {
    const signals = deriveOperationalStatusSignals({
      order: baseOrder({ final_due_at: "2026-05-20T12:00:00.000Z" }),
      now: NOW,
    });

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "overdue",
          severity: "critical",
          message: "Final due date passed 4 days ago.",
        }),
      ]),
    );
  });

  it("derives overdue with no recent update when both due and loaded update evidence support it", () => {
    const signals = deriveOperationalStatusSignals({
      order: baseOrder({
        final_due_at: "2026-05-20T12:00:00.000Z",
        updated_at: "2026-05-10T12:00:00.000Z",
      }),
      now: NOW,
    });

    expect(ids(signals)).toEqual(
      expect.arrayContaining(["overdue", "stale_update", "overdue_no_recent_update"]),
    );
    expect(signals.find((signal) => signal.id === "overdue_no_recent_update")).toMatchObject({
      severity: "critical",
      message: "Overdue with no recent update.",
    });
  });

  it("derives open revisions from loaded order status", () => {
    const signals = deriveOperationalStatusSignals({
      order: baseOrder({ status: "needs_revisions" }),
      now: NOW,
    });

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "revisions_open",
          message: "Revision follow-up may still be needed.",
        }),
      ]),
    );
  });

  it("derives review pending from loaded order status", () => {
    const signals = deriveOperationalStatusSignals({
      order: baseOrder({ status: "in_review" }),
      now: NOW,
    });

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "review_pending",
          message: "Review appears pending.",
        }),
      ]),
    );
  });

  it("derives appointment not scheduled and scheduled from loaded appointment fields", () => {
    expect(
      ids(
        deriveOperationalStatusSignals({
          order: baseOrder({ site_visit_at: null }),
          now: NOW,
        }),
      ),
    ).toContain("appointment_not_scheduled");

    expect(
      ids(
        deriveOperationalStatusSignals({
          order: baseOrder({ site_visit_at: "2026-05-25T14:00:00.000Z" }),
          now: NOW,
        }),
      ),
    ).toContain("appointment_scheduled");
  });

  it("derives limited files from loaded document metadata", () => {
    const signals = deriveOperationalStatusSignals({
      order: baseOrder(),
      documents: [{ id: "doc-1", status: "active" }],
      now: NOW,
    });

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "limited_files",
          message: "Supporting files are still limited.",
        }),
      ]),
    );
  });

  it("derives files ready for review from in-review status and loaded files", () => {
    const signals = deriveOperationalStatusSignals({
      order: baseOrder({ status: "in_review" }),
      documents: [{ id: "doc-1", status: "active" }],
      now: NOW,
    });

    expect(ids(signals)).toEqual(expect.arrayContaining(["review_pending", "files_ready_for_review"]));
  });

  it("derives assignment pending signals from loaded assignment-like metadata", () => {
    const offeredSignals = deriveOperationalStatusSignals({
      assignment: { id: "assignment-1", assignment_status: "offered" },
      now: NOW,
    });
    const submittedSignals = deriveOperationalStatusSignals({
      assignment: { id: "assignment-2", assignment_status: "submitted" },
      now: NOW,
    });

    expect(ids(offeredSignals)).toContain("assignment_offer_waiting");
    expect(ids(submittedSignals)).toContain("assignment_review_pending");
  });

  it("returns no signal when evidence is weak or terminal", () => {
    expect(
      deriveOperationalStatusSignals({
        order: baseOrder({ status: "completed", final_due_at: "2026-05-20T12:00:00.000Z" }),
        now: NOW,
      }),
    ).toEqual([]);
  });

  it("does not infer explicit-intent states from loaded metadata", () => {
    const signals = deriveOperationalStatusSignals({
      order: baseOrder({
        site_visit_at: "2026-05-20T14:00:00.000Z",
        inspection_complete: true,
        report_on_track: true,
        waiting_on_borrower: true,
        waiting_on_client_documents: true,
        extension_requested: true,
        reviewer_holding_review: true,
      }),
      activities: [
        {
          id: "activity-1",
          event_type: "note",
          message: "Borrower contacted and report on track",
          created_at: "2026-05-23T12:00:00.000Z",
        },
      ],
      now: NOW,
    });

    expect(ids(signals)).not.toEqual(
      expect.arrayContaining([
        "inspection_complete",
        "report_on_track",
        "waiting_on_borrower",
        "waiting_on_client_documents",
        "extension_requested",
        "reviewer_holding_review",
      ]),
    );
  });
});
