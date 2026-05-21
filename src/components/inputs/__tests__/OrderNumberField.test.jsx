// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const isOrderNumberAvailableV2Mock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/ordersService", () => ({
  isOrderNumberAvailableV2: isOrderNumberAvailableV2Mock,
}));

const { default: OrderNumberField } = await import("../OrderNumberField.jsx");

describe("OrderNumberField availability checks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    isOrderNumberAvailableV2Mock.mockReset();
    isOrderNumberAvailableV2Mock.mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("does not check availability when no order number is provided", async () => {
    render(<OrderNumberField value="" onChange={vi.fn()} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(isOrderNumberAvailableV2Mock).not.toHaveBeenCalled();
    expect(screen.queryByText("Checking…")).not.toBeInTheDocument();
  });

  it("uses the company-scoped v2 availability RPC wrapper for nonblank values", async () => {
    render(<OrderNumberField value="2026001" orderId="order-1" onChange={vi.fn()} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(isOrderNumberAvailableV2Mock).toHaveBeenCalledWith("2026001", {
      orderId: "order-1",
    });
    expect(screen.getByText("Available")).toBeInTheDocument();
  });

  it("renders conflict state from the v2 availability response", async () => {
    isOrderNumberAvailableV2Mock.mockResolvedValue(false);

    render(<OrderNumberField value="2026001" orderId="order-1" onChange={vi.fn()} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.getByText("Already used")).toBeInTheDocument();
  });
});
