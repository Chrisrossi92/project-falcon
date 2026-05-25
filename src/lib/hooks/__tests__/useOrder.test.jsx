// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getOrderMock = vi.hoisted(() => vi.fn());
const mapOrderRowMock = vi.hoisted(() => vi.fn((row) => row));

vi.mock("@/lib/services/ordersService", () => ({
  getOrder: getOrderMock,
}));

vi.mock("@/lib/mappers/orderMapper", () => ({
  mapOrderRow: mapOrderRowMock,
}));

const { default: useOrder } = await import("../useOrder.js");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function UseOrderHarness({ id = "order-1" }) {
  const { order, loading, error, refresh } = useOrder(id);

  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="order-number">{order?.order_number || "none"}</div>
      <div data-testid="error">{error?.message || "none"}</div>
      <input aria-label="Unsaved note" defaultValue="draft note" />
      <button type="button" onClick={refresh}>
        Refresh order
      </button>
    </div>
  );
}

describe("useOrder", () => {
  afterEach(() => {
    cleanup();
    getOrderMock.mockReset();
    mapOrderRowMock.mockClear();
  });

  it("keeps refresh non-destructive after the initial order load", async () => {
    getOrderMock.mockResolvedValueOnce({ id: "order-1", order_number: "CF-1001" });

    render(<UseOrderHarness />);

    await waitFor(() => {
      expect(screen.getByTestId("order-number")).toHaveTextContent("CF-1001");
    });
    expect(screen.getByTestId("loading")).toHaveTextContent("false");

    const refreshResult = deferred();
    getOrderMock.mockReturnValueOnce(refreshResult.promise);

    fireEvent.change(screen.getByLabelText("Unsaved note"), {
      target: { value: "draft note still editing" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Refresh order" }));

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByLabelText("Unsaved note")).toHaveValue("draft note still editing");

    refreshResult.resolve({ id: "order-1", order_number: "CF-1001-R" });

    await waitFor(() => {
      expect(screen.getByTestId("order-number")).toHaveTextContent("CF-1001-R");
    });
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByLabelText("Unsaved note")).toHaveValue("draft note still editing");
  });
});
