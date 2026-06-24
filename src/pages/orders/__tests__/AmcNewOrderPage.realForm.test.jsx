// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.hoisted(() => vi.fn());
const successMock = vi.hoisted(() => vi.fn());
const orderClientOptionsMock = vi.hoisted(() => ({
  createOrderFormClient: vi.fn(),
  listOrderFormClientOptions: vi.fn(),
  searchOrderFormClientsByName: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/lib/hooks/useToast", () => ({
  useToast: () => ({
    success: successMock,
  }),
}));

vi.mock("@/features/orders/orderClientOptionsApi", () => orderClientOptionsMock);

const { default: AmcNewOrderPage } = await import("../AmcNewOrderPage.jsx");
const { default: NewOrderPage } = await import("../../NewOrder.jsx");

describe("AMC new order page real form", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    successMock.mockReset();
    orderClientOptionsMock.createOrderFormClient.mockReset();
    orderClientOptionsMock.listOrderFormClientOptions.mockReset();
    orderClientOptionsMock.searchOrderFormClientsByName.mockReset();
    orderClientOptionsMock.listOrderFormClientOptions.mockResolvedValue([
      { id: "client-1", name: "AMC Visible Client", category: "client" },
    ]);
    orderClientOptionsMock.searchOrderFormClientsByName.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it("does not render manual client creation in the AMC direct-create wrapper", async () => {
    render(<AmcNewOrderPage />);

    expect(screen.getByRole("heading", { name: /^New Order$/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Manual client name")).not.toBeInTheDocument();
    expect(screen.getByText("Select an existing client to create this order.")).toBeInTheDocument();

    await waitFor(() => {
      expect(orderClientOptionsMock.listOrderFormClientOptions).toHaveBeenCalledWith({
        operationsScope: "amc_operations",
      });
    });
  });

  it("keeps the compatibility new order page manual client flow unchanged", async () => {
    render(<NewOrderPage />);

    expect(screen.getByRole("heading", { name: /^New Order$/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Manual client name")).toBeInTheDocument();
    expect(screen.queryByText("Select an existing client to create this order.")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(orderClientOptionsMock.listOrderFormClientOptions).toHaveBeenCalledWith();
    });
  });
});
