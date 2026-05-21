// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CommandPalette from "../CommandPalette.jsx";
import { PERMISSIONS } from "@/lib/permissions/constants";

const permissionState = vi.hoisted(() => ({
  allowed: new Set(),
  error: null,
  loading: false,
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
    <CommandPalette
      open
      onClose={onClose}
      onNavigate={onNavigate}
      {...props}
    />,
  );

  return { onClose, onNavigate };
};

const commandLabels = () =>
  within(screen.getByRole("list"))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

describe("CommandPalette current registry helper migration", () => {
  beforeEach(() => {
    permissionState.allowed = new Set();
    permissionState.error = null;
    permissionState.loading = false;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders current commands in the existing order and preserves the dynamic Clients route", () => {
    permissionState.allowed = new Set(allCommandPermissions);
    const { onNavigate } = renderPalette({ clientsPath: "/clients/cards" });

    expect(commandLabels()).toEqual([
      "Go to Ordersg o",
      "Go to Assignmentsg a",
      "Go to Relationshipsg r",
      "Go to Calendarg c",
      "Go to Clientsg l",
      "Go to Usersg u",
      "Open Settings,",
      "Notification Settings",
    ]);

    fireEvent.click(screen.getByText("Go to Clients"));

    expect(onNavigate).toHaveBeenCalledWith("/clients/cards");
  });

  it("hides permissioned commands when permission inputs are false", () => {
    renderPalette();

    expect(commandLabels()).toEqual(["Go to Calendarg c"]);
    expect(screen.queryByText("Go to Orders")).toBeNull();
    expect(screen.queryByText("Go to Assignments")).toBeNull();
    expect(screen.queryByText("Go to Relationships")).toBeNull();
    expect(screen.queryByText("Go to Clients")).toBeNull();
    expect(screen.queryByText("Go to Users")).toBeNull();
  });

  it("preserves loading/error legacy fallback commands without future packet concepts", () => {
    permissionState.loading = true;
    renderPalette();

    expect(commandLabels()).toEqual([
      "Go to Ordersg o",
      "Go to Calendarg c",
      "Go to Clientsg l",
      "Go to Usersg u",
      "Open Settings,",
      "Notification Settings",
    ]);
    expect(screen.queryByText("Go to Assignments")).toBeNull();
    expect(screen.queryByText("Go to Relationships")).toBeNull();
    expect(screen.getByRole("textbox")).toHaveAttribute(
      "placeholder",
      "Search... (Orders, Clients, Users, Settings)",
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

  it("does not expose future Vendor or Client portal commands", () => {
    permissionState.allowed = new Set(allCommandPermissions);
    renderPalette();

    expect(screen.queryByText(/Vendor Portal/i)).toBeNull();
    expect(screen.queryByText(/Client Portal/i)).toBeNull();
    expect(screen.queryByText(/Go to Vendors/i)).toBeNull();
    expect(screen.queryByText(/Submit Request/i)).toBeNull();
  });
});
