// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ReviewContextSummary from "../ReviewContextSummary";

describe("ReviewContextSummary", () => {
  it("renders a read-only review context summary from props", () => {
    render(
      <ReviewContextSummary
        order={{ id: "order-1", status: "needs_revisions" }}
      />,
    );

    expect(screen.getByLabelText("Review context summary")).toBeInTheDocument();
    expect(screen.getByText("Review / Revision Context")).toBeInTheDocument();
    expect(screen.getByText("Derived")).toBeInTheDocument();
    expect(screen.getByText("Revisions open")).toBeInTheDocument();
    expect(screen.getByText("Revision follow-up may still be needed.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders nothing when review context cannot be derived conservatively", () => {
    const { container } = render(
      <ReviewContextSummary order={{ id: "order-1", status: "in_progress" }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
