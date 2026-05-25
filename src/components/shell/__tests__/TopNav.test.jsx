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

const getDesktopPrimaryNav = (container) =>
  container.querySelector('nav[aria-label="Operational spine navigation"]');

const desktopLinks = (container) => within(getDesktopPrimaryNav(container)).getAllByRole("link");

const shellWorkModeCues = () => screen.getAllByTestId("shell-work-mode");

const openMobileNav = (container) => {
  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

  const navs = container.querySelectorAll("nav");

  return navs[navs.length - 1];
};

describe("TopNav desktop operational spine navigation", () => {
  beforeEach(() => {
    permissionState.allowed = new Set();
    shellProfileState.profileId = "operations";
    shellProfileState.exposure = undefined;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders desktop operational spine nav from the current registry helper with current order and paths", () => {
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

    expect(desktopNav).toBeInTheDocument();
    expect(within(desktopNav).getAllByText("Operations")).toHaveLength(2);
    expect(within(desktopNav).getByText("Management")).toBeInTheDocument();
    expect(links.map((link) => link.textContent)).toEqual([
      "Operations",
      "Orders",
      "Calendar",
      "Assignments",
      "Clients",
      "Relationships",
      "Team Access",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/dashboard",
      "/orders",
      "/calendar",
      "/assignments",
      "/clients",
      "/relationships",
      "/users",
    ]);
  });

  it("groups only currently visible desktop links and skips empty groups", () => {
    const { container } = renderTopNav();
    const desktopNav = getDesktopPrimaryNav(container);
    const links = desktopLinks(container);

    expect(within(desktopNav).getAllByText("Operations")).toHaveLength(2);
    expect(within(desktopNav).queryByText("Management")).toBeNull();
    expect(links.map((link) => link.textContent)).toEqual(["Operations", "Orders", "Calendar"]);
    expect(within(desktopNav).queryByRole("link", { name: "Assignments" })).toBeNull();
    expect(within(desktopNav).queryByRole("link", { name: "Relationships" })).toBeNull();
    expect(within(desktopNav).queryByRole("link", { name: "Clients" })).toBeNull();
    expect(within(desktopNav).queryByRole("link", { name: "Team Access" })).toBeNull();
  });

  it("keeps desktop primary navigation out of the utility top bar", () => {
    const { container } = renderTopNav();

    expect(container.querySelector('nav[aria-label="Primary workspace navigation"]')).toBeNull();
    expect(container.querySelector('nav[aria-label="Operational spine navigation"]')).toBeInTheDocument();
    expect(screen.queryByText("Utility / Context")).toBeNull();
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  });

  it("shows the resolved shell work mode in the brand cue", () => {
    renderTopNav();

    expect(screen.getAllByRole("img", { name: "Falcon" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Falcon dashboard" })).toHaveLength(1);
    expect(screen.getByText("Staff Appraiser Operations")).toBeInTheDocument();
    expect(screen.queryByText("Spine")).toBeNull();
    expect(screen.queryByText("Internal Ops")).toBeNull();
    expect(screen.queryByText("Falcon Operations")).toBeNull();
    expect(shellWorkModeCues()[0]).toHaveTextContent("Operations Command");
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

    expect(shellWorkModeCues()[0]).toHaveTextContent("Operations Console");
  });

  it("emphasizes the resolved profile group without changing visible links", () => {
    shellProfileState.profileId = "my_work";
    permissionState.allowed = new Set([
      PERMISSIONS.ORDERS_READ_ASSIGNED,
      PERMISSIONS.CLIENTS_READ_ASSIGNED,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
    ]);

    const { container } = renderTopNav();
    const desktopNav = getDesktopPrimaryNav(container);
    const activeProfileSection = container.querySelector('[data-shell-profile-section="active"]');
    const links = desktopLinks(container);

    expect(shellWorkModeCues()[0]).toHaveTextContent("My Work");
    expect(within(activeProfileSection).getByText("Work")).toBeInTheDocument();
    expect(within(desktopNav).getByText("Support")).toBeInTheDocument();
    expect(links.map((link) => link.textContent)).toEqual([
      "My Work",
      "Operations",
      "Orders",
      "Calendar",
      "Clients",
      "Assignments",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/my-work",
      "/dashboard",
      "/orders",
      "/calendar",
      "/clients/cards",
      "/assignments",
    ]);
  });

  it("preserves the current flat desktop nav plus Operations entry for unknown shell profiles", () => {
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

    expect(within(desktopNav).queryByText("Management")).toBeNull();
    expect(links.map((link) => link.textContent)).toEqual([
      "Operations",
      "Orders",
      "Assignments",
      "Relationships",
      "Calendar",
      "Clients",
      "Team Access",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/dashboard",
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
      PERMISSIONS.ORDERS_READ_ASSIGNED,
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
      "My Work",
      "Operations",
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

  it("preserves exact-path active styling through the operational spine NavItem", () => {
    renderTopNav("/orders");

    const ordersLink = screen.getByRole("link", { name: "Orders" });

    expect(ordersLink).toHaveAttribute("aria-current", "page");
    expect(ordersLink).toHaveClass("bg-white", "text-slate-950", "shadow-md");
    expect(ordersLink.className).toContain("after:bg-slate-900/80");
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
      "Operations",
      "Orders",
      "Assignments",
      "Relationships",
      "Calendar",
      "Clients",
      "Team Access",
    ]);
    expect(within(getDesktopPrimaryNav(container)).queryByText("Management")).toBeNull();
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

  it("adds the dedicated My Work route to appraiser mobile navigation only for the my_work shell", () => {
    shellProfileState.profileId = "my_work";
    permissionState.allowed = new Set([
      PERMISSIONS.ORDERS_READ_ASSIGNED,
      PERMISSIONS.CLIENTS_READ_ASSIGNED,
    ]);

    const { container } = renderTopNav();
    const mobileNav = openMobileNav(container);
    const links = within(mobileNav).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual([
      "My Work",
      "Orders",
      "Calendar",
      "Clients",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/my-work",
      "/orders",
      "/calendar",
      "/clients/cards",
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
