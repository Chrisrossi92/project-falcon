// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.hoisted(() => vi.fn());

const ordersServiceMock = vi.hoisted(() => ({
  createOrder: vi.fn(),
  createOrderViaRpc: vi.fn(),
  overrideOrderNumber: vi.fn(),
  updateOrder: vi.fn(),
  updateOrderViaRpc: vi.fn(),
}));

const orderClientOptionsMock = vi.hoisted(() => ({
  createOrderFormClient: vi.fn(),
  searchOrderFormClientsByName: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/lib/services/ordersService", () => ordersServiceMock);

vi.mock("@/features/orders/orderClientOptionsApi", () => orderClientOptionsMock);

vi.mock("../ClientFields", () => ({
  default: () => <div data-testid="client-fields" />,
}));

vi.mock("../AssignmentFields", () => ({
  default: ({ value, onChange, isEdit }) =>
    isEdit ? (
      <label>
        Order #
        <input
          aria-label="Order #"
          value={value.order_number || ""}
          onChange={(event) => onChange({ order_number: event.target.value })}
        />
      </label>
    ) : (
      <div aria-label="Order number generated on save">Generated on save</div>
    ),
}));

vi.mock("../PropertyFields", () => ({
  default: ({ value, onChange }) => (
    <label>
      Property Address
      <input
        aria-label="Property Address"
        value={value.address_line1 || ""}
        onChange={(event) => onChange({ address_line1: event.target.value })}
      />
    </label>
  ),
}));

vi.mock("../DatesFields", () => ({
  default: () => <div data-testid="dates-fields" />,
}));

const { default: OrderForm } = await import("../OrderForm.jsx");

describe("OrderForm", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    ordersServiceMock.createOrder.mockReset();
    ordersServiceMock.createOrderViaRpc.mockReset();
    ordersServiceMock.overrideOrderNumber.mockReset();
    ordersServiceMock.updateOrder.mockReset();
    ordersServiceMock.updateOrderViaRpc.mockReset();
    orderClientOptionsMock.createOrderFormClient.mockReset();
    orderClientOptionsMock.searchOrderFormClientsByName.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("uses the guarded RPC create service for new order submit", async () => {
    const createdOrder = {
      id: "order-created",
      order_number: "2026002",
    };
    const onSaved = vi.fn();
    ordersServiceMock.createOrderViaRpc.mockResolvedValue(createdOrder);

    render(<OrderForm onSaved={onSaved} />);

    expect(screen.getAllByText("Generated on save").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText("Order number generated on save")).toBeInTheDocument();
    expect(screen.queryByLabelText("Order #")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Property Address"), {
      target: { value: "1 Main St" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create Order" }).closest("form"));

    await waitFor(() => {
      expect(ordersServiceMock.createOrderViaRpc).toHaveBeenCalledTimes(1);
    });

    expect(ordersServiceMock.createOrder).not.toHaveBeenCalled();
    expect(ordersServiceMock.updateOrder).not.toHaveBeenCalled();
    expect(ordersServiceMock.updateOrderViaRpc).not.toHaveBeenCalled();
    expect(ordersServiceMock.createOrderViaRpc).toHaveBeenCalledWith(
      expect.objectContaining({
        property_address: "1 Main St",
        status: "new",
      }),
    );
    expect(ordersServiceMock.createOrderViaRpc.mock.calls[0][0]).not.toHaveProperty("order_number");
    expect(onSaved).toHaveBeenCalledWith(createdOrder);
  });

  it("uses the guarded RPC update service for edit submit without carrying order number", async () => {
    const updatedOrder = {
      id: "order-existing",
      order_number: "2025123",
    };
    const onSaved = vi.fn();
    ordersServiceMock.updateOrderViaRpc.mockResolvedValue(updatedOrder);

    render(
      <OrderForm
        order={{
          id: "order-existing",
          order_number: "2025123",
          property_address: "Existing Address",
          status: "new",
        }}
        onSaved={onSaved}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Order #")).toHaveValue("2025123");
    });

    fireEvent.change(screen.getByLabelText("Order #"), {
      target: { value: "SHOULD-NOT-SAVE" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Save Changes" }).closest("form"));

    await waitFor(() => {
      expect(ordersServiceMock.updateOrderViaRpc).toHaveBeenCalledTimes(1);
    });

    expect(ordersServiceMock.updateOrderViaRpc).toHaveBeenCalledWith(
      "order-existing",
      expect.not.objectContaining({
        order_number: expect.anything(),
      }),
    );
    expect(ordersServiceMock.updateOrder).not.toHaveBeenCalled();
    expect(ordersServiceMock.createOrderViaRpc).not.toHaveBeenCalled();
    expect(ordersServiceMock.createOrder).not.toHaveBeenCalled();
    expect(ordersServiceMock.overrideOrderNumber).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith(updatedOrder);
  });

  it("does not prefetch an authoritative order number in create mode", () => {
    render(<OrderForm onSaved={vi.fn()} />);

    expect(screen.getAllByText("Generated on save").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText("Order number generated on save")).toBeInTheDocument();
    expect(screen.queryByLabelText("Order #")).not.toBeInTheDocument();
  });
});
