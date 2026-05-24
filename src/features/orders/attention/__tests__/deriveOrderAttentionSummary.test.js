import { describe, expect, it } from "vitest";
import { deriveOrderAttentionSummary } from "../deriveOrderAttentionSummary";

const NOW = new Date("2026-05-24T12:00:00.000Z");

function baseOrder(overrides = {}) {
  return {
    id: "order-1",
    status: "in_progress",
    final_due_at: "2026-05-31T12:00:00.000Z",
    site_visit_at: "2026-05-25T12:00:00.000Z",
    updated_at: "2026-05-24T09:00:00.000Z",
    ...overrides,
  };
}

function signalIds(result) {
  return result.map((signal) => signal.id);
}

describe("deriveOrderAttentionSummary", () => {
  it("flags due-soon orders from loaded due fields", () => {
    const result = deriveOrderAttentionSummary({
      order: baseOrder({ final_due_at: "2026-05-26T12:00:00.000Z" }),
      now: NOW,
    });

    expect(signalIds(result)).toContain("final_due_soon");
    expect(result.find((signal) => signal.id === "final_due_soon")).toMatchObject({
      tone: "attention",
      message: "Final due date is in 2 days.",
    });
  });

  it("flags overdue orders conservatively", () => {
    const result = deriveOrderAttentionSummary({
      order: baseOrder({ final_due_at: "2026-05-22T12:00:00.000Z" }),
      now: NOW,
    });

    expect(result.find((signal) => signal.id === "final_due_overdue")).toMatchObject({
      tone: "critical",
      message: "Final due date passed 2 days ago.",
    });
  });

  it("flags open revision status", () => {
    const result = deriveOrderAttentionSummary({
      order: baseOrder({ status: "needs_revisions" }),
      now: NOW,
    });

    expect(result.find((signal) => signal.id === "revisions_open")).toMatchObject({
      label: "Revisions open",
      message: "Reviewer requested revisions are still open.",
    });
  });

  it("flags review pending from in-review status and review due date", () => {
    const result = deriveOrderAttentionSummary({
      order: baseOrder({
        status: "in_review",
        review_due_at: "2026-05-24T18:00:00.000Z",
      }),
      now: NOW,
    });

    expect(result.find((signal) => signal.id === "review_pending")).toMatchObject({
      tone: "attention",
      message: "Review is due today.",
    });
  });

  it("flags no files only when document context has loaded", () => {
    const result = deriveOrderAttentionSummary({
      order: baseOrder(),
      documents: [],
      now: NOW,
    });

    expect(result.find((signal) => signal.id === "files_missing")).toMatchObject({
      message: "No supporting files are loaded for this order yet.",
    });
  });

  it("counts active files without counting archived files", () => {
    const result = deriveOrderAttentionSummary({
      order: baseOrder(),
      documents: [
        { id: "doc-1", status: "active" },
        { id: "doc-2", status: "archived" },
      ],
      now: NOW,
    });

    expect(result.find((signal) => signal.id === "files_present")).toMatchObject({
      tone: "positive",
      message: "1 supporting file loaded.",
    });
  });

  it("flags stale loaded activity from update timestamps", () => {
    const result = deriveOrderAttentionSummary({
      order: baseOrder({ updated_at: "2026-05-10T12:00:00.000Z" }),
      now: NOW,
    });

    expect(result.find((signal) => signal.id === "stale_activity")).toMatchObject({
      tone: "attention",
      message: "No loaded activity update in 14 days.",
    });
  });

  it("flags active assignment context from loaded assignment status fields", () => {
    const result = deriveOrderAttentionSummary({
      order: baseOrder({ assignment_status: "active" }),
      now: NOW,
    });

    expect(result.find((signal) => signal.id === "assignment_active")).toMatchObject({
      message: "Assignment work is still active for this order.",
    });
  });

  it("returns a conservative fallback when loaded context has no attention signals", () => {
    const result = deriveOrderAttentionSummary({
      order: baseOrder({
        status: "completed",
        final_due_at: null,
        site_visit_at: "2026-05-20T12:00:00.000Z",
        updated_at: null,
      }),
      now: NOW,
    });

    expect(result).toEqual([
      {
        id: "no_loaded_attention",
        tone: "positive",
        label: "No immediate signal",
        message: "Loaded order context does not show immediate attention needs.",
      },
    ]);
  });
});
