/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "../../permissions/constants.js";
import { SHELL_PROFILE_AUTHORITY, SHELL_PROFILE_IDS } from "../resolveShellProfile.js";
import { useShellProfile } from "../useShellProfile.js";

const sessionState = vi.hoisted(() => ({
  userId: "user-1",
  isLoading: false,
}));

const appContextState = vi.hoisted(() => ({
  context: {
    user_id: "user-1",
    current_company_id: "company-1",
    has_current_company_membership: true,
    primary_role_key: "appraiser",
    role_keys: ["appraiser"],
    role_assignments: [],
    is_owner: false,
    is_admin_role: false,
    is_appraiser_role: true,
    is_reviewer_role: false,
  },
  loading: false,
  error: null,
}));

const permissionsState = vi.hoisted(() => ({
  permissionKeys: ["orders.read.assigned"],
  loading: false,
  error: null,
}));

vi.mock("@/lib/hooks/useSession", () => ({
  default: () => ({
    userId: sessionState.userId,
    user: sessionState.userId ? { id: sessionState.userId } : null,
    session: sessionState.userId ? { user: { id: sessionState.userId } } : null,
    isLoading: sessionState.isLoading,
  }),
}));

vi.mock("@/features/auth/useCurrentUserAppContext", () => ({
  useCurrentUserAppContext: () => ({
    context: appContextState.context,
    data: appContextState.context,
    loading: appContextState.loading,
    error: appContextState.error,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useEffectivePermissions: () => ({
    permissionKeys: permissionsState.permissionKeys,
    permissions: permissionsState.permissionKeys,
    loading: permissionsState.loading,
    error: permissionsState.error,
    reload: vi.fn(),
  }),
}));

function ShellProfileProbe() {
  const shellProfile = useShellProfile();

  return (
    <dl>
      <dt>profile</dt>
      <dd>{shellProfile.profileId}</dd>
      <dt>label</dt>
      <dd>{shellProfile.profile?.displayLabel}</dd>
      <dt>reason</dt>
      <dd>{shellProfile.resolutionReason}</dd>
      <dt>authority</dt>
      <dd>{shellProfile.metadataAuthority}</dd>
      <dt>loading</dt>
      <dd>{String(shellProfile.loading)}</dd>
      <dt>presentation</dt>
      <dd>{String(shellProfile.isPresentationOnly)}</dd>
    </dl>
  );
}

describe("useShellProfile", () => {
  beforeEach(() => {
    sessionState.userId = "user-1";
    sessionState.isLoading = false;
    appContextState.context = {
      user_id: "user-1",
      current_company_id: "company-1",
      has_current_company_membership: true,
      primary_role_key: "appraiser",
      role_keys: ["appraiser"],
      role_assignments: [],
      is_owner: false,
      is_admin_role: false,
      is_appraiser_role: true,
      is_reviewer_role: false,
    };
    appContextState.loading = false;
    appContextState.error = null;
    permissionsState.permissionKeys = [PERMISSIONS.ORDERS_READ_ASSIGNED];
    permissionsState.loading = false;
    permissionsState.error = null;
  });

  afterEach(() => {
    cleanup();
  });

  it("observes the current shell profile with presentation-only metadata", () => {
    render(<ShellProfileProbe />);

    expect(screen.getByText(SHELL_PROFILE_IDS.MY_WORK)).toBeInTheDocument();
    expect(screen.getByText("My Work")).toBeInTheDocument();
    expect(screen.getByText("primary_appraiser_role")).toBeInTheDocument();
    expect(screen.getByText(SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY)).toBeInTheDocument();
    expect(screen.getByText("true")).toBeInTheDocument();
  });

  it("observes assignment-only users as received work without changing route or nav behavior", () => {
    appContextState.context = {
      ...appContextState.context,
      primary_role_key: "vendor",
      role_keys: ["vendor"],
      is_appraiser_role: false,
    };
    permissionsState.permissionKeys = [PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED];

    render(<ShellProfileProbe />);

    expect(screen.getByText(SHELL_PROFILE_IDS.RECEIVED_WORK)).toBeInTheDocument();
    expect(screen.getByText("Received Work")).toBeInTheDocument();
    expect(screen.getByText("assignment_only")).toBeInTheDocument();
  });

  it("keeps loading state separate from the passive fallback exposure", () => {
    appContextState.loading = true;
    permissionsState.loading = true;

    render(<ShellProfileProbe />);

    expect(screen.getByText(SHELL_PROFILE_IDS.MY_WORK)).toBeInTheDocument();
    expect(screen.getAllByText("true")).toHaveLength(2);
  });

  it("returns a stable fallback while app context is unresolved", () => {
    appContextState.context = null;
    appContextState.loading = true;

    render(<ShellProfileProbe />);

    expect(screen.getByText(SHELL_PROFILE_IDS.COMPANY_REQUIRED)).toBeInTheDocument();
    expect(screen.getByText("Company required")).toBeInTheDocument();
    expect(screen.getByText("current_company_required")).toBeInTheDocument();
    expect(screen.getAllByText("true")).toHaveLength(2);
  });
});
