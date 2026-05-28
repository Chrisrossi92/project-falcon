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
  default: ({ value, onChange }) => (
    <div>
      <label>
        Manual Client Name
        <input
          aria-label="Manual Client Name"
          value={value.manual_client_name || ""}
          onChange={(event) => onChange({ manual_client_name: event.target.value })}
        />
      </label>
      <label>
        AMC
        <input
          aria-label="AMC"
          value={value.managing_amc_id || ""}
          onChange={(event) => onChange({ managing_amc_id: event.target.value })}
        />
      </label>
      <label>
        Client
        <input
          aria-label="Client"
          value={value.client_id || ""}
          onChange={(event) => onChange({ client_id: event.target.value })}
        />
      </label>
      <label>
        Client Contact
        <input
          aria-label="Client Contact"
          value={value.client_contact_id || ""}
          onChange={(event) => onChange({ client_contact_id: event.target.value })}
        />
      </label>
      <label>
        Property Contact Name
        <input
          aria-label="Property Contact Name"
          value={value.entry_contact_name || ""}
          onChange={(event) => onChange({ entry_contact_name: event.target.value })}
        />
      </label>
      <label>
        Property Contact Phone
        <input
          aria-label="Property Contact Phone"
          value={value.entry_contact_phone || ""}
          onChange={(event) => onChange({ entry_contact_phone: event.target.value })}
        />
      </label>
    </div>
  ),
}));

vi.mock("../AssignmentFields", () => ({
  default: ({ value, onChange, isEdit }) => (
    <div>
      {isEdit ? (
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
      )}
      <label>
        Appraiser
        <input
          aria-label="Appraiser"
          value={value.appraiser_id || ""}
          onChange={(event) => onChange({ appraiser_id: event.target.value })}
        />
      </label>
      <label>
        Reviewer
        <input
          aria-label="Reviewer"
          value={value.reviewer_id || ""}
          onChange={(event) => onChange({ reviewer_id: event.target.value })}
        />
      </label>
      <label>
        Split %
        <input
          aria-label="Split %"
          value={value.split_pct || ""}
          onChange={(event) => onChange({ split_pct: event.target.value })}
        />
      </label>
      <label>
        Base Fee
        <input
          aria-label="Base Fee"
          value={value.base_fee || ""}
          onChange={(event) => onChange({ base_fee: event.target.value })}
        />
      </label>
      <label>
        Appraiser Fee
        <input
          aria-label="Appraiser Fee"
          value={value.appraiser_fee || ""}
          onChange={(event) => onChange({ appraiser_fee: event.target.value })}
        />
      </label>
    </div>
  ),
}));

vi.mock("../PropertyFields", () => ({
  default: ({ value, onChange }) => (
    <div>
      <label>
        Property Address
        <input
          aria-label="Property Address"
          value={value.address_line1 || ""}
          onChange={(event) => onChange({ address_line1: event.target.value })}
        />
      </label>
      <label>
        Property Type
        <input
          aria-label="Property Type"
          value={value.property_type || ""}
          onChange={(event) => onChange({ property_type: event.target.value })}
        />
      </label>
      <label>
        Report Type
        <input
          aria-label="Report Type"
          value={value.report_type || ""}
          onChange={(event) => onChange({ report_type: event.target.value })}
        />
      </label>
    </div>
  ),
}));

