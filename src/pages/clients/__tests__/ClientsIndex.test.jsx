// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ClientsIndex from "../ClientsIndex";

const listClientsMock = vi.hoisted(() => vi.fn());
const listAssignedOrderClientsMock = vi.hoisted(() => vi.fn());
const useCanMock = vi.hoisted(() => vi.fn());
const clientCardMock = vi.hoisted(() => vi.fn());
const shellProfileMock = vi.hoisted(() => ({
  profileId: "operations",
  appContext: { user_id: "user-1" },
}));

vi.mock("@/features/clients/clientManagementApi", () => ({
  listClientManagementClients: listClientsMock,
  listAssignedOrderClients: listAssignedOrderClientsMock,
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useCan: useCanMock,
}));

vi.mock("@/lib/permissions/constants", () => ({
  PERMISSIONS: {
    CLIENTS_CREATE: "clients.create",
  },
}));

vi.mock("@/lib/shell/useShellProfile", () => ({
  useShellProfile: () => shellProfileMock,
}));

vi.mock("@/lib/shell/resolveShellProfile", () => ({
  SHELL_PROFILE_IDS: {
    OPERATIONS: "operations",
    MY_WORK: "my_work",
  },
}));

vi.mock("@/components/clients/ClientCard", () => ({
  default: (props) => {
    clientCardMock(props);
    return (
      <article data-testid="client-card">
        <h3>{props.client.name}</h3>
        <span>{props.client.category}</span>
      </article>
    );
  },
}));

function renderClients({ canCreate = true, rows = [] } = {}) {
  useCanMock.mockReturnValue({ allowed: canCreate });
  listClientsMock.mockResolvedValue(rows);
  listAssignedOrderClientsMock.mockResolvedValue(rows);

  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <ClientsIndex />
    </MemoryRouter>,
  );
}

describe("ClientsIndex workspace polish", () => {
  beforeEach(() => {
    listClientsMock.mockReset();
    listAssignedOrderClientsMock.mockReset();
    useCanMock.mockReset();
    clientCardMock.mockClear();
    Object.assign(shellProfileMock, {
      profileId: "operations",
      appContext: { user_id: "user-1" },
    });
  });

  afterEach(() => {
    cleanup();
    listClientsMock.mockReset();
    listAssignedOrderClientsMock.mockReset();
    useCanMock.mockReset();
    clientCardMock.mockReset();
  });

  it("renders the relationship-management workspace hierarchy without changing card data", async () => {
    renderClients({
      rows: [
        {
          id: "client-1",
          name: "Acme Lending",
          status: "active",
          category: "lender",
          primary_contact: "Avery Client",
          phone: "555-0100",
          total_orders: 7,
          avg_fee: 450,
          last_activity: "2026-05-20",
        },
      ],
    });

    expect(screen.getByRole("heading", { name: "Clients Workspace" })).toBeInTheDocument();
    expect(screen.getByText("Relationship Management")).toBeInTheDocument();
    expect(screen.getByLabelText("Clients workspace context")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Relationship Controls" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Client Directory" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New Client" })).toHaveAttribute(
      "href",
      "/clients/new",
    );

    await waitFor(() => {
      expect(screen.getByTestId("client-card")).toHaveTextContent("Acme Lending");
    });

    expect(screen.getByLabelText("Client relationship cards")).toBeInTheDocument();
    expect(listClientsMock).toHaveBeenCalledWith({
      search: "",
      category: "all",
      sort: "orders_desc",
    });
    expect(clientCardMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        client: expect.objectContaining({
          id: "client-1",
          name: "Acme Lending",
          category: "Lender",
        }),
        metrics: expect.objectContaining({
          total_orders: 7,
        }),
      }),
    );
  });

  it("preserves search, category, and sort query inputs", async () => {
    renderClients();

    await waitFor(() => {
      expect(listClientsMock).toHaveBeenCalledWith({
        search: "",
        category: "all",
        sort: "orders_desc",
      });
    });

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "bank" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lenders" }));
    fireEvent.change(screen.getByLabelText("Sort"), {
      target: { value: "name_asc" },
    });

    await waitFor(() => {
      expect(listClientsMock).toHaveBeenLastCalledWith({
        search: "bank",
        category: "lender",
        sort: "name_asc",
      });
    });

    expect(screen.getByText(/Search: bank/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lenders", pressed: true })).toBeInTheDocument();
  });

  it("keeps client creation hidden when create permission is unavailable", () => {
    renderClients({ canCreate: false });

    expect(screen.queryByRole("link", { name: "New Client" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Clients Workspace" })).toBeInTheDocument();
  });

  it("derives appraiser clients from assigned order rows instead of management relationships", async () => {
    Object.assign(shellProfileMock, {
      profileId: "my_work",
      appContext: { user_id: "chris-user" },
    });

    renderClients({
      rows: [
        {
          id: "client-acme-capital",
          name: "Acme Capital",
          status: "active",
          category: "Client",
          total_orders: 1,
          avg_fee: 500,
          last_activity: "2026-05-20",
        },
        {
          id: "client-acme-appraisal",
          name: "ACME Appraisal",
          status: "active",
          category: "Client",
          total_orders: 1,
          avg_fee: 625,
          last_activity: "2026-05-22",
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByText("Acme Capital")).toBeInTheDocument();
      expect(screen.getByText("ACME Appraisal")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Clients" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "New Client" })).not.toBeInTheDocument();
    expect(listAssignedOrderClientsMock).toHaveBeenCalledWith({
      search: "",
      category: "all",
      sort: "orders_desc",
      appraiserId: "chris-user",
    });
    expect(listClientsMock).not.toHaveBeenCalled();
    expect(screen.getAllByTestId("client-card")).toHaveLength(2);
  });

  it("renders a polished empty state without changing filter behavior", async () => {
    renderClients({ rows: [] });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "No clients match these filters" })).toBeInTheDocument();
    });
    expect(screen.getAllByText("0 clients").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("client-card")).not.toBeInTheDocument();
  });
});
