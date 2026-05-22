// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const clientDetailMock = vi.hoisted(() => vi.fn());
const updateClientMock = vi.hoisted(() => vi.fn());
const appContextMock = vi.hoisted(() => vi.fn());
const useCanMock = vi.hoisted(() => vi.fn());
const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/features/clients/clientManagementApi", () => ({
  getClientManagementDetail: clientDetailMock,
  updateClientManagementClient: updateClientMock,
}));

vi.mock("@/features/auth/useCurrentUserAppContext", () => ({
  useCurrentUserAppContext: appContextMock,
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useCan: useCanMock,
}));

vi.mock("@/lib/permissions/constants", () => ({
  PERMISSIONS: {
    CLIENTS_UPDATE_ALL: "clients.update.all",
  },
}));

vi.mock("@/lib/supabaseClient", () => ({
  default: supabaseMock,
}));

vi.mock("@/components/clients/ClientForm", () => ({
  default: ({ submitLabel }) => (
    <form aria-label="client edit form">
      <button type="submit">{submitLabel}</button>
    </form>
  ),
}));

const { default: ClientDetail } = await import("../ClientDetail");

function createOrdersQuery(data = []) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => Promise.resolve({ data, error: null })),
  };
  return query;
}

function renderDetail({ canUpdate = true, context, client, orders } = {}) {
  useCanMock.mockReturnValue({ allowed: canUpdate });
  appContextMock.mockReturnValue({
    loading: false,
    context: context || {
      user_id: "owner-1",
      is_owner: true,
      is_admin_role: true,
      is_reviewer_role: false,
    },
  });
  clientDetailMock.mockResolvedValue(
    client || {
      id: 42,
      name: "Acme Lending",
      status: "active",
      category: "lender",
      primary_contact_name: "Avery Client",
      primary_contact_phone: "555-0100",
      contact_email_1: "avery@example.test",
      notes: "Preferred morning updates.",
      total_orders: 2,
      avg_total_fee: 500,
      last_order_date: "2026-05-20T12:00:00.000Z",
    },
  );
  const ordersQuery = createOrdersQuery(
    orders || [
      {
        id: "order-1",
        order_number: "26001",
        status: "in_progress",
        address: "100 Main St",
        city: "Boston",
        state: "MA",
        fee_amount: 500,
        created_at: "2026-05-20T12:00:00.000Z",
      },
      {
        id: "order-2",
        order_number: "26002",
        status: "complete",
        address: "200 Main St",
        city: "Boston",
        state: "MA",
        fee_amount: 600,
        created_at: "2026-05-18T12:00:00.000Z",
      },
    ],
  );
  supabaseMock.from.mockReturnValue(ordersQuery);

  render(
    <MemoryRouter
      initialEntries={["/clients/42"]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Routes>
        <Route path="/clients/:id" element={<ClientDetail />} />
      </Routes>
    </MemoryRouter>,
  );

  return ordersQuery;
}

describe("ClientDetail presentation", () => {
  beforeEach(() => {
    clientDetailMock.mockReset();
    updateClientMock.mockReset();
    appContextMock.mockReset();
    useCanMock.mockReset();
    supabaseMock.from.mockReset();
  });

  afterEach(() => {
    cleanup();
    clientDetailMock.mockReset();
    updateClientMock.mockReset();
    appContextMock.mockReset();
    useCanMock.mockReset();
    supabaseMock.from.mockReset();
  });

  it("renders the polished relationship detail hierarchy from existing data", async () => {
    renderDetail();

    expect(screen.getByRole("status")).toHaveTextContent("Loading client relationship...");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Acme Lending" })).toBeInTheDocument();
    });

    expect(screen.getByText("Relationship Detail")).toBeInTheDocument();
    expect(screen.getByText("Lender")).toBeInTheDocument();
    expect(screen.getByText("Active orders")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Client Contact" })).toBeInTheDocument();
    expect(screen.getByText("Avery Client")).toBeInTheDocument();
    expect(screen.getByText("555-0100")).toBeInTheDocument();
    expect(screen.getByText("avery@example.test")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Related Orders" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Visible Order Context" })).toBeInTheDocument();
    expect(screen.getByText("2 total / 1 active / 1 completed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "26001" })).toHaveAttribute("href", "/orders/order-1");
  });

  it("preserves the existing client detail and related-order read path", async () => {
    const ordersQuery = renderDetail({
      context: {
        user_id: "reviewer-1",
        is_owner: false,
        is_admin_role: false,
        is_reviewer_role: true,
      },
    });

    await waitFor(() => {
      expect(clientDetailMock).toHaveBeenCalledWith(42);
      expect(supabaseMock.from).toHaveBeenCalledWith("v_orders_frontend_v4");
    });

    expect(ordersQuery.select).toHaveBeenCalledWith(
      "id, order_number, status, address, city, state, zip, fee_amount, base_fee, appraiser_fee, created_at, review_due_at, final_due_at, due_date",
    );
    expect(ordersQuery.eq).toHaveBeenCalledWith("client_id", 42);
    expect(ordersQuery.eq).toHaveBeenCalledWith("reviewer_id", "reviewer-1");
    expect(ordersQuery.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(ordersQuery.limit).toHaveBeenCalledWith(100);
  });

  it("keeps edit form visibility controlled by the existing update permission", async () => {
    renderDetail({ canUpdate: true });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit Client" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Edit Client" }));
    expect(screen.getByRole("form", { name: "client edit form" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel editing" })).toBeInTheDocument();
  });

  it("does not expose edit controls without update permission", async () => {
    renderDetail({ canUpdate: false });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Acme Lending" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Edit Client" })).not.toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "client edit form" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("banner")).getByRole("button", { name: "Back to Clients" })).toBeInTheDocument();
  });
});
