// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CommandPalette from "../CommandPalette.jsx";
import { OperationsModeProvider } from "@/lib/operations/OperationsModeProvider";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { WORKSPACE_SWITCH_INVALIDATION_EVENT } from "@/lib/workspace/workspaceSwitchReset";

const permissionState = vi.hoisted(() => ({
  allowed: new Set(),
  error: null,
  loading: false,
}));

const shellProfileState = vi.hoisted(() => ({
  profileId: "operations",
  appContext: {},
  exposure: undefined,
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useEffectivePermissions: () => ({
    error: permissionState.error,
    loading: permissionState.loading,
    hasPermission: (permissionKey) => permissionState.allowed.has(permissionKey),
    hasAnyPermission: (permissionKeys) =>
      permissionKeys.some((permissionKey) => permissionState.allowed.has(permissionKey)),
  }),
}));

vi.mock("@/lib/shell/useShellProfile", () => ({
  useShellProfile: () =>
    shellProfileState.exposure === undefined
      ? {
          profileId: shellProfileState.profileId,
          appContext: shellProfileState.appContext,
          metadataAuthority: "presentation_only",
          isPresentationOnly: true,
        }
      : shellProfileState.exposure,
}));

const allCommandPermissions = [
  PERMISSIONS.NAVIGATION_ORDERS_VIEW,
  PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
  PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
  PERMISSIONS.RELATIONSHIPS_READ,
  PERMISSIONS.NAVIGATION_CLIENTS_VIEW,
  PERMISSIONS.USERS_READ,
  PERMISSIONS.NAVIGATION_USERS_VIEW,
  PERMISSIONS.SETTINGS_VIEW,
  PERMISSIONS.NAVIGATION_SETTINGS_VIEW,
  PERMISSIONS.NOTIFICATIONS_PREFERENCES_MANAGE_OWN,
];

const renderPalette = (props = {}) => {
  const onClose = vi.fn();
  const onNavigate = vi.fn();

  render(
    <OperationsModeProvider>
      <CommandPalette
        open
        onClose={onClose}
        onNavigate={onNavigate}
        {...props}
      />
    </OperationsModeProvider>,
  );

  return { onClose, onNavigate };
};

const commandLabels = () =>
  within(screen.getByRole("list"))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

