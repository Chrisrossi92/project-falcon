import { describe, expect, it } from "vitest";
import { deriveOrderRowNextStep } from "../deriveOrderRowNextStep";

const NOW = new Date("2026-05-24T12:00:00.000Z");

function baseOrder(overrides = {}) {
  return {
    id: "order-1",
    status: "in_progress",
    final_due_at: "2026-06-01T12:00:00.000Z",
    site_visit_at: "2026-05-26T12:00:00.000Z",
    updated_at: "2026-05-24T10:00:00.000Z",
    ...overrides,
  };
}

describe("deriveOrderRowNextStep", () => {
  it("prioritizes overdue due dates", () => {
    expect(
      deriveOrderRowNextStep(
        baseOrder({ final_due_at: "2026-05-22T12:00:00.000Z" }),
        { now: NOW },
      ),
    ).toMatchObject({
      id: "row_final_due_overdue",
      tone: "critical",
      message: "Final due passed 2 days ago.",
    });
  });

  it("flags due-soon rows", () => {
    expect(
      deriveOrderRowNextStep(
        baseOrder({ final_due_at: "2026-05-26T12:00:00.000Z" }),
        { now: NOW },
      ),
    ).toMatchObject({
      id: "row_final_due_soon",
      tone: "attention",
      message: "Final due in 2 days.",
    });
  });

  it("flags open revisions", () => {
    expect(
      deriveOrderRowNextStep(baseOrder({ status: "needs_revisions" }), { now: NOW }),
    ).toMatchObject({
      id: "row_revisions_open",
      label: "Needs revisions",
      message: "Revision request is still open.",
    });
  });

  it("flags review pending from loaded review due fields", () => {
    expect(
      deriveOrderRowNextStep(
        baseOrder({
          status: "in_review",
          review_due_at: "2026-05-24T18:00:00.000Z",
        }),
        { now: NOW },
      ),
    ).toMatchObject({
      id: "row_review_pending",
      label: "Review pending",
      message: "Review is due today.",
    });
  });

  it("flags no appointment only for active progress rows", () => {
    expect(
      deriveOrderRowNextStep(baseOrder({ site_visit_at: null }), { now: NOW }),
    ).toMatchObject({
      id: "row_site_visit_missing",
      message: "No appointment date loaded.",
    });
  });

  it("flags file absence only when a file count is already loaded on the row", () => {
    expect(
      deriveOrderRowNextStep(
        baseOrder({
          active_document_count: 0,
          site_visit_at: "2026-05-26T12:00:00.000Z",
        }),
        { now: NOW },
      ),
    ).toMatchObject({
      id: "row_files_missing",
      message: "No supporting files loaded.",
    });
  });

  it("flags stale loaded updates", () => {
    expect(
      deriveOrderRowNextStep(
        baseOrder({
          site_visit_at: "2026-05-26T12:00:00.000Z",
          updated_at: "2026-05-10T12:00:00.000Z",
        }),
        { now: NOW },
      ),
    ).toMatchObject({
      id: "row_stale_update",
      message: "No loaded update in 14 days.",
    });
  });

  it("returns null when row context has no conservative next-step signal", () => {
    expect(deriveOrderRowNextStep(baseOrder(), { now: NOW })).toBeNull();
  });
});
