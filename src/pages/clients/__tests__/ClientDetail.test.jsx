// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const clientDetailMock = vi.hoisted(() => vi.fn());
const updateClientMock = vi.hoisted(() => vi.fn());
const listClientContactsMock = vi.hoisted(() => vi.fn());
const createClientContactMock = vi.hoisted(() => vi.fn());
const updateClientContactMock = vi.hoisted(() => vi.fn());
const setClientContactStatusMock = vi.hoisted(() => vi.fn());
const setDefaultClientContactMock = vi.hoisted(() => vi.fn());
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

vi.mock("@/features/clients/clientContactsApi", () => ({
  listClientContacts: listClientContactsMock,
  createClientContact: createClientContactMock,
  updateClientContact: updateClientContactMock,
  setClientContactStatus: setClientContactStatusMock,
  setDefaultClientContact: setDefaultClientContactMock,
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

function renderDetail({ canUpdate = true, context, client, orders, contacts, contactLists } = {}) {
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
      contact_mode: "contacts",
      primary_contact_name: "Avery Client",
      primary_contact_phone: "555-0100",
      contact_email_1: "avery@example.test",
      notes: "Preferred morning updates.",
      total_orders: 2,
      avg_total_fee: 500,
      last_order_date: "2026-05-20T12:00:00.000Z",
    },
  );
  if (Array.isArray(contactLists)) {
    contactLists.forEach((list) => {
      listClientContactsMock.mockResolvedValueOnce(list);
    });
  } else {
    listClientContactsMock.mockResolvedValue(
      contacts || [
        {
          id: 12,
          contact_id: 12,
          client_id: 42,
          name: "Avery Desk",
          title: "AMC Coordinator",
          email: "avery.desk@example.test",
          phone: "555-0200",
          notes: "Use for order coordination.",
          status: "active",
          is_default: true,
        },
      ],
    );
  }
  const ordersQuery = createOrdersQuery(
    orders || [
      {
        id: "order-1",
        order_number: "26001",
        status: "in_progress",
        client_id: 42,
        managing_amc_id: null,
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
        client_id: 42,
        managing_amc_id: null,
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
    listClientContactsMock.mockReset();
    createClientContactMock.mockReset();
    updateClientContactMock.mockReset();
    setClientContactStatusMock.mockReset();
    setDefaultClientContactMock.mockReset();
    appContextMock.mockReset();
    useCanMock.mockReset();
    supabaseMock.from.mockReset();
  });

  afterEach(() => {
    cleanup();
    clientDetailMock.mockReset();
    updateClientMock.mockReset();
    listClientContactsMock.mockReset();
    createClientContactMock.mockReset();
    updateClientContactMock.mockReset();
    setClientContactStatusMock.mockReset();
    setDefaultClientContactMock.mockReset();
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
    expect(screen.getByRole("heading", { name: "Contacts" })).toBeInTheDocument();
    expect(screen.getByText("Avery Desk")).toBeInTheDocument();
    expect(screen.getByText("AMC Coordinator")).toBeInTheDocument();
    expect(screen.getByText("avery.desk@example.test")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Client Orders" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Visible Order Context" })).toBeInTheDocument();
    expect(screen.getByText("2 total / 1 active / 1 completed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "26001" })).toHaveAttribute("href", "/orders/order-1");
  });

  it("loads direct client orders for lender and client relationships", async () => {
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
      "id, order_number, status, address, city, state, zip, fee_amount, base_fee, appraiser_fee, created_at, review_due_at, final_due_at, due_date, client_id, managing_amc_id",
    );
    expect(ordersQuery.eq).toHaveBeenCalledWith("client_id", 42);
    expect(ordersQuery.eq).not.toHaveBeenCalledWith("managing_amc_id", 42);
    expect(ordersQuery.eq).toHaveBeenCalledWith("reviewer_id", "reviewer-1");
    expect(ordersQuery.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(ordersQuery.limit).toHaveBeenCalledWith(100);
  });

  it("loads managed orders for AMC relationships without using the direct client filter", async () => {
    const ordersQuery = renderDetail({
      client: {
        id: 42,
        name: "MountainSeed",
        status: "active",
        category: "amc",
        primary_contact_name: "Morgan AMC",
        primary_contact_phone: "555-0101",
        contact_email_1: "morgan@example.test",
        total_orders: 2,
        active_order_count: 2,
        managed_order_count: 2,
        direct_order_count: 0,
      },
      orders: [
        {
          id: "order-ms-1",
          order_number: "26010",
          status: "in_progress",
          client_id: 84,
          managing_amc_id: 42,
          address: "300 Main St",
          city: "Boston",
          state: "MA",
          fee_amount: 650,
          created_at: "2026-05-21T12:00:00.000Z",
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "MountainSeed" })).toBeInTheDocument();
    });

    expect(ordersQuery.eq).toHaveBeenCalledWith("managing_amc_id", 42);
    expect(ordersQuery.eq).not.toHaveBeenCalledWith("client_id", 42);
    expect(screen.getByRole("heading", { name: "Managed Orders" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Managed Order Context" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "26010" })).toHaveAttribute("href", "/orders/order-ms-1");
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

  it("simplifies the legacy contact card when no specific contact is required", async () => {
    renderDetail({
      client: {
        id: 42,
        name: "Portal Managed AMC",
        status: "active",
        category: "amc",
        contact_mode: "no_specific_contact",
        contact_name_1: null,
        contact_email_1: null,
        contact_phone_1: null,
        total_orders: 0,
      },
      contacts: [],
      orders: [],
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Portal Managed AMC" })).toBeInTheDocument();
    });

    expect(
      screen.getByText("No specific client contact is required for this relationship."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This relationship is handled through a portal or general intake process."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contacts" })).toBeInTheDocument();
    expect(screen.getByText("No saved contacts yet.")).toBeInTheDocument();
    expect(screen.queryByText("Primary Contact")).not.toBeInTheDocument();
  });

  it("adds a reusable client contact and refreshes the list", async () => {
    createClientContactMock.mockResolvedValue({
      id: 14,
      client_id: 42,
      name: "Jordan Desk",
      status: "active",
    });
    renderDetail({
      contactLists: [
        [],
        [
          {
            id: 14,
            contact_id: 14,
            client_id: 42,
            name: "Jordan Desk",
            title: "Coordinator",
            email: "jordan@example.test",
            phone: "555-0140",
            status: "active",
            is_default: false,
          },
        ],
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Contacts" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Contact" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Jordan Desk" } });
    fireEvent.change(screen.getByLabelText("Title / Role"), { target: { value: "Coordinator" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jordan@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Contact" }));

    await waitFor(() => {
      expect(createClientContactMock).toHaveBeenCalledWith(42, {
        name: "Jordan Desk",
        title: "Coordinator",
        email: "jordan@example.test",
        phone: null,
        notes: null,
        is_default: false,
      });
    });
    expect(listClientContactsMock).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Jordan Desk")).toBeInTheDocument();
  });

  it("edits a reusable client contact", async () => {
    updateClientContactMock.mockResolvedValue({
      id: 12,
      client_id: 42,
      name: "Avery Updated",
      status: "active",
    });
    renderDetail({
      contactLists: [
        [
          {
            id: 12,
            contact_id: 12,
            client_id: 42,
            name: "Avery Desk",
            title: "AMC Coordinator",
            status: "active",
            is_default: true,
          },
        ],
        [
          {
            id: 12,
            contact_id: 12,
            client_id: 42,
            name: "Avery Updated",
            title: "Coordinator",
            status: "active",
            is_default: true,
          },
        ],
      ],
    });

    await waitFor(() => {
      expect(screen.getByText("Avery Desk")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Edit Contact" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Avery Updated" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Contact" }));

    await waitFor(() => {
      expect(updateClientContactMock).toHaveBeenCalledWith(12, {
        name: "Avery Updated",
        title: "AMC Coordinator",
        email: null,
        phone: null,
        notes: null,
        is_default: true,
      });
    });
    expect(await screen.findByText("Avery Updated")).toBeInTheDocument();
  });

  it("deactivates, reactivates, and sets a default contact", async () => {
    setClientContactStatusMock.mockResolvedValue({});
    setDefaultClientContactMock.mockResolvedValue({});
    renderDetail({
      contacts: [
        {
          id: 12,
          contact_id: 12,
          client_id: 42,
          name: "Avery Desk",
          status: "active",
          is_default: false,
        },
        {
          id: 13,
          contact_id: 13,
          client_id: 42,
          name: "Morgan Archive",
          status: "inactive",
          is_default: false,
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText("Morgan Archive")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Deactivate Contact" }));
    expect(setClientContactStatusMock).toHaveBeenCalledWith(12, "inactive");

    fireEvent.click(screen.getByRole("button", { name: "Reactivate Contact" }));
    expect(setClientContactStatusMock).toHaveBeenCalledWith(13, "active");

    fireEvent.click(screen.getByRole("button", { name: "Set Default" }));
    expect(setDefaultClientContactMock).toHaveBeenCalledWith(12);
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });
});
