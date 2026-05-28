// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OrdersTableRow from "../OrdersTableRow";

vi.mock("@/features/orders/attention/OrderRowNextStep", () => ({
  default: () => null,
}));

describe("OrdersTableRow", () => {
  it("renders date-only due timestamps without local timezone day drift", () => {
    render(
      <OrdersTableRow
        order={{
          id: "order-1",
          order_no: "2026001",
          status: "new",
          client_name: "Acme",
          review_due_at: "2026-06-01T00:00:00+00",
          final_due_at: "2026-06-03T00:00:00+00",
        }}
      />,
    );

    expect(screen.getByText("6/1/2026")).toBeInTheDocument();
    expect(screen.getByText("6/3/2026")).toBeInTheDocument();
    expect(screen.queryByText("5/31/2026")).not.toBeInTheDocument();
    expect(screen.queryByText("6/2/2026")).not.toBeInTheDocument();
  });
});
