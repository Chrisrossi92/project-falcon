// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.hoisted(() => vi.fn());
const successMock = vi.hoisted(() => vi.fn());
const supabaseMock = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));
const orderClientOptionsMock = vi.hoisted(() => ({
  createOrderFormClient: vi.fn(),
  listOrderFormClientOptions: vi.fn(),
  searchOrderFormClientsByName: vi.fn(),
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

vi.mock("@/lib/supabaseClient", () => ({
  default: supabaseMock,
}));

vi.mock("@/features/orders/orderClientOptionsApi", () => orderClientOptionsMock);

vi.mock("@/features/company-members/assignableUsersApi", () => assignableUsersMock);

vi.mock("@/lib/services/notificationsService", () => ({
  emitNotification: vi.fn(),
  fetchAdminRecipients: vi.fn(),
  fetchOrderRoleRecipients: vi.fn(),
}));

vi.mock("@/lib/orders/resolveOrderParticipants", () => ({
  resolveOrderParticipants: vi.fn(),
}));

vi.mock("@/lib/workflow/orderWorkflowGuards", () => ({
  assertOrderWorkflowTransition: vi.fn(),
}));

const { default: AmcNewOrderPage } = await import("../AmcNewOrderPage.jsx");
const { default: NewOrderPage } = await import("../../NewOrder.jsx");

describe("AMC new order page RPC integration", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    successMock.mockReset();
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockReset();
    orderClientOptionsMock.createOrderFormClient.mockReset();
    orderClientOptionsMock.listOrderFormClientOptions.mockReset();
    orderClientOptionsMock.searchOrderFormClientsByName.mockReset();
    assignableUsersMock.listCompanyAssignableAppraisers.mockReset();
    assignableUsersMock.listCompanyAssignableReviewers.mockReset();

    orderClientOptionsMock.listOrderFormClientOptions.mockResolvedValue([
      { id: "client-1", name: "AMC Visible Client", category: "client" },
    ]);
    orderClientOptionsMock.createOrderFormClient.mockResolvedValue({
      id: "client-created",
      name: "Manual Internal Client",
    });
    orderClientOptionsMock.searchOrderFormClientsByName.mockResolvedValue([]);
    assignableUsersMock.listCompanyAssignableAppraisers.mockResolvedValue([]);
    assignableUsersMock.listCompanyAssignableReviewers.mockResolvedValue([]);
    supabaseMock.rpc.mockResolvedValue({
      data: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        order_number: "2026010",
        operations_scope: "amc_operations",
      },
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("submits AMC direct create with p_operations_scope in the actual Supabase RPC args", async () => {
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
      expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_create_order", {
        payload: expect.objectContaining({
          operations_scope: "amc_operations",
          client_id: "client-1",
          property_address: "1 AMC Way",
          city: "Columbus",
          state: "OH",
          postal_code: "43215",
          property_type: "Office",
          report_type: "Appraisal",
          status: "new",
        }),
        p_operations_scope: "amc_operations",
      });
    });
  });

  it("keeps compatibility create RPC args payload-only", async () => {
    render(<NewOrderPage />);

    await waitFor(() => {
      expect(orderClientOptionsMock.listOrderFormClientOptions).toHaveBeenCalledWith();
    });

    fireEvent.change(screen.getByPlaceholderText("Manual client name"), {
      target: { value: "Manual Internal Client" },
    });
    fireEvent.change(screen.getByPlaceholderText("123 Main St"), {
      target: { value: "1 Internal Way" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^Create Order$/i }));

    await waitFor(() => {
      expect(supabaseMock.rpc).toHaveBeenCalledWith("rpc_create_order", {
        payload: expect.objectContaining({
          client_id: "client-created",
          manual_client_name: null,
          property_address: "1 Internal Way",
          status: "new",
        }),
      });
    });
  });
});
