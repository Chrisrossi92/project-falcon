// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  OperationsModeProvider,
  OPERATIONS_MODE_STORAGE_KEY,
} from "@/lib/operations/OperationsModeProvider";
import { PERMISSIONS } from "@/lib/permissions/constants";

const permissionState = vi.hoisted(() => ({
  allowed: new Set(),
  useEffectivePermissions: vi.fn(),
}));

const shellProfileState = vi.hoisted(() => ({
  profileId: "operations",
  exposure: undefined,
  appContext: null,
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useEffectivePermissions: () => {
    permissionState.useEffectivePermissions();
    return {
      hasPermission: (permissionKey) => permissionState.allowed.has(permissionKey),
      hasAnyPermission: (permissionKeys) =>
        permissionKeys.some((permissionKey) => permissionState.allowed.has(permissionKey)),
      hasAllPermissions: (permissionKeys) =>
        permissionKeys.every((permissionKey) => permissionState.allowed.has(permissionKey)),
      permissionSet: permissionState.allowed,
      permissions: [...permissionState.allowed],
      loading: false,
      error: null,
      reload: vi.fn(),
    };
  },
}));

vi.mock("@/lib/shell/useShellProfile", () => ({
  useShellProfile: () =>
    shellProfileState.exposure === undefined
      ? {
          profileId: shellProfileState.profileId,
          metadataAuthority: "presentation_only",
          isPresentationOnly: true,
          appContext: shellProfileState.appContext,
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

vi.mock("@/components/notifications/NotificationBell", () => ({
  default: () => <span data-testid="notification-bell" />,
}));

vi.mock("@/components/nav/CommandPalette", () => ({
  default: () => null,
}));

vi.mock("@/components/ui/AvatarBadge", () => ({
  default: ({ name, email }) => (
    <span data-testid="avatar-badge" data-name={name} data-email={email}>
      {name}
    </span>
  ),
}));

const { default: TopNav } = await import("../TopNav.jsx");

function LocationProbe() {
  const location = useLocation();

  return <span data-testid="current-path">{location.pathname}</span>;
}

const renderTopNav = (initialPath = "/dashboard") =>
  render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <OperationsModeProvider>
        <TopNav />
        <LocationProbe />
      </OperationsModeProvider>
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
    window.localStorage.clear();
    permissionState.allowed = new Set();
    permissionState.useEffectivePermissions.mockClear();
    shellProfileState.profileId = "operations";
    shellProfileState.exposure = undefined;
    shellProfileState.appContext = null;
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("renders the current operations mode in the desktop shell context", () => {
    const { container } = renderTopNav();
    const desktopContext = container.querySelector('aside [data-testid="operations-mode-switcher"]');

    expect(within(desktopContext).getByRole("button", { name: "Internal Operations" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(desktopContext).getByRole("button", { name: "AMC Operations" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(container.querySelector('aside [data-testid="operations-mode-current"]')).toHaveTextContent(
      "Internal Operations",
    );
    expect(within(desktopContext).getByTestId("operations-mode-selected-label")).toHaveTextContent(
      "Internal Operations",
    );
  });

  it("switches operations mode without navigating", () => {
    const { container } = renderTopNav("/orders");
    const desktopContext = container.querySelector('aside [data-testid="operations-mode-switcher"]');
    const linksBeforeSwitch = desktopLinks(container).map((link) => link.textContent);

    fireEvent.click(within(desktopContext).getByRole("button", { name: "AMC Operations" }));

    expect(within(desktopContext).getByRole("button", { name: "AMC Operations" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(container.querySelector('aside [data-testid="operations-mode-current"]')).toHaveTextContent(
      "AMC Operations",
    );
    expect(within(desktopContext).getByTestId("operations-mode-selected-label")).toHaveTextContent(
      "AMC Operations",
    );
    expect(window.localStorage.getItem(OPERATIONS_MODE_STORAGE_KEY)).toBe("amc_operations");
    expect(screen.getByTestId("current-path")).toHaveTextContent("/orders");
    expect(desktopLinks(container).map((link) => link.textContent)).toEqual(linksBeforeSwitch);
  });

  it("restores the stored operations mode as the visible selected value", () => {
    window.localStorage.setItem(OPERATIONS_MODE_STORAGE_KEY, "amc_operations");

    const { container } = renderTopNav();
    const desktopContext = container.querySelector('aside [data-testid="operations-mode-switcher"]');

    expect(within(desktopContext).getByRole("button", { name: "AMC Operations" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(desktopContext).getByTestId("operations-mode-selected-label")).toHaveTextContent(
      "AMC Operations",
    );
  });

  it("renders the operations mode switcher in mobile navigation", () => {
    const { container } = renderTopNav();
    const mobileNav = openMobileNav(container);

    expect(within(mobileNav).getByTestId("operations-mode-switcher")).toBeInTheDocument();
    expect(within(mobileNav).getByRole("button", { name: "Internal Operations" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(within(mobileNav).getByRole("button", { name: "AMC Operations" }));

    expect(within(mobileNav).getByRole("button", { name: "AMC Operations" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(mobileNav).getByTestId("operations-mode-selected-label")).toHaveTextContent(
      "AMC Operations",
    );
    expect(screen.getByTestId("current-path")).toHaveTextContent("/dashboard");
  });

  it("keeps desktop and mobile operations mode switchers synchronized", () => {
    const { container } = renderTopNav();
    const desktopContext = container.querySelector('aside [data-testid="operations-mode-switcher"]');

    fireEvent.click(within(desktopContext).getByRole("button", { name: "AMC Operations" }));

    const mobileNav = openMobileNav(container);

    expect(within(mobileNav).getByRole("button", { name: "AMC Operations" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(mobileNav).getByTestId("operations-mode-selected-label")).toHaveTextContent(
      "AMC Operations",
    );

    fireEvent.click(within(mobileNav).getByRole("button", { name: "Internal Operations" }));

    expect(within(desktopContext).getByRole("button", { name: "Internal Operations" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(desktopContext).getByTestId("operations-mode-selected-label")).toHaveTextContent(
      "Internal Operations",
    );
    expect(window.localStorage.getItem(OPERATIONS_MODE_STORAGE_KEY)).toBe("internal_operations");
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
      "Clients",
      "Users",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/dashboard",
      "/orders",
      "/calendar",
      "/clients",
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
    expect(within(desktopNav).queryByRole("link", { name: "Users" })).toBeNull();
  });

  it("does not expose Assignments or Relationships from work eligibility permissions alone", () => {
    permissionState.allowed = new Set([
      PERMISSIONS.ORDERS_ASSIGNABLE_AS_APPRAISER,
      PERMISSIONS.ORDERS_ASSIGNABLE_AS_REVIEWER,
    ]);

    const { container } = renderTopNav();
    const desktopNav = getDesktopPrimaryNav(container);

    expect(within(desktopNav).queryByRole("link", { name: "Assignments" })).toBeNull();
    expect(within(desktopNav).queryByRole("link", { name: "Relationships" })).toBeNull();
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
    expect(screen.getAllByRole("link", { name: "Falcon workspace" })).toHaveLength(1);
    expect(screen.getByText("Falcon")).toBeInTheDocument();
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
      PERMISSIONS.USERS_READ,
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
      "Orders",
      "Calendar",
      "Clients",
      "Staff Directory",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/my-work",
      "/orders",
      "/calendar",
      "/clients/cards",
      "/users",
    ]);
    expect(within(desktopNav).queryByText("More")).toBeNull();
    expect(within(desktopNav).queryByRole("link", { name: "Assignments" })).toBeNull();
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
      "Users",
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

  it("keeps appraiser Staff Directory under Support without creating a More group", () => {
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
    expect(within(desktopNav).queryByText("More")).toBeNull();
    expect(links.map((link) => link.textContent)).toEqual([
      "My Work",
      "Orders",
      "Calendar",
      "Clients",
      "Staff Directory",
    ]);
    expect(within(desktopNav).queryByRole("link", { name: "Assignments" })).toBeNull();
    expect(within(desktopNav).queryByRole("link", { name: "Relationships" })).toBeNull();
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
      "Users",
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
      "Clients",
      "Users",
      "Settings",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/orders",
      "/calendar",
      "/clients",
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
    expect(within(mobileNav).queryByRole("link", { name: "Users" })).toBeNull();
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

  it("uses app-context identity for the avatar menu before falling back to generic User", () => {
    shellProfileState.appContext = {
      user_id: "app-user-1",
      display_name: "Abby Rossi",
      name: "Abby",
      email: "arossi@continentalres.net",
      avatar_url: null,
      display_color: "#334155",
    };
    renderTopNav();

    expect(screen.getAllByText("Abby Rossi").length).toBeGreaterThan(0);
    const avatar = screen.getByTestId("avatar-badge");
    expect(avatar).toHaveAttribute("data-name", "Abby Rossi");
    expect(avatar).toHaveAttribute("data-email", "arossi@continentalres.net");
    expect(screen.queryByText(/^User$/)).toBeNull();
  });

  it("falls back from display name to name for shell identity", () => {
    shellProfileState.appContext = {
      user_id: "app-user-2",
      display_name: "",
      name: "Pam",
      email: "pcasper@continentalres.net",
    };

    renderTopNav();

    expect(screen.getAllByText("Pam").length).toBeGreaterThan(0);
    expect(screen.getByTestId("avatar-badge")).toHaveAttribute("data-name", "Pam");
  });

  it("preserves mobile menu close behavior when a mobile link is selected", () => {
    const { container } = renderTopNav();
    const mobileNav = openMobileNav(container);

    fireEvent.click(within(mobileNav).getByRole("link", { name: "Orders" }));

    expect(container.querySelectorAll("nav")).toHaveLength(1);
  });
});
