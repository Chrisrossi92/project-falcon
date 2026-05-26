// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ActivityLog from "../ActivityLog";
import { dayLabel } from "../utils";

const listOrderActivityMock = vi.hoisted(() => vi.fn());
const subscribeOrderActivityMock = vi.hoisted(() => vi.fn());
const DOCUMENT_POSITION_FOLLOWING = 4;

vi.mock("@/lib/services/activityService", () => ({
  listOrderActivity: listOrderActivityMock,
  subscribeOrderActivity: subscribeOrderActivityMock,
}));

function isoDaysAgo(daysAgo, hour, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function renderActivityLog(rows) {
  listOrderActivityMock.mockResolvedValue(rows);
  subscribeOrderActivityMock.mockReturnValue(() => {});

  return render(<ActivityLog orderId="order-1" showComposer={false} height={420} />);
}

describe("ActivityLog date grouping", () => {
  beforeEach(() => {
    listOrderActivityMock.mockReset();
    subscribeOrderActivityMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Today, Yesterday, and older date groups from existing activity rows", async () => {
    const olderDate = isoDaysAgo(4, 11);
    renderActivityLog([
      {
        id: "today-1",
        event_type: "note",
        created_at: isoDaysAgo(0, 10),
        body: "Today note",
        created_by_name: "Chris Rossi",
      },
      {
        id: "yesterday-1",
        event_type: "status_changed",
        created_at: isoDaysAgo(1, 9),
        detail: { from: "new", to: "in_review" },
      },
      {
        id: "older-1",
        event_type: "order_created",
        created_at: olderDate,
        message: "Order created",
      },
    ]);

    expect(await screen.findByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
    expect(screen.getByText(dayLabel(olderDate))).toBeInTheDocument();
    expect(screen.getByText("Today note")).toBeInTheDocument();
    expect(screen.getByText("New → In Review")).toBeInTheDocument();
    expect(screen.getAllByText("Order created").length).toBeGreaterThan(0);
  });

  it("preserves chronological ordering within a date group", async () => {
    renderActivityLog([
      {
        id: "later",
        event_type: "note",
        created_at: isoDaysAgo(0, 16),
        body: "Later note",
        created_by_name: "Chris Rossi",
      },
      {
        id: "earlier",
        event_type: "note",
        created_at: isoDaysAgo(0, 8),
        body: "Earlier note",
        created_by_name: "Chris Rossi",
      },
    ]);

    const earlier = await screen.findByText("Earlier note");
    const later = screen.getByText("Later note");

    expect(
      earlier.compareDocumentPosition(later) & DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps unknown events visible inside date groups", async () => {
    renderActivityLog([
      {
        id: "unknown-1",
        event_type: "legacy_unmapped_event",
        created_at: isoDaysAgo(0, 12),
        detail: {
          unsafe_debug_value: "do-not-render",
        },
      },
    ]);

    expect(await screen.findByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Activity event")).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText("Event recorded")).toBeInTheDocument();
    expect(screen.queryByText("do-not-render")).not.toBeInTheDocument();
  });

  it("dedupes exact duplicate assignment system events from feed and realtime", async () => {
    const createdAt = isoDaysAgo(0, 11);
    const assignmentDetail = {
      field: "appraiser_id",
      from: null,
      to: "chris",
    };
    const assignmentEvent = {
      id: "assignment-1",
      event_type: "assignee_changed",
      created_at: createdAt,
      body: JSON.stringify(assignmentDetail),
      actor_name: "Ops Admin",
    };
    let realtimeHandler;
    listOrderActivityMock.mockResolvedValue([
      assignmentEvent,
      {
        ...assignmentEvent,
        id: "assignment-duplicate",
      },
    ]);
    subscribeOrderActivityMock.mockImplementation((_orderId, cb) => {
      realtimeHandler = cb;
      return () => {};
    });

    render(<ActivityLog orderId="order-1" showComposer={false} height={420} />);

    expect(await screen.findByText("Today")).toBeInTheDocument();
    expect(screen.getAllByText("Assignment changed")).toHaveLength(1);

    act(() => {
      realtimeHandler({
        id: "assignment-1",
        order_id: "order-1",
        event_type: "assignee_changed",
        created_at: createdAt,
        actor_id: "actor-1",
        detail: assignmentDetail,
      });
    });

    expect(screen.getAllByText("Assignment changed")).toHaveLength(1);
  });

  it("preserves distinct repeated human notes", async () => {
    const createdAt = isoDaysAgo(0, 13);
    renderActivityLog([
      {
        id: "note-1",
        order_id: "order-1",
        event_type: "note",
        created_at: createdAt,
        body: "Repeated note",
        created_by_name: "Chris Rossi",
      },
      {
        id: "note-2",
        order_id: "order-1",
        event_type: "note",
        created_at: createdAt,
        body: "Repeated note",
        created_by_name: "Chris Rossi",
      },
    ]);

    expect(await screen.findByText("Today")).toBeInTheDocument();
    expect(screen.getAllByText("Repeated note")).toHaveLength(2);
  });
});
