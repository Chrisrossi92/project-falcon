// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OrderRowNextStep from "../OrderRowNextStep";

describe("OrderRowNextStep", () => {
  it("renders one read-only support chip from row props", () => {
    render(
      <OrderRowNextStep
        order={{
          id: "order-1",
          status: "needs_revisions",
          final_due_at: "2099-05-24T12:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByLabelText("Order row next step")).toBeInTheDocument();
    expect(screen.getByText("Needs revisions")).toBeInTheDocument();
    expect(screen.getByText("Revision request is still open.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders nothing when no conservative row signal exists", () => {
    const { container } = render(
      <OrderRowNextStep
        order={{
          id: "order-1",
          status: "in_progress",
          final_due_at: "2099-05-24T12:00:00.000Z",
          site_visit_at: "2099-05-20T12:00:00.000Z",
          updated_at: "2099-05-20T12:00:00.000Z",
        }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
