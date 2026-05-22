// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UnifiedOrdersTable from "../UnifiedOrdersTable";

const useOrdersMock = vi.hoisted(() => vi.fn());
const useColumnsConfigMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/hooks/useSession", () => ({
  default: () => ({ user: { id: "auth-user-1" } }),
}));

vi.mock("@/lib/hooks/useOrders", () => ({
  useOrders: useOrdersMock,
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useEffectivePermissions: () => ({
    loading: false,
    error: null,
    hasPermission: () => true,
  }),
}));

vi.mock("@/lib/hooks/useToast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/features/auth/useCurrentUserAppContext", () => ({
  useCurrentUserAppContext: () => ({
    loading: false,
    context: {
      user_id: "app-user-1",
      is_owner: true,
      is_admin_role: true,
      primary_role_key: "owner",
    },
  }),
}));

vi.mock("@/features/orders/columns/useColumnsConfig", () => ({
  default: useColumnsConfigMock,
}));

vi.mock("@/components/orders/drawer/OrderDrawerContent", () => ({
  default: ({ order }) => <div>Drawer for {order?.order_number}</div>,
}));

vi.mock("@/components/orders/WorkflowNoteModal", () => ({
  default: () => null,
}));

const rows = [
  {
    id: "order-1",
    order_number: "2026001",
    client_name: "Acme Lending",
    status: "new",
  },
  {
    id: "order-2",
    order_number: "2026002",
    client_name: "North Bank",
    status: "in_review",
  },
];

function renderTable(props = {}) {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <UnifiedOrdersTable {...props} />
    </MemoryRouter>,
  );
}

describe("UnifiedOrdersTable presentation", () => {
  beforeEach(() => {
    useOrdersMock.mockReturnValue({
      data: rows,
      count: rows.length,
      loading: false,
      error: null,
      filters: { page: 0, pageSize: 15 },
      setFilters: vi.fn(),
    });

    useColumnsConfigMock.mockReturnValue([
      {
        key: "order",
        width: "minmax(140px,1fr)",
        header: () => "Order / Status",
        cell: (order) => order.order_number,
      },
      {
        key: "client",
        width: "minmax(140px,1fr)",
        header: () => "Client",
        cell: (order) => order.client_name,
      },
    ]);
  });

  afterEach(() => {
    cleanup();
    useOrdersMock.mockReset();
    useColumnsConfigMock.mockReset();
  });

  it("renders the active table chrome without changing loaded rows", () => {
    renderTable();

    expect(screen.getByLabelText("Orders table")).toBeInTheDocument();
    expect(screen.getByText("Orders Table")).toBeInTheDocument();
    expect(screen.getByText("Active orders")).toBeInTheDocument();
    expect(screen.getByText("Active operational inventory only.")).toBeInTheDocument();
    expect(screen.getAllByText("2 total")[0]).toBeInTheDocument();
    expect(screen.getByText("2026001")).toBeInTheDocument();
    expect(screen.getByText("Acme Lending")).toBeInTheDocument();
  });

  it("renders queue worklist context from existing activeQueue and rowsOverride inputs", () => {
    renderTable({
      rowsOverride: [rows[0]],
      activeQueue: {
        label: "Unassigned Orders",
        urgency: "medium",
        description: "Orders that need assignment.",
        count: 1,
      },
    });

    expect(screen.getByText("Queue worklist")).toBeInTheDocument();
    expect(screen.getByText("Derived from the current active order set.")).toBeInTheDocument();
    expect(screen.getByText("Unassigned Orders")).toBeInTheDocument();
    expect(screen.getByText("Orders that need assignment.")).toBeInTheDocument();
    expect(screen.getByText("2026001")).toBeInTheDocument();
    expect(screen.queryByText("2026002")).not.toBeInTheDocument();
  });

  it("uses the polished empty state without adding action controls", () => {
    useOrdersMock.mockReturnValue({
      data: [],
      count: 0,
      loading: false,
      error: null,
      filters: { page: 0, pageSize: 15 },
      setFilters: vi.fn(),
    });

    renderTable();

    expect(screen.getByText("No active orders to show.")).toBeInTheDocument();
    expect(screen.getByText("The current filters do not have any active work.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /archive|cancel|void/i })).not.toBeInTheDocument();
  });

  it("uses the polished loading state from existing table loading", () => {
    useOrdersMock.mockReturnValue({
      data: [],
      count: 0,
      loading: true,
      error: null,
      filters: { page: 0, pageSize: 2 },
      setFilters: vi.fn(),
    });

    const { container } = renderTable();

    expect(screen.getByText("Loading")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(2);
  });
});
