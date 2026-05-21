// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/lib/permissions/constants";

const permissionState = vi.hoisted(() => ({
  allowed: new Set(),
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useCan: (permissionKey) => ({
    allowed: permissionState.allowed.has(permissionKey),
    loading: false,
    error: null,
    permissionKeys: [...permissionState.allowed],
    reload: vi.fn(),
  }),
  useCanAny: (permissionKeys) => ({
    allowed: permissionKeys.some((permissionKey) => permissionState.allowed.has(permissionKey)),
    loading: false,
    error: null,
    permissionKeys: [...permissionState.allowed],
    reload: vi.fn(),
  }),
}));

vi.mock("@/lib/supabaseClient", () => ({
  default: {
    auth: {
      signOut: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/api", () => ({
  getCurrentUserProfile: vi.fn(async () => null),
}));

vi.mock("@/components/notifications/NotificationBell", () => ({
  default: () => <span data-testid="notification-bell" />,
}));

vi.mock("@/components/nav/CommandPalette", () => ({
  default: () => null,
}));

vi.mock("@/components/ui/AvatarBadge", () => ({
  default: () => <span data-testid="avatar-badge" />,
}));

const { default: TopNav } = await import("../TopNav.jsx");

const renderTopNav = (initialPath = "/dashboard") =>
  render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <TopNav />
    </MemoryRouter>,
  );

const linksForLabels = (labels) => labels.map((label) => screen.getByRole("link", { name: label }));

const openMobileNav = (container) => {
  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

  const navs = container.querySelectorAll("nav");

  return navs[navs.length - 1];
};

describe("TopNav desktop primary navigation", () => {
  beforeEach(() => {
    permissionState.allowed = new Set();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders desktop primary nav from the current registry helper with current order and paths", () => {
    permissionState.allowed = new Set([
      PERMISSIONS.CLIENTS_READ_ALL,
      PERMISSIONS.CLIENTS_READ_ASSIGNED,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
      PERMISSIONS.RELATIONSHIPS_READ,
      PERMISSIONS.USERS_READ,
    ]);

    renderTopNav();
    const links = linksForLabels([
      "Orders",
      "Assignments",
      "Relationships",
      "Calendar",
      "Clients",
      "Users",
    ]);

    expect(links.map((link) => link.textContent)).toEqual([
      "Orders",
      "Assignments",
      "Relationships",
      "Calendar",
      "Clients",
      "Users",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/orders",
      "/assignments",
      "/relationships",
      "/calendar",
      "/clients",
      "/users",
    ]);
  });

  it("preserves assigned-only Clients routing", () => {
    permissionState.allowed = new Set([PERMISSIONS.CLIENTS_READ_ASSIGNED]);

    renderTopNav();

    expect(screen.getByRole("link", { name: "Clients" })).toHaveAttribute(
      "href",
      "/clients/cards",
    );
  });

  it("keeps permissioned desktop links hidden when permissions are absent", () => {
    renderTopNav();

    expect(screen.getByRole("link", { name: "Orders" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Assignments" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Relationships" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Clients" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Users" })).toBeNull();
  });

  it("preserves exact-path active styling through NavItem", () => {
    renderTopNav("/orders");

    const ordersLink = screen.getByRole("link", { name: "Orders" });

    expect(ordersLink).toHaveAttribute("aria-current", "page");
    expect(ordersLink).toHaveClass("bg-slate-950", "text-white", "shadow-sm");
  });

  it("renders mobile primary nav from the current registry helper and preserves Settings placement", () => {
    permissionState.allowed = new Set([
      PERMISSIONS.CLIENTS_READ_ALL,
      PERMISSIONS.CLIENTS_READ_ASSIGNED,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
      PERMISSIONS.RELATIONSHIPS_READ,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.SETTINGS_VIEW,
    ]);

    const { container } = renderTopNav();
    const mobileNav = openMobileNav(container);
    const links = within(mobileNav).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual([
      "Orders",
      "Assignments",
      "Relationships",
      "Calendar",
      "Clients",
      "Users",
      "Settings",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/orders",
      "/assignments",
      "/relationships",
      "/calendar",
      "/clients",
      "/users",
      "/settings",
    ]);
  });

  it("preserves assigned-only Clients routing in mobile nav", () => {
    permissionState.allowed = new Set([PERMISSIONS.CLIENTS_READ_ASSIGNED]);

    const { container } = renderTopNav();
    const mobileNav = openMobileNav(container);

    expect(within(mobileNav).getByRole("link", { name: "Clients" })).toHaveAttribute(
      "href",
      "/clients/cards",
    );
  });

  it("keeps permissioned mobile links hidden when permissions are absent", () => {
    const { container } = renderTopNav();
    const mobileNav = openMobileNav(container);

    expect(within(mobileNav).getByRole("link", { name: "Orders" })).toBeInTheDocument();
    expect(within(mobileNav).getByRole("link", { name: "Calendar" })).toBeInTheDocument();
    expect(within(mobileNav).queryByRole("link", { name: "Assignments" })).toBeNull();
    expect(within(mobileNav).queryByRole("link", { name: "Relationships" })).toBeNull();
    expect(within(mobileNav).queryByRole("link", { name: "Clients" })).toBeNull();
    expect(within(mobileNav).queryByRole("link", { name: "Users" })).toBeNull();
    expect(within(mobileNav).queryByRole("link", { name: "Settings" })).toBeNull();
  });

  it("preserves mobile menu close behavior when a mobile link is selected", () => {
    const { container } = renderTopNav();
    const mobileNav = openMobileNav(container);

    fireEvent.click(within(mobileNav).getByRole("link", { name: "Orders" }));

    expect(container.querySelectorAll("nav")).toHaveLength(1);
  });
});
