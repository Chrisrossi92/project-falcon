// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OrderAttentionSummaryPanel from "../OrderAttentionSummaryPanel";

describe("OrderAttentionSummaryPanel", () => {
  it("renders read-only derived signals from props", () => {
    render(
      <OrderAttentionSummaryPanel
        order={{
          id: "order-1",
          status: "needs_revisions",
          final_due_at: "2020-01-01T12:00:00.000Z",
          site_visit_at: null,
          updated_at: "2020-01-01T12:00:00.000Z",
        }}
        documents={[]}
      />,
    );

    expect(screen.getByLabelText("Order attention summary")).toBeInTheDocument();
    expect(screen.getByText("Attention Summary")).toBeInTheDocument();
    expect(screen.getByText("Derived")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("Revisions open")).toBeInTheDocument();
    expect(screen.getByText("No files loaded")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders nothing without an order", () => {
    const { container } = render(<OrderAttentionSummaryPanel />);

    expect(container).toBeEmptyDOMElement();
  });
});
