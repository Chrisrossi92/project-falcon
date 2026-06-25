// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  OperationsModeProvider,
  OPERATIONS_MODE_STORAGE_KEY,
} from "@/lib/operations/OperationsModeProvider";
import { OPERATIONS_MODES } from "@/lib/operations/operationsMode";
import { WORKSPACE_SWITCH_INVALIDATION_EVENT } from "@/lib/workspace/workspaceSwitchReset";

const rpcMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

const { default: ActivityPage } = await import("../Activity.jsx");

const notifications = Object.freeze([
  {
    id: "internal",
    title: "Internal review update",
    body: "Internal body",
    payload: { operations_scope: OPERATIONS_MODES.INTERNAL_OPERATIONS, order_number: "INT-001" },
    read_at: null,
  },
  {
    id: "amc",
    title: "AMC invoice update",
    body: "AMC body",
    payload: { operations_scope: OPERATIONS_MODES.AMC_OPERATIONS, order_number: "AMC-001" },
    read_at: null,
  },
]);

function renderActivity(initialMode = OPERATIONS_MODES.INTERNAL_OPERATIONS) {
  window.localStorage.setItem(OPERATIONS_MODE_STORAGE_KEY, initialMode);

  return render(
    <MemoryRouter>
      <OperationsModeProvider>
        <ActivityPage />
      </OperationsModeProvider>
    </MemoryRouter>,
  );
}

describe("Activity notification workspace isolation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ data: notifications, error: null });
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("shows Internal activity without AMC notification bleed", async () => {
    renderActivity(OPERATIONS_MODES.INTERNAL_OPERATIONS);

    expect(await screen.findByText("Internal review update")).toBeInTheDocument();
    expect(screen.queryByText("AMC invoice update")).toBeNull();
    expect(rpcMock).toHaveBeenCalledWith("rpc_get_notifications", {
      p_limit: 100,
      p_before: null,
      p_operations_scope: OPERATIONS_MODES.INTERNAL_OPERATIONS,
    });
  });

  it("shows AMC activity without Internal notification bleed", async () => {
    renderActivity(OPERATIONS_MODES.AMC_OPERATIONS);

    expect(await screen.findByText("AMC invoice update")).toBeInTheDocument();
    expect(screen.queryByText("Internal review update")).toBeNull();
    expect(rpcMock).toHaveBeenCalledWith("rpc_get_notifications", {
      p_limit: 100,
      p_before: null,
      p_operations_scope: OPERATIONS_MODES.AMC_OPERATIONS,
    });
  });

  it("clears local activity search state and reloads on workspace switch invalidation", async () => {
    renderActivity(OPERATIONS_MODES.INTERNAL_OPERATIONS);
    const search = await screen.findByPlaceholderText("Search notifications, notes, or order number");

    fireEvent.change(search, { target: { value: "missing search" } });
    expect(screen.getByText("No matching activity found.")).toBeInTheDocument();
    rpcMock.mockClear();

    window.dispatchEvent(new window.CustomEvent(WORKSPACE_SWITCH_INVALIDATION_EVENT));

    await waitFor(() => {
      expect(search).toHaveValue("");
      expect(screen.getByText("Internal review update")).toBeInTheDocument();
      expect(rpcMock).toHaveBeenCalledWith("rpc_get_notifications", {
        p_limit: 100,
        p_before: null,
        p_operations_scope: OPERATIONS_MODES.INTERNAL_OPERATIONS,
      });
    });
  });
});