vi.mock("../DatesFields", () => ({
  default: ({ values, onChange }) => (
    <div data-testid="dates-fields">
      <label>
        Site Visit
        <input
          aria-label="Site Visit"
          value={values.site_visit_at || ""}
          onChange={(event) => onChange({ target: { name: "site_visit_at", value: event.target.value } })}
        />
      </label>
      <label>
        Reviewer Due
        <input
          aria-label="Reviewer Due"
          value={values.review_due_at || ""}
          onChange={(event) => onChange({ target: { name: "review_due_at", value: event.target.value } })}
        />
      </label>
      <label>
        Final Due
        <input
          aria-label="Final Due"
          value={values.final_due_at || ""}
          onChange={(event) => onChange({ target: { name: "final_due_at", value: event.target.value } })}
        />
      </label>
    </div>
  ),
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

  it("includes the supported intake, assignment, fee, contact, and due date fields in the create payload", async () => {
    const createdOrder = {
      id: "order-created",
      order_number: "2026004",
    };
    const onSaved = vi.fn();
    ordersServiceMock.createOrderViaRpc.mockResolvedValue(createdOrder);

    render(<OrderForm onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText("AMC"), {
      target: { value: "44" },
    });
    fireEvent.change(screen.getByLabelText("Client"), {
      target: { value: "101" },
    });
    fireEvent.change(screen.getByLabelText("Client Contact"), {
      target: { value: "202" },
    });
    fireEvent.change(screen.getByLabelText("Property Type"), {
      target: { value: "Industrial" },
    });
    fireEvent.change(screen.getByLabelText("Report Type"), {
      target: { value: "Appraisal" },
    });
    fireEvent.change(screen.getByLabelText("Reviewer Due"), {
      target: { value: "2026-06-02" },
    });
    fireEvent.change(screen.getByLabelText("Final Due"), {
      target: { value: "2026-06-05" },
    });
    fireEvent.change(screen.getByLabelText("Appraiser"), {
      target: { value: "appraiser-1" },
    });
    fireEvent.change(screen.getByLabelText("Reviewer"), {
      target: { value: "reviewer-1" },
    });
    fireEvent.change(screen.getByLabelText("Split %"), {
      target: { value: "42.5" },
    });
    fireEvent.change(screen.getByLabelText("Base Fee"), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByLabelText("Appraiser Fee"), {
      target: { value: "425" },
    });
    fireEvent.change(screen.getByLabelText("Property Contact Name"), {
      target: { value: "Casey Contact" },
    });
    fireEvent.change(screen.getByLabelText("Property Contact Phone"), {
      target: { value: "(555) 123-4567" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create Order" }).closest("form"));

    await waitFor(() => {
      expect(ordersServiceMock.createOrderViaRpc).toHaveBeenCalledTimes(1);
    });

    expect(ordersServiceMock.createOrderViaRpc).toHaveBeenCalledWith(
      expect.objectContaining({
        managing_amc_id: "44",
        client_id: "101",
        client_contact_id: "202",
        property_type: "Industrial",
        report_type: "Appraisal",
        review_due_at: "2026-06-02",
        final_due_at: "2026-06-05",
        appraiser_id: "appraiser-1",
        reviewer_id: "reviewer-1",
        split_pct: 42.5,
        base_fee: 1000,
        appraiser_fee: 425,
        entry_contact_name: "Casey Contact",
        entry_contact_phone: "555-123-4567",
        property_contact_name: "Casey Contact",
        property_contact_phone: "555-123-4567",
        status: "new",
      }),
    );
    expect(onSaved).toHaveBeenCalledWith(createdOrder);
  });

  it("uses a V1 public special instructions label", () => {
    render(<OrderForm />);

    expect(screen.getByText("Special Instructions")).toBeInTheDocument();
    expect(screen.queryByText("Special Instructions (Internal)")).not.toBeInTheDocument();
  });

  it("hydrates date-only due fields from midnight UTC timestamps without shifting a day early", () => {
    render(
      <OrderForm
        order={{
          id: "order-1",
          order_number: "2026001",
          review_due_at: "2026-06-01T00:00:00+00",
          final_due_at: "2026-06-03T00:00:00+00",
        }}
      />,
    );

    expect(screen.getByLabelText("Reviewer Due")).toHaveValue("2026-06-01");
    expect(screen.getByLabelText("Final Due")).toHaveValue("2026-06-03");
  });

  it("submits site visit appointments as local wall time while keeping due dates date-only", async () => {
    const createdOrder = {
      id: "order-created",
      order_number: "2026005",
    };
    const onSaved = vi.fn();
    ordersServiceMock.createOrderViaRpc.mockResolvedValue(createdOrder);

    render(<OrderForm onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText("Site Visit"), {
      target: { value: "2026-06-02T11:00" },
    });
    fireEvent.change(screen.getByLabelText("Reviewer Due"), {
      target: { value: "2026-06-03" },
    });
    fireEvent.change(screen.getByLabelText("Final Due"), {
      target: { value: "2026-06-05" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create Order" }).closest("form"));

    await waitFor(() => {
      expect(ordersServiceMock.createOrderViaRpc).toHaveBeenCalledTimes(1);
    });

    expect(ordersServiceMock.createOrderViaRpc).toHaveBeenCalledWith(
      expect.objectContaining({
        site_visit_at: "2026-06-02T11:00:00",
        review_due_at: "2026-06-03",
        final_due_at: "2026-06-05",
      }),
    );
    expect(onSaved).toHaveBeenCalledWith(createdOrder);
  });

  it("reuses an existing client when manual client name matches exactly after normalization", async () => {
    const createdOrder = {
      id: "order-created",
      order_number: "2026002",
    };
    const onSaved = vi.fn();
    orderClientOptionsMock.searchOrderFormClientsByName.mockResolvedValue([
      { id: "client-existing", name: "ACME Appraisal" },
    ]);
    ordersServiceMock.createOrderViaRpc.mockResolvedValue(createdOrder);

    render(<OrderForm onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText("Manual Client Name"), {
      target: { value: "  acme   appraisal  " },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create Order" }).closest("form"));

    await waitFor(() => {
      expect(ordersServiceMock.createOrderViaRpc).toHaveBeenCalledTimes(1);
    });

    expect(orderClientOptionsMock.searchOrderFormClientsByName).toHaveBeenCalledWith(
      "acme   appraisal",
      10,
    );
    expect(orderClientOptionsMock.createOrderFormClient).not.toHaveBeenCalled();
    expect(ordersServiceMock.createOrderViaRpc).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "client-existing",
        manual_client_name: null,
        status: "new",
      }),
    );
    expect(onSaved).toHaveBeenCalledWith(createdOrder);
  });

  it("creates and links a client when manual client name has no exact match", async () => {
    const createdOrder = {
      id: "order-created",
      order_number: "2026003",
    };
    const onSaved = vi.fn();
    orderClientOptionsMock.searchOrderFormClientsByName.mockResolvedValue([]);
    orderClientOptionsMock.createOrderFormClient.mockResolvedValue({
      id: "client-created",
      name: "ACME Appraisal",
    });
    ordersServiceMock.createOrderViaRpc.mockResolvedValue(createdOrder);

    render(<OrderForm onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText("Manual Client Name"), {
      target: { value: "ACME Appraisal" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create Order" }).closest("form"));

    await waitFor(() => {
      expect(ordersServiceMock.createOrderViaRpc).toHaveBeenCalledTimes(1);
    });

    expect(orderClientOptionsMock.createOrderFormClient).toHaveBeenCalledWith({
      name: "ACME Appraisal",
      amcId: null,
    });
    expect(ordersServiceMock.createOrderViaRpc).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "client-created",
        manual_client_name: null,
        status: "new",
      }),
    );
    expect(onSaved).toHaveBeenCalledWith(createdOrder);
  });

  it("does not create the order when automatic client creation fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    orderClientOptionsMock.searchOrderFormClientsByName.mockResolvedValue([]);
    orderClientOptionsMock.createOrderFormClient.mockRejectedValue(
      new Error("client_name_already_exists"),
    );

    try {
      render(<OrderForm onSaved={vi.fn()} />);

      fireEvent.change(screen.getByLabelText("Manual Client Name"), {
        target: { value: "ACME Appraisal" },
      });
      fireEvent.submit(screen.getByRole("button", { name: "Create Order" }).closest("form"));

      await waitFor(() => {
        expect(screen.getByText("A client with this name already exists.")).toBeInTheDocument();
      });

      expect(ordersServiceMock.createOrderViaRpc).not.toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
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
