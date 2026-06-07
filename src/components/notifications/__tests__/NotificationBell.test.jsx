// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  OperationsModeProvider,
  OPERATIONS_MODE_STORAGE_KEY,
} from "@/lib/operations/OperationsModeProvider";
import { OPERATIONS_MODES } from "@/lib/operations/operationsMode";
import { WORKSPACE_SWITCH_INVALIDATION_EVENT } from "@/lib/workspace/workspaceSwitchReset";

const rpcMock = vi.hoisted(() => vi.fn());
const channelOnMock = vi.hoisted(() => vi.fn());
const channelSubscribeMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    rpc: rpcMock,
    channel: vi.fn(() => ({
      on: channelOnMock.mockReturnThis(),
      subscribe: channelSubscribeMock,
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock("@/lib/hooks/useSession", () => ({
  default: () => ({
    session: {
      user: { id: "auth-user-1" },
    },
  }),
}));

const { default: NotificationBell } = await import("../NotificationBell.jsx");

const notifications = Object.freeze([
  {
    id: "internal-unread",
    title: "Internal order ready",
    order_id: "order-internal",
    payload: {
      operations_scope: OPERATIONS_MODES.INTERNAL_OPERATIONS,
      order_number: "INT-SMOKE-001",
    },
    read_at: null,
    dismissed_at: null,
  },
  {
    id: "amc-unread",
    title: "AMC order ready",
    order_id: "order-amc",
    payload: {
      operations_scope: OPERATIONS_MODES.AMC_OPERATIONS,
      order_number: "AMC-SMOKE-001",
    },
    read_at: null,
    dismissed_at: null,
  },
  {
    id: "system-seen",
    title: "System policy changed",
    category: "system",
    read_at: "2026-06-07T00:00:00Z",
    dismissed_at: null,
  },
]);

function renderBell(initialMode = OPERATIONS_MODES.INTERNAL_OPERATIONS) {
  window.localStorage.setItem(OPERATIONS_MODE_STORAGE_KEY, initialMode);

  return render(
    <MemoryRouter>
      <OperationsModeProvider>
        <NotificationBell />
      </OperationsModeProvider>
    </MemoryRouter>,
  );
}

describe("NotificationBell workspace isolation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    rpcMock.mockReset();
    channelOnMock.mockClear();
    channelSubscribeMock.mockClear();
    rpcMock.mockImplementation((name) => {
      if (name === "rpc_get_notifications") {
        return Promise.resolve({ data: notifications, error: null });
      }
      return Promise.resolve({ data: true, error: null });
    });
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("shows Internal notifications and unread count without AMC notification bleed", async () => {
    renderBell(OPERATIONS_MODES.INTERNAL_OPERATIONS);

    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    expect(await screen.findByText("Internal order ready")).toBeInTheDocument();
    expect(screen.queryByText("AMC order ready")).toBeNull();
    expect(screen.getByText("System policy changed")).toBeInTheDocument();
    expect(rpcMock).toHaveBeenCalledWith("rpc_get_notifications", {
      p_limit: 20,
      p_operations_scope: OPERATIONS_MODES.INTERNAL_OPERATIONS,
    });
  });

  it("shows AMC notifications and unread count without Internal notification bleed", async () => {
    renderBell(OPERATIONS_MODES.AMC_OPERATIONS);

    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    expect(await screen.findByText("AMC order ready")).toBeInTheDocument();
    expect(screen.queryByText("Internal order ready")).toBeNull();
    expect(screen.getByText("System policy changed")).toBeInTheDocument();
    expect(rpcMock).toHaveBeenCalledWith("rpc_get_notifications", {
      p_limit: 20,
      p_operations_scope: OPERATIONS_MODES.AMC_OPERATIONS,
    });
  });

  it("marks only visible scoped notifications when marking all seen", async () => {
    renderBell(OPERATIONS_MODES.AMC_OPERATIONS);

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    await screen.findByText("AMC order ready");
    fireEvent.click(screen.getByRole("button", { name: "Mark all seen" }));

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith("rpc_mark_notification_read", {
        p_notification_id: "amc-unread",
      });
    });
    expect(rpcMock).not.toHaveBeenCalledWith("rpc_mark_notification_read", {
      p_notification_id: "internal-unread",
    });
  });

  it("clears and refreshes notification state on workspace switch invalidation", async () => {
    renderBell(OPERATIONS_MODES.INTERNAL_OPERATIONS);

    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    await screen.findByText("Internal order ready");
    rpcMock.mockClear();

    window.dispatchEvent(new window.CustomEvent(WORKSPACE_SWITCH_INVALIDATION_EVENT));

    await waitFor(() => {
      expect(screen.queryByText("Internal order ready")).toBeNull();
      expect(rpcMock).toHaveBeenCalledWith("rpc_get_notifications", {
        p_limit: 20,
        p_operations_scope: OPERATIONS_MODES.INTERNAL_OPERATIONS,
      });
    });
    expect(screen.queryByRole("heading", { name: "Notification Center" })).toBeNull();
  });

  it("keeps notification links on guarded app routes", async () => {
    renderBell(OPERATIONS_MODES.AMC_OPERATIONS);

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    await screen.findByText("AMC order ready");

    const article = screen.getByText("AMC order ready").closest("article");
    expect(within(article).getByRole("button", { name: "AMC-SMOKE-001" })).toBeInTheDocument();
  });
});
