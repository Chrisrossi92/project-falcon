// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigationType } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  OperationsModeProvider,
  OPERATIONS_MODE_STORAGE_KEY,
} from "@/lib/operations/OperationsModeProvider";
import { resolveAvailableOperationsModes } from "@/lib/operations/operationAccess";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { WORKSPACE_SWITCH_INVALIDATION_EVENT } from "@/lib/workspace/workspaceSwitchReset";

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
  const navigationType = useNavigationType();

  return (
    <>
      <span data-testid="current-path">{location.pathname}</span>
      <span data-testid="current-search">{location.search}</span>
      <span data-testid="current-navigation-type">{navigationType}</span>
    </>
  );
}

const availableOperationsModesForTest = () => {
  return resolveAvailableOperationsModes({
    loading: false,
    error: null,
    hasPermission: (permissionKey) => permissionState.allowed.has(permissionKey),
  }, {
    appContext: shellProfileState.appContext || {},
  });
};

const renderTopNav = (initialPath = "/dashboard") =>
  render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <OperationsModeProvider availableOperationsModes={availableOperationsModesForTest()}>
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
    window.sessionStorage.clear();
    permissionState.allowed = new Set();
    permissionState.useEffectivePermissions.mockClear();
    shellProfileState.profileId = "operations";
    shellProfileState.exposure = undefined;
    shellProfileState.appContext = null;
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("renders the current operations mode in the desktop shell context", () => {
    const { container } = renderTopNav();
    const desktopContext = container.querySelector('aside [data-testid="operations-mode-switcher"]');

    expect(within(desktopContext).getByRole("button", { name: "Continental Internal Operations" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(desktopContext).queryByRole("button", { name: "Falcon AMC" })).not.toBeInTheDocument();
    expect(container.querySelector('aside [data-testid="operations-mode-current"]')).toHaveTextContent(
      "Continental Internal Operations",
    );
    expect(within(desktopContext).getByTestId("operations-mode-selected-label")).toHaveTextContent(
      "Continental Internal Operations",
    );
    expect(container.querySelector('aside [data-testid="workspace-identity-badge"]')).toHaveTextContent(
      "Internal",
    );
    expect(container.querySelector('aside [data-testid="workspace-identity-title"]')).toHaveTextContent(
      "Continental Internal Operations",
    );
  });

  it("switches Continental Internal Operations to Falcon AMC and resets order detail to the dashboard", () => {
    shellProfileState.appContext = { is_admin_role: true };
    permissionState.allowed = new Set([
      PERMISSIONS.CLIENTS_READ_ALL,
      PERMISSIONS.RELATIONSHIPS_READ,
      PERMISSIONS.VENDORS_READ,
      PERMISSIONS.USERS_READ,
    ]);
    const { container } = renderTopNav("/orders/order-123");
    const desktopContext = container.querySelector('aside [data-testid="operations-mode-switcher"]');

    fireEvent.click(within(desktopContext).getByRole("button", { name: "Falcon AMC" }));

    expect(within(desktopContext).getByRole("button", { name: "Falcon AMC" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(container.querySelector('aside [data-testid="operations-mode-current"]')).toHaveTextContent(
      "Falcon AMC",
    );
    expect(within(desktopContext).getByTestId("operations-mode-selected-label")).toHaveTextContent(
      "Falcon AMC",
    );
    expect(container.querySelector('aside [data-testid="workspace-identity-badge"]')).toHaveTextContent(
      "AMC",
    );
    expect(container.querySelector('aside [data-testid="workspace-identity-title"]')).toHaveTextContent(
      "Falcon AMC Environment",
    );
    expect(window.localStorage.getItem(OPERATIONS_MODE_STORAGE_KEY)).toBe("amc_operations");
    expect(screen.getByTestId("current-path")).toHaveTextContent("/amc/dashboard");
    expect(screen.getByTestId("current-search")).toHaveTextContent("");
    expect(screen.getByTestId("current-navigation-type")).toHaveTextContent("REPLACE");
    expect(desktopLinks(container).map((link) => link.textContent)).toEqual([
      "Management Operations",
      "Procurement",
      "Assignment Oversight",
      "Vendor Network",
      "Client Services",
    ]);
  });

  it("clears workspace-scoped storage and emits an invalidation event when switching to Falcon AMC", () => {
    shellProfileState.appContext = { is_admin_role: true };
    permissionState.allowed = new Set([PERMISSIONS.VENDORS_READ]);
    window.localStorage.setItem("falcon.orders.filters", "status=in_review");
    window.localStorage.setItem("falcon.dashboard.summary", "stale-dashboard");
    window.localStorage.setItem("falcon.auth.session", "keep-auth");
    window.sessionStorage.setItem("falcon.orders.search.last", "main");
    window.sessionStorage.setItem("falcon.notifications.cache", "stale-notifications");
    window.sessionStorage.setItem("falcon.csrf", "keep-session");
    const invalidationHandler = vi.fn();
    window.addEventListener(WORKSPACE_SWITCH_INVALIDATION_EVENT, invalidationHandler);

    try {
      const { container } = renderTopNav("/orders?status=in_review&q=main&page=3");
      const desktopContext = container.querySelector('aside [data-testid="operations-mode-switcher"]');

      fireEvent.click(within(desktopContext).getByRole("button", { name: "Falcon AMC" }));

      expect(screen.getByTestId("current-path")).toHaveTextContent("/amc/dashboard");
      expect(screen.getByTestId("current-search")).toHaveTextContent("");
      expect(screen.getByTestId("current-navigation-type")).toHaveTextContent("REPLACE");
      expect(window.localStorage.getItem(OPERATIONS_MODE_STORAGE_KEY)).toBe("amc_operations");
      expect(window.localStorage.getItem("falcon.orders.filters")).toBeNull();
      expect(window.localStorage.getItem("falcon.dashboard.summary")).toBeNull();
      expect(window.localStorage.getItem("falcon.auth.session")).toBe("keep-auth");
      expect(window.sessionStorage.getItem("falcon.orders.search.last")).toBeNull();
      expect(window.sessionStorage.getItem("falcon.notifications.cache")).toBeNull();
      expect(window.sessionStorage.getItem("falcon.csrf")).toBe("keep-session");
      expect(invalidationHandler).toHaveBeenCalledTimes(1);
      expect(invalidationHandler.mock.calls[0][0].detail).toMatchObject({
        fromMode: "internal_operations",
        toMode: "amc_operations",
        scopes: expect.arrayContaining([
          "orders",
          "vendors",
          "clients",
          "assignments",
          "procurement",
          "payments",
          "dashboard",
          "notifications",
        ]),
        clearedStorageKeys: {
          localStorage: expect.arrayContaining(["falcon.orders.filters", "falcon.dashboard.summary"]),
          sessionStorage: expect.arrayContaining([
            "falcon.orders.search.last",
            "falcon.notifications.cache",
          ]),
        },
      });
    } finally {
      window.removeEventListener(WORKSPACE_SWITCH_INVALIDATION_EVENT, invalidationHandler);
    }
  });

  it("switches Falcon AMC to Continental Internal Operations and resets order detail to the dashboard", () => {
    shellProfileState.appContext = { is_owner: true };
    permissionState.allowed = new Set([
      PERMISSIONS.CLIENTS_READ_ALL,
      PERMISSIONS.RELATIONSHIPS_READ,
      PERMISSIONS.VENDORS_READ,
    ]);
    window.localStorage.setItem(OPERATIONS_MODE_STORAGE_KEY, "amc_operations");
    const { container } = renderTopNav("/orders/amc-order-123");
    const desktopContext = container.querySelector('aside [data-testid="operations-mode-switcher"]');

    fireEvent.click(within(desktopContext).getByRole("button", { name: "Continental Internal Operations" }));

    expect(within(desktopContext).getByRole("button", { name: "Continental Internal Operations" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(desktopContext).getByTestId("operations-mode-selected-label")).toHaveTextContent(
      "Continental Internal Operations",
    );
    expect(window.localStorage.getItem(OPERATIONS_MODE_STORAGE_KEY)).toBe("internal_operations");
    expect(screen.getByTestId("current-path")).toHaveTextContent("/dashboard");
    expect(screen.getByTestId("current-search")).toHaveTextContent("");
    expect(screen.getByTestId("current-navigation-type")).toHaveTextContent("REPLACE");
  });

  it("restores the stored operations mode as the visible selected value", () => {
    shellProfileState.appContext = { is_owner: true };
    permissionState.allowed = new Set([PERMISSIONS.VENDORS_READ]);
    window.localStorage.setItem(OPERATIONS_MODE_STORAGE_KEY, "amc_operations");

    const { container } = renderTopNav();
    const desktopContext = container.querySelector('aside [data-testid="operations-mode-switcher"]');

    expect(within(desktopContext).getByRole("button", { name: "Falcon AMC" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(desktopContext).getByTestId("operations-mode-selected-label")).toHaveTextContent(
      "Falcon AMC",
    );
  });

  it("uses the AMC workspace shell cue in Falcon AMC", () => {
    shellProfileState.appContext = { is_owner: true };
    permissionState.allowed = new Set([PERMISSIONS.VENDORS_READ]);
    window.localStorage.setItem(OPERATIONS_MODE_STORAGE_KEY, "amc_operations");

    renderTopNav();

    expect(shellWorkModeCues()[0]).toHaveTextContent("Procurement Command");
    expect(shellWorkModeCues()[0]).toHaveAttribute(
      "title",
      "Vendor procurement and AMC operations",
    );
  });

  it("shows Vendors only in Falcon AMC nav when vendor read access is available", () => {
    shellProfileState.appContext = { is_admin_role: true };
    permissionState.allowed = new Set([
      PERMISSIONS.CLIENTS_READ_ALL,
      PERMISSIONS.RELATIONSHIPS_READ,
      PERMISSIONS.VENDORS_READ,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
    ]);
    window.localStorage.setItem(OPERATIONS_MODE_STORAGE_KEY, "amc_operations");

    const { container } = renderTopNav();
    const desktopNav = getDesktopPrimaryNav(container);
    const links = desktopLinks(container);

    expect(within(desktopNav).getAllByText("Management Operations")).toHaveLength(2);
    expect(within(desktopNav).getAllByText("Vendor Network")).toHaveLength(2);
    expect(within(desktopNav).getAllByText("Client Services")).toHaveLength(2);
    expect(within(desktopNav).queryByText("Network")).toBeNull();
    expect(links.map((link) => link.textContent)).toEqual([
      "Management Operations",
      "Procurement",
      "Assignment Oversight",
      "Vendor Network",
      "Client Services",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/dashboard",
      "/orders",
      "/calendar",
      "/vendors",
      "/clients",
    ]);
    expect(within(desktopNav).queryByRole("link", { name: "Staff Directory" })).toBeNull();
    expect(within(desktopNav).queryByRole("link", { name: "Staff Assignments" })).toBeNull();
    expect(within(desktopNav).queryByRole("link", { name: "Relationships" })).toBeNull();
  });

  it("does not show Vendors in Falcon AMC without vendor read access", () => {
    permissionState.allowed = new Set([
      PERMISSIONS.CLIENTS_READ_ALL,
      PERMISSIONS.RELATIONSHIPS_READ,
    ]);
    window.localStorage.setItem(OPERATIONS_MODE_STORAGE_KEY, "amc_operations");

    const { container } = renderTopNav();
    const desktopNav = getDesktopPrimaryNav(container);
    const links = desktopLinks(container);

    expect(within(desktopNav).queryByRole("button", { name: "Falcon AMC" })).not.toBeInTheDocument();
    expect(container.querySelector('aside [data-testid="operations-mode-current"]')).toHaveTextContent(
      "Continental Internal Operations",
    );
    expect(links.map((link) => link.textContent)).toEqual([
      "Appraisal Production",
      "Client Orders",
      "Review Workflow",
      "Client Relationships",
    ]);
    expect(within(desktopNav).queryByRole("link", { name: "Vendor Network" })).toBeNull();
  });

  it("does not expose Falcon AMC to non-owner staff even with vendor read access", () => {
    shellProfileState.profileId = "my_work";
    shellProfileState.appContext = { is_owner: false, is_admin_role: false };
    permissionState.allowed = new Set([PERMISSIONS.VENDORS_READ]);
    window.localStorage.setItem(OPERATIONS_MODE_STORAGE_KEY, "amc_operations");

    const { container } = renderTopNav();
    const desktopContext = container.querySelector('aside [data-testid="operations-mode-switcher"]');

    expect(within(desktopContext).queryByRole("button", { name: "Falcon AMC" })).not.toBeInTheDocument();
    expect(within(desktopContext).getByRole("button", { name: "Continental Internal Operations" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(container.querySelector('aside [data-testid="operations-mode-current"]')).toHaveTextContent(
      "Continental Internal Operations",
    );
  });

  it("does not expose Falcon AMC to a current-company owner when explicit operation access is Internal only", () => {
    shellProfileState.appContext = {
      is_owner: true,
      operations_access: {
        internal_operations: true,
        amc_operations: false,
      },
    };
    permissionState.allowed = new Set([PERMISSIONS.VENDORS_READ]);
    window.localStorage.setItem(OPERATIONS_MODE_STORAGE_KEY, "amc_operations");

    const { container } = renderTopNav();
    const desktopContext = container.querySelector('aside [data-testid="operations-mode-switcher"]');

    expect(within(desktopContext).queryByRole("button", { name: "Falcon AMC" })).not.toBeInTheDocument();
    expect(within(desktopContext).getByRole("button", { name: "Continental Internal Operations" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(container.querySelector('aside [data-testid="operations-mode-current"]')).toHaveTextContent(
      "Continental Internal Operations",
    );
  });

  it("supports an AMC-only operation owner without adding Continental Internal Operations to the selector", () => {
    shellProfileState.appContext = {
      is_owner: true,
      available_operations_modes: ["amc_operations"],
    };
    permissionState.allowed = new Set([PERMISSIONS.VENDORS_READ]);
    window.localStorage.setItem(OPERATIONS_MODE_STORAGE_KEY, "internal_operations");

    const { container } = renderTopNav();
    const desktopContext = container.querySelector('aside [data-testid="operations-mode-switcher"]');

    expect(within(desktopContext).getByRole("button", { name: "Falcon AMC" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(desktopContext).queryByRole("button", { name: "Continental Internal Operations" })).not.toBeInTheDocument();
    expect(container.querySelector('aside [data-testid="operations-mode-current"]')).toHaveTextContent(
      "Falcon AMC",
    );
  });

  it("supports an AMC admin who is not owner when explicit operation access grants AMC", () => {
    shellProfileState.appContext = {
      is_owner: false,
      is_admin_role: true,
      operationAccess: {
        amc: true,
      },
    };
    permissionState.allowed = new Set([PERMISSIONS.VENDORS_READ]);

    const { container } = renderTopNav();
    const desktopContext = container.querySelector('aside [data-testid="operations-mode-switcher"]');

    expect(within(desktopContext).getByRole("button", { name: "Falcon AMC" })).toBeInTheDocument();
    expect(within(desktopContext).queryByRole("button", { name: "Continental Internal Operations" })).not.toBeInTheDocument();
    expect(container.querySelector('aside [data-testid="operations-mode-current"]')).toHaveTextContent(
      "Falcon AMC",
    );
  });

  it("renders the operations mode switcher in mobile navigation", () => {
    shellProfileState.appContext = { is_owner: true };
    permissionState.allowed = new Set([PERMISSIONS.VENDORS_READ]);
    const { container } = renderTopNav();
    const mobileNav = openMobileNav(container);

    expect(within(mobileNav).getByTestId("operations-mode-switcher")).toBeInTheDocument();
    expect(within(mobileNav).getByRole("button", { name: "Continental Internal Operations" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(within(mobileNav).getByRole("button", { name: "Falcon AMC" }));

    expect(within(mobileNav).getByRole("button", { name: "Falcon AMC" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(mobileNav).getByTestId("operations-mode-selected-label")).toHaveTextContent(
      "Falcon AMC",
    );
    expect(screen.getByTestId("current-path")).toHaveTextContent("/dashboard");
  });

  it("keeps desktop and mobile operations mode switchers synchronized", () => {
    shellProfileState.appContext = { is_admin_role: true };
    permissionState.allowed = new Set([PERMISSIONS.VENDORS_READ]);
    const { container } = renderTopNav();
    const desktopContext = container.querySelector('aside [data-testid="operations-mode-switcher"]');

    fireEvent.click(within(desktopContext).getByRole("button", { name: "Falcon AMC" }));

    const mobileNav = openMobileNav(container);

    expect(within(mobileNav).getByRole("button", { name: "Falcon AMC" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(mobileNav).getByTestId("operations-mode-selected-label")).toHaveTextContent(
      "Falcon AMC",
    );

    fireEvent.click(within(mobileNav).getByRole("button", { name: "Continental Internal Operations" }));

    expect(within(desktopContext).getByRole("button", { name: "Continental Internal Operations" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(desktopContext).getByTestId("operations-mode-selected-label")).toHaveTextContent(
      "Continental Internal Operations",
    );
    expect(window.localStorage.getItem(OPERATIONS_MODE_STORAGE_KEY)).toBe("internal_operations");
  });

  it("keeps AMC mobile navigation ordered from visible workspace links and preserves Settings placement", () => {
    shellProfileState.appContext = { is_owner: true };
    permissionState.allowed = new Set([
      PERMISSIONS.CLIENTS_READ_ALL,
      PERMISSIONS.VENDORS_READ,
      PERMISSIONS.SETTINGS_VIEW,
    ]);
    window.localStorage.setItem(OPERATIONS_MODE_STORAGE_KEY, "amc_operations");

    const { container } = renderTopNav();
    const mobileNav = openMobileNav(container);
    const links = within(mobileNav).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual([
      "Procurement",
      "Assignment Oversight",
      "Vendor Network",
      "Client Services",
      "Settings",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/orders",
      "/calendar",
      "/vendors",
      "/clients",
      "/settings",
    ]);
    expect(within(mobileNav).queryByRole("link", { name: "Staff Assignments" })).toBeNull();
    expect(within(mobileNav).queryByRole("link", { name: "Relationships" })).toBeNull();
    expect(within(mobileNav).queryByRole("link", { name: "Staff Directory" })).toBeNull();
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
    expect(within(desktopNav).getAllByText("Appraisal Production")).toHaveLength(2);
    expect(within(desktopNav).getByText("Operations Management")).toBeInTheDocument();
    expect(links.map((link) => link.textContent)).toEqual([
      "Appraisal Production",
      "Client Orders",
      "Review Workflow",
      "Client Relationships",
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

    expect(within(desktopNav).getAllByText("Appraisal Production")).toHaveLength(2);
    expect(within(desktopNav).queryByText("Operations Management")).toBeNull();
    expect(links.map((link) => link.textContent)).toEqual(["Appraisal Production", "Client Orders", "Review Workflow"]);
    expect(within(desktopNav).queryByRole("link", { name: "Staff Assignments" })).toBeNull();
    expect(within(desktopNav).queryByRole("link", { name: "Relationships" })).toBeNull();
    expect(within(desktopNav).queryByRole("link", { name: "Client Relationships" })).toBeNull();
    expect(within(desktopNav).queryByRole("link", { name: "Staff Directory" })).toBeNull();
  });

  it("does not expose Assignments or Relationships from work eligibility permissions alone", () => {
    permissionState.allowed = new Set([
      PERMISSIONS.ORDERS_ASSIGNABLE_AS_APPRAISER,
      PERMISSIONS.ORDERS_ASSIGNABLE_AS_REVIEWER,
    ]);

    const { container } = renderTopNav();
    const desktopNav = getDesktopPrimaryNav(container);

    expect(within(desktopNav).queryByRole("link", { name: "Staff Assignments" })).toBeNull();
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
      "Client Orders",
      "Review Workflow",
      "Client Relationships",
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
    expect(within(desktopNav).queryByRole("link", { name: "Staff Assignments" })).toBeNull();
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

    expect(within(desktopNav).queryByText("Operations Management")).toBeNull();
    expect(links.map((link) => link.textContent)).toEqual([
      "Appraisal Production",
      "Client Orders",
      "Staff Assignments",
      "Relationships",
      "Review Workflow",
      "Client Relationships",
      "Staff Directory",
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
      "Client Orders",
      "Review Workflow",
      "Client Relationships",
      "Staff Directory",
    ]);
    expect(within(desktopNav).queryByRole("link", { name: "Staff Assignments" })).toBeNull();
    expect(within(desktopNav).queryByRole("link", { name: "Relationships" })).toBeNull();
  });

  it("preserves assigned-only Clients routing", () => {
    permissionState.allowed = new Set([PERMISSIONS.CLIENTS_READ_ASSIGNED]);

    renderTopNav();

    expect(screen.getByRole("link", { name: "Client Relationships" })).toHaveAttribute(
      "href",
      "/clients/cards",
    );
  });

  it("keeps permissioned desktop links hidden when permissions are absent", () => {
    renderTopNav();

    expect(screen.getByRole("link", { name: "Client Orders" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review Workflow" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Staff Assignments" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Relationships" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Client Relationships" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Staff Directory" })).toBeNull();
  });

  it("preserves exact-path active styling through the operational spine NavItem", () => {
    renderTopNav("/orders");

    const ordersLink = screen.getByRole("link", { name: "Client Orders" });

    expect(ordersLink).toHaveAttribute("aria-current", "page");
    expect(ordersLink).toHaveClass("bg-white", "text-slate-950", "shadow-md");
    expect(ordersLink.className).toContain("after:bg-slate-900/80");
  });

  it("keeps normal operational navigation links on their existing routes", () => {
    const { container } = renderTopNav("/dashboard");

    fireEvent.click(within(getDesktopPrimaryNav(container)).getByRole("link", { name: "Client Orders" }));

    expect(screen.getByTestId("current-path")).toHaveTextContent("/orders");
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
      "Appraisal Production",
      "Client Orders",
      "Staff Assignments",
      "Relationships",
      "Review Workflow",
      "Client Relationships",
      "Staff Directory",
    ]);
    expect(within(getDesktopPrimaryNav(container)).queryByText("Operations Management")).toBeNull();
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
      "Client Orders",
      "Review Workflow",
      "Client Relationships",
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
      "Client Orders",
      "Review Workflow",
      "Client Relationships",
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
      "Staff Assignments",
      "Client Orders",
      "Review Workflow",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/assignments",
      "/orders",
      "/calendar",
    ]);
    expect(within(mobileNav).queryByRole("link", { name: "Client Relationships" })).toBeNull();
    expect(within(mobileNav).queryByRole("link", { name: "Staff Directory" })).toBeNull();
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
      "Client Orders",
      "Staff Assignments",
      "Relationships",
      "Review Workflow",
      "Client Relationships",
      "Staff Directory",
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

    expect(within(mobileNav).getByRole("link", { name: "Client Relationships" })).toHaveAttribute(
      "href",
      "/clients/cards",
    );
  });

  it("keeps permissioned mobile links hidden when permissions are absent", () => {
    const { container } = renderTopNav();
    const mobileNav = openMobileNav(container);

    expect(within(mobileNav).getByRole("link", { name: "Client Orders" })).toBeInTheDocument();
    expect(within(mobileNav).getByRole("link", { name: "Review Workflow" })).toBeInTheDocument();
    expect(within(mobileNav).queryByRole("link", { name: "Staff Assignments" })).toBeNull();
    expect(within(mobileNav).queryByRole("link", { name: "Relationships" })).toBeNull();
    expect(within(mobileNav).queryByRole("link", { name: "Client Relationships" })).toBeNull();
    expect(within(mobileNav).queryByRole("link", { name: "Staff Directory" })).toBeNull();
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

    fireEvent.click(within(mobileNav).getByRole("link", { name: "Client Orders" }));

    expect(container.querySelectorAll("nav")).toHaveLength(1);
  });
});
