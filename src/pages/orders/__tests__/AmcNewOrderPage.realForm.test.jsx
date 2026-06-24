// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.hoisted(() => vi.fn());
const successMock = vi.hoisted(() => vi.fn());
const orderClientOptionsMock = vi.hoisted(() => ({
  createOrderFormClient: vi.fn(),
  listOrderFormClientOptions: vi.fn(),
  searchOrderFormClientsByName: vi.fn(),
}));
const ordersServiceMock = vi.hoisted(() => ({
  createOrderViaRpc: vi.fn(),
  isOrderNumberAvailableV2: vi.fn(),
  overrideOrderNumber: vi.fn(),
  updateOrderViaRpc: vi.fn(),
}));
const assignableUsersMock = vi.hoisted(() => ({
  listCompanyAssignableAppraisers: vi.fn(),
  listCompanyAssignableReviewers: vi.fn(),
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

vi.mock("@/lib/services/ordersService", () => ordersServiceMock);

vi.mock("@/features/company-members/assignableUsersApi", () => assignableUsersMock);

const { default: AmcNewOrderPage } = await import("../AmcNewOrderPage.jsx");
const { default: NewOrderPage } = await import("../../NewOrder.jsx");

describe("AMC new order page real form", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    successMock.mockReset();
    orderClientOptionsMock.createOrderFormClient.mockReset();
    orderClientOptionsMock.listOrderFormClientOptions.mockReset();
    orderClientOptionsMock.searchOrderFormClientsByName.mockReset();
    ordersServiceMock.createOrderViaRpc.mockReset();
    ordersServiceMock.isOrderNumberAvailableV2.mockReset();
    ordersServiceMock.overrideOrderNumber.mockReset();
    ordersServiceMock.updateOrderViaRpc.mockReset();
    assignableUsersMock.listCompanyAssignableAppraisers.mockReset();
    assignableUsersMock.listCompanyAssignableReviewers.mockReset();
    orderClientOptionsMock.listOrderFormClientOptions.mockResolvedValue([
      { id: "client-1", name: "AMC Visible Client", category: "client" },
    ]);
    orderClientOptionsMock.searchOrderFormClientsByName.mockResolvedValue([]);
    assignableUsersMock.listCompanyAssignableAppraisers.mockResolvedValue([]);
    assignableUsersMock.listCompanyAssignableReviewers.mockResolvedValue([]);
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

  it("navigates to the AMC-local order detail route after successful create", async () => {
    ordersServiceMock.createOrderViaRpc.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      order_number: "2026009",
    });

    render(<AmcNewOrderPage />);

    await waitFor(() => {
      expect(orderClientOptionsMock.listOrderFormClientOptions).toHaveBeenCalledWith({
        operationsScope: "amc_operations",
      });
    });

    fireEvent.change(screen.getByLabelText(/^Client$/i), { target: { value: "client-1" } });
    fireEvent.change(screen.getByPlaceholderText("123 Main St"), {
      target: { value: "1 AMC Way" },
    });
    fireEvent.change(screen.getByLabelText(/^City$/i), { target: { value: "Columbus" } });
    fireEvent.change(screen.getByLabelText(/^State$/i), { target: { value: "OH" } });
    fireEvent.change(screen.getByLabelText(/^Zip$/i), { target: { value: "43215" } });
    fireEvent.change(screen.getByLabelText(/^Property Type$/i), { target: { value: "Office" } });
    fireEvent.change(screen.getByLabelText(/^Report Type$/i), { target: { value: "Appraisal" } });

    fireEvent.click(screen.getByRole("button", { name: /^Create Order$/i }));

    await waitFor(() => {
      expect(ordersServiceMock.createOrderViaRpc).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: "client-1",
          property_address: "1 AMC Way",
          city: "Columbus",
          state: "OH",
          postal_code: "43215",
          property_type: "Office",
          report_type: "Appraisal",
          manual_client_name: null,
          status: "new",
        }),
        { operationsScope: "amc_operations" },
      );
    });
    expect(successMock).toHaveBeenCalledWith("Order created");
    expect(navigateMock).toHaveBeenCalledWith("/amc/orders/550e8400-e29b-41d4-a716-446655440000");
  });

  it("stays on the AMC create form and surfaces create errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    ordersServiceMock.createOrderViaRpc.mockRejectedValue(new Error("create failed"));

    try {
      render(<AmcNewOrderPage />);

      await waitFor(() => {
        expect(orderClientOptionsMock.listOrderFormClientOptions).toHaveBeenCalled();
      });

      fireEvent.change(screen.getByLabelText(/^Client$/i), { target: { value: "client-1" } });
      fireEvent.change(screen.getByPlaceholderText("123 Main St"), {
        target: { value: "1 AMC Way" },
      });

      fireEvent.click(screen.getByRole("button", { name: /^Create Order$/i }));

      await waitFor(() => {
        expect(screen.getByText("create failed")).toBeInTheDocument();
      });
      expect(navigateMock).not.toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