describe("CommandPalette current registry helper migration", () => {
  beforeEach(() => {
    window.localStorage.clear();
    permissionState.allowed = new Set();
    permissionState.error = null;
    permissionState.loading = false;
    shellProfileState.profileId = "operations";
    shellProfileState.appContext = {};
    shellProfileState.exposure = undefined;
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("suppresses V1 hidden surfaces in the owner/admin operations shell and preserves the dynamic Clients route", () => {
    permissionState.allowed = new Set(allCommandPermissions);
    const { onNavigate } = renderPalette({ clientsPath: "/clients/cards" });

    expect(commandLabels()).toEqual([
      "Go to Ordersg o",
      "Go to Calendarg c",
      "Go to Clientsg l",
      "Open Team Accessg u",
      "Open Account Settings,",
      "Open Notification Settings",
    ]);
    expect(screen.queryByText("Go to Assignments")).toBeNull();
    expect(screen.queryByText("Go to Relationships")).toBeNull();

    fireEvent.click(screen.getByText("Go to Clients"));

    expect(onNavigate).toHaveBeenCalledWith("/clients/cards");
  });

  it("suppresses V1 hidden surfaces when owner/admin authority is explicit in app context", () => {
    shellProfileState.profileId = "custom_operations";
    shellProfileState.appContext = { is_owner: true };
    permissionState.allowed = new Set(allCommandPermissions);

    renderPalette();

    expect(screen.queryByText("Go to Assignments")).toBeNull();
    expect(screen.queryByText("Go to Relationships")).toBeNull();
  });

  it("preserves current flat command order for unknown shell profiles", () => {
    shellProfileState.profileId = "unknown_profile";
    permissionState.allowed = new Set(allCommandPermissions);

    renderPalette({ clientsPath: "/clients/cards" });

    expect(commandLabels()).toEqual([
      "Go to Ordersg o",
      "Go to Assignmentsg a",
      "Go to Relationshipsg r",
      "Go to Calendarg c",
      "Go to Clientsg l",
      "Open Team Accessg u",
      "Open Account Settings,",
      "Open Notification Settings",
    ]);
  });

  it("prioritizes received-work assignments only when the command is visible", () => {
    shellProfileState.profileId = "received_work";
    permissionState.allowed = new Set([
      PERMISSIONS.NAVIGATION_ORDERS_VIEW,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
      PERMISSIONS.SETTINGS_VIEW,
      PERMISSIONS.NOTIFICATIONS_PREFERENCES_MANAGE_OWN,
    ]);

    renderPalette();

    expect(commandLabels()).toEqual([
      "Go to Assignmentsg a",
      "Open Account Settings,",
      "Open Notification Settings",
      "Go to Ordersg o",
      "Go to Calendarg c",
    ]);
  });

  it("hides assignment commands for internal appraiser shells without AMC scope", () => {
    shellProfileState.profileId = "my_work";
    permissionState.allowed = new Set([
      PERMISSIONS.NAVIGATION_ORDERS_VIEW,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
      PERMISSIONS.RELATIONSHIPS_READ,
      PERMISSIONS.NAVIGATION_CLIENTS_VIEW,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.NAVIGATION_USERS_VIEW,
    ]);

    renderPalette({ clientsPath: "/clients/cards" });

    expect(commandLabels()).toEqual([
      "Go to Ordersg o",
      "Go to Calendarg c",
      "Go to Clientsg l",
      "Open Team Accessg u",
    ]);
    expect(screen.queryByText("Go to Assignments")).toBeNull();
    expect(screen.queryByText("Go to Relationships")).toBeNull();
    expect(screen.getByRole("textbox")).toHaveAttribute(
      "placeholder",
      "Search... (Orders, Clients, Team Access, Settings)",
    );
  });

  it("hides permissioned commands when permission inputs are false", () => {
    renderPalette();

    expect(commandLabels()).toEqual(["Go to Calendarg c"]);
    expect(screen.queryByText("Go to Orders")).toBeNull();
    expect(screen.queryByText("Go to Assignments")).toBeNull();
    expect(screen.queryByText("Go to Relationships")).toBeNull();
    expect(screen.queryByText("Go to Clients")).toBeNull();
    expect(screen.queryByText("Open Team Access")).toBeNull();
  });

  it("does not expose hidden surfaces from work eligibility permissions alone", () => {
    permissionState.allowed = new Set([
      PERMISSIONS.ORDERS_ASSIGNABLE_AS_APPRAISER,
      PERMISSIONS.ORDERS_ASSIGNABLE_AS_REVIEWER,
    ]);

    renderPalette();

    expect(screen.queryByText("Go to Assignments")).toBeNull();
    expect(screen.queryByText("Go to Relationships")).toBeNull();
  });

  it("preserves loading/error legacy fallback commands without future packet concepts", () => {
    permissionState.loading = true;
    renderPalette();

    expect(commandLabels()).toEqual([
      "Go to Ordersg o",
      "Go to Calendarg c",
      "Go to Clientsg l",
      "Open Team Accessg u",
      "Open Account Settings,",
      "Open Notification Settings",
    ]);
    expect(screen.queryByText("Go to Assignments")).toBeNull();
    expect(screen.queryByText("Go to Relationships")).toBeNull();
    expect(screen.getByRole("textbox")).toHaveAttribute(
      "placeholder",
      "Search... (Orders, Clients, Team Access, Settings)",
    );
  });

  it("preserves current label search and order-search fallback navigation", () => {
    permissionState.allowed = new Set([PERMISSIONS.NAVIGATION_ORDERS_VIEW]);
    const { onNavigate } = renderPalette();
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "123 Main #4" } });

    expect(screen.getByText("Press Enter to search Orders for “123 Main #4”")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Enter" });

    expect(onNavigate).toHaveBeenCalledWith("/orders?q=123%20Main%20%234");
  });

  it("clears open search text on workspace switch invalidation", async () => {
    permissionState.allowed = new Set([PERMISSIONS.NAVIGATION_ORDERS_VIEW]);
    renderPalette();
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "123 Main #4" } });
    expect(screen.getByText("Press Enter to search Orders for “123 Main #4”")).toBeInTheDocument();

    window.dispatchEvent(new window.CustomEvent(WORKSPACE_SWITCH_INVALIDATION_EVENT));

    await waitFor(() => {
      expect(input).toHaveValue("");
      expect(screen.queryByText("Press Enter to search Orders for “123 Main #4”")).toBeNull();
    });
  });

  it("preserves active search filtering in current command order", () => {
    shellProfileState.profileId = "unknown_profile";
    permissionState.allowed = new Set(allCommandPermissions);
    renderPalette();
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "Go to" } });

    expect(commandLabels()).toEqual([
      "Go to Ordersg o",
      "Go to Assignmentsg a",
      "Go to Relationshipsg r",
      "Go to Calendarg c",
      "Go to Clientsg l",
    ]);
  });

  it("does not expose future Vendor or Client portal commands", () => {
    permissionState.allowed = new Set(allCommandPermissions);
    renderPalette();

    expect(screen.queryByText(/Vendor Portal/i)).toBeNull();
    expect(screen.queryByText(/Client Portal/i)).toBeNull();
    expect(screen.queryByText(/Go to Vendors/i)).toBeNull();
    expect(screen.queryByText(/Submit Request/i)).toBeNull();
  });
});
