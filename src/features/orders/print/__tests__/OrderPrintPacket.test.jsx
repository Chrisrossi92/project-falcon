// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OrderPrintPacket from "../OrderPrintPacket";

describe("OrderPrintPacket", () => {
  it("prints review and final due timestamps as date-only values without timezone drift", () => {
    render(
      <OrderPrintPacket
        order={{
          id: "order-1",
          order_number: "2026001",
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
