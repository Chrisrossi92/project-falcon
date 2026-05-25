// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/lib/permissions/constants";

const permissionState = vi.hoisted(() => ({
  allowed: new Set(),
}));

const shellProfileState = vi.hoisted(() => ({
  profileId: "operations",
  exposure: undefined,
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

vi.mock("@/lib/shell/useShellProfile", () => ({
  useShellProfile: () =>
    shellProfileState.exposure === undefined
      ? {
          profileId: shellProfileState.profileId,
          metadataAuthority: "presentation_only",
          isPresentationOnly: true,
        }
      : shellProfileState.exposure,
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

const getDesktopPrimaryNav = (container) => container.querySelector("nav");

const desktopLinks = (container) => within(getDesktopPrimaryNav(container)).getAllByRole("link");

const openMobileNav = (container) => {
  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

  const navs = container.querySelectorAll("nav");

  return navs[navs.length - 1];
};

describe("TopNav desktop primary navigation", () => {
  beforeEach(() => {
    permissionState.allowed = new Set();
    shellProfileState.profileId = "operations";
    shellProfileState.exposure = undefined;
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

    const { container } = renderTopNav();
    const desktopNav = getDesktopPrimaryNav(container);
    const links = desktopLinks(container);

    expect(within(desktopNav).getByText("Operations")).toBeInTheDocument();
    expect(within(desktopNav).getByText("Management")).toBeInTheDocument();
    expect(links.map((link) => link.textContent)).toEqual([
      "Orders",
      "Calendar",
      "Assignments",
      "Clients",
      "Relationships",
      "Team Access",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/orders",
      "/calendar",
      "/assignments",
      "/clients",
      "/relationships",
      "/users",
    ]);
  });

  it("groups only currently visible desktop links and skips empty groups", () => {
    renderTopNav();

    expect(screen.getByText("Operations")).toBeInTheDocument();
    expect(screen.queryByText("Management")).toBeNull();
    expect(screen.queryByRole("link", { name: "Assignments" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Relationships" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Clients" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Team Access" })).toBeNull();
  });

  it("shows the resolved shell work mode in the brand cue", () => {
    renderTopNav();

    expect(screen.getByTestId("shell-work-mode")).toHaveTextContent("Operations Command");
  });

  it("keeps fallback profiles on a neutral shell cue", () => {
    shellProfileState.exposure = {
      profileId: "unavailable",
      profile: {
        status: "fallback",
        defaultWorkspaceLabel: "Workspace unavailable",
        primaryDailyQuestion: "What workspace is available?",
      },
      metadataAuthority: "presentation_only",
      isPresentationOnly: true,
    };

    renderTopNav();

    expect(screen.getByTestId("shell-work-mode")).toHaveTextContent("Operations Console");
  });

  it("emphasizes the resolved profile group without changing visible links", () => {
    shellProfileState.profileId = "my_work";
    permissionState.allowed = new Set([
      PERMISSIONS.CLIENTS_READ_ASSIGNED,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
    ]);

    const { container } = renderTopNav();
    const desktopNav = getDesktopPrimaryNav(container);
    const activeProfileSection = container.querySelector('[data-shell-profile-section="active"]');
    const links = desktopLinks(container);

    expect(screen.getByTestId("shell-work-mode")).toHaveTextContent("My Work");
    expect(within(activeProfileSection).getByText("Work")).toBeInTheDocument();
    expect(within(desktopNav).getByText("Support")).toBeInTheDocument();
    expect(links.map((link) => link.textContent)).toEqual([
      "Orders",
      "Calendar",
      "Clients",
      "Assignments",
    ]);
  });

  it("preserves the current flat desktop nav for unknown shell profiles", () => {
    shellProfileState.profileId = "unknown_profile";
    permissionState.allowed = new Set([
      PERMISSIONS.CLIENTS_READ_ALL,
      PERMISSIONS.CLIENTS_READ_ASSIGNED,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
      PERMISSIONS.RELATIONSHIPS_READ,
      PERMISSIONS.USERS_READ,
    ]);

    const { container } = renderTopNav();
    const desktopNav = getDesktopPrimaryNav(container);
    const links = desktopLinks(container);

    expect(within(desktopNav).queryByText("Operations")).toBeNull();
    expect(within(desktopNav).queryByText("Management")).toBeNull();
    expect(links.map((link) => link.textContent)).toEqual([
      "Orders",
      "Assignments",
      "Relationships",
      "Calendar",
      "Clients",
      "Team Access",
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

  it("keeps permissioned links visible in a non-authoritative More group when metadata does not group them", () => {
    shellProfileState.profileId = "my_work";
    permissionState.allowed = new Set([
      PERMISSIONS.CLIENTS_READ_ALL,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
      PERMISSIONS.RELATIONSHIPS_READ,
      PERMISSIONS.USERS_READ,
    ]);

    const { container } = renderTopNav();
    const desktopNav = getDesktopPrimaryNav(container);
    const links = desktopLinks(container);

    expect(within(desktopNav).getByText("Work")).toBeInTheDocument();
    expect(within(desktopNav).getByText("Support")).toBeInTheDocument();
    expect(within(desktopNav).getByText("More")).toBeInTheDocument();
    expect(links.map((link) => link.textContent)).toEqual([
      "Orders",
      "Calendar",
      "Clients",
      "Assignments",
      "Relationships",
      "Team Access",
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
    expect(screen.queryByRole("link", { name: "Team Access" })).toBeNull();
  });

  it("preserves exact-path active styling through NavItem", () => {
    renderTopNav("/orders");

    const ordersLink = screen.getByRole("link", { name: "Orders" });

    expect(ordersLink).toHaveAttribute("aria-current", "page");
    expect(ordersLink).toHaveClass("bg-slate-950", "text-white", "shadow-md");
    expect(ordersLink.className).toContain("after:bg-white/80");
  });

  it("renders desktop nav without crashing while shell profile exposure is unresolved", () => {
    shellProfileState.exposure = null;
    permissionState.allowed = new Set([
      PERMISSIONS.CLIENTS_READ_ALL,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
      PERMISSIONS.RELATIONSHIPS_READ,
      PERMISSIONS.USERS_READ,
    ]);

    const { container } = renderTopNav();
    const links = desktopLinks(container);

    expect(links.map((link) => link.textContent)).toEqual([
      "Orders",
      "Assignments",
      "Relationships",
      "Calendar",
      "Clients",
      "Team Access",
    ]);
    expect(screen.queryByText("Operations")).toBeNull();
    expect(screen.queryByText("Management")).toBeNull();
  });

  it("renders mobile primary nav from visible links with shell priority ordering and preserves Settings placement", () => {
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
      "Calendar",
      "Assignments",
      "Clients",
      "Relationships",
      "Team Access",
      "Settings",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/orders",
      "/calendar",
      "/assignments",
      "/clients",
      "/relationships",
      "/users",
      "/settings",
    ]);
  });

  it("keeps the same mobile link set while ordering only visible links for received work", () => {
    shellProfileState.profileId = "received_work";
    permissionState.allowed = new Set([PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED]);

    const { container } = renderTopNav();
    const mobileNav = openMobileNav(container);
    const links = within(mobileNav).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual([
      "Assignments",
      "Orders",
      "Calendar",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/assignments",
      "/orders",
      "/calendar",
    ]);
    expect(within(mobileNav).queryByRole("link", { name: "Clients" })).toBeNull();
    expect(within(mobileNav).queryByRole("link", { name: "Team Access" })).toBeNull();
  });

  it("preserves current flat mobile order for unknown shell profiles", () => {
    shellProfileState.profileId = "unknown_profile";
    permissionState.allowed = new Set([
      PERMISSIONS.CLIENTS_READ_ALL,
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
      "Team Access",
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
    expect(within(mobileNav).queryByRole("link", { name: "Team Access" })).toBeNull();
    expect(within(mobileNav).queryByRole("link", { name: "Settings" })).toBeNull();
  });

  it("preserves mobile menu close behavior when a mobile link is selected", () => {
    const { container } = renderTopNav();
    const mobileNav = openMobileNav(container);

    fireEvent.click(within(mobileNav).getByRole("link", { name: "Orders" }));

    expect(container.querySelectorAll("nav")).toHaveLength(1);
  });
});
