// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Row from "../Row";

afterEach(() => {
  cleanup();
});

describe("activity timeline row presentation", () => {
  it("renders governed category labels and safe lifecycle descriptions", () => {
    render(
      <Row
        item={{
          id: "activity-1",
          event_type: "order.cancelled",
          created_at: "2026-05-20T14:30:00Z",
          created_by_name: "Chris Rossi",
          detail: {
            reason: "Client withdrew request",
          },
        }}
      />,
    );

    expect(screen.getByText("Order cancelled")).toBeInTheDocument();
    expect(screen.getByText("Lifecycle")).toBeInTheDocument();
    expect(screen.getByText("Cancelled: Client withdrew request")).toBeInTheDocument();
    expect(screen.getByText("Actor: Chris R.")).toBeInTheDocument();
  });

  it("renders document category rows without exposing storage internals", () => {
    render(
      <Row
        item={{
          id: "activity-2",
          event_type: "order_document.uploaded",
          created_at: "2026-05-20T14:30:00Z",
          detail: {
            title: "Inspection photos",
            category: "photos",
            visibility_scope: "internal",
            storage_path: "private/order-1/photos.zip",
            bucket: "order-documents",
          },
        }}
      />,
    );

    expect(screen.getByText("Document uploaded")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(
      screen.getByText("Document uploaded: Inspection photos • Category: photos • Visibility: internal"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/private\/order-1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/order-documents/)).not.toBeInTheDocument();
  });

  it("keeps unknown events visible with conservative labels", () => {
    render(
      <Row
        item={{
          id: "activity-3",
          event_type: "legacy_unmapped_event",
          created_at: "2026-05-20T14:30:00Z",
          created_by_email: "reviewer@example.com",
          detail: {
            unsafe_debug_value: "do-not-render",
          },
        }}
      />,
    );

    expect(screen.getByText("Activity event")).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText("Event recorded")).toBeInTheDocument();
    expect(screen.queryByText("do-not-render")).not.toBeInTheDocument();
  });

  it("does not render mutation controls inside timeline rows", () => {
    render(
      <Row
        item={{
          id: "activity-4",
          event_type: "status_changed",
          created_at: "2026-05-20T14:30:00Z",
          detail: {
            from: "new",
            to: "in_review",
          },
        }}
      />,
    );

    expect(screen.getByText("Workflow")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
