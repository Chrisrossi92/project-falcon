// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/lib/permissions/constants";

const permissionState = vi.hoisted(() => ({
  loading: false,
  permissionKeys: [],
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useEffectivePermissions: () => ({
    loading: permissionState.loading,
    hasPermission: (permissionKey) => permissionState.permissionKeys.includes(permissionKey),
  }),
}));

vi.mock("@/features/assignments/components/AssignedWorkDashboard", () => ({
  default: () => <section data-testid="assigned-work-dashboard">Assigned work dashboard</section>,
}));

vi.mock("@/features/assignments/components/OwnerSentAssignmentsDashboard", () => ({
  default: () => <section data-testid="owner-sent-assignments-dashboard">Owner sent assignments</section>,
}));

const { default: AssignmentDashboardPage } = await import("../AssignmentDashboardPage.jsx");

const receivedWorkShell = Object.freeze({
  profileId: "received_work",
  metadataAuthority: "presentation_only",
  profile: Object.freeze({
    id: "received_work",
    dashboardTitle: "Received Work",
    metadataAuthority: "presentation_only",
  }),
});

describe("AssignmentDashboardPage shell presentation", () => {
  beforeEach(() => {
    permissionState.loading = false;
    permissionState.permissionKeys = [PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED];
  });

  afterEach(() => {
    cleanup();
  });

  it("uses received-work dashboard copy for the received_work shell", () => {
    render(<AssignmentDashboardPage shellProfilePresentation={receivedWorkShell} />);

    expect(screen.getByRole("heading", { name: "Received Work" })).toBeInTheDocument();
    expect(screen.getByText("Assignment-scoped")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Review work requests assigned to your company, track due dates and assignment status, and follow owner review after submission.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Assignment Dashboard")).toBeNull();
    expect(screen.queryByText(/packet/i)).toBeNull();
  });

  it("keeps the existing assignment dashboard frame outside received_work shell presentation", () => {
    render(
      <AssignmentDashboardPage
        shellProfilePresentation={{
          profileId: "operations",
          metadataAuthority: "presentation_only",
          profile: { id: "operations", dashboardTitle: "Operations Dashboard" },
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Assignment Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Company Work")).toBeInTheDocument();
    expect(screen.getByText(/Assignment-native work queues/)).toBeInTheDocument();
  });

  it("preserves assigned and owner assignment widgets from permissions", () => {
    permissionState.permissionKeys = [
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
    ];

    render(<AssignmentDashboardPage shellProfilePresentation={receivedWorkShell} />);

    expect(screen.getByTestId("assigned-work-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("owner-sent-assignments-dashboard")).toBeInTheDocument();
  });

  it("preserves assignment dashboard loading behavior", () => {
    permissionState.loading = true;

    render(<AssignmentDashboardPage shellProfilePresentation={receivedWorkShell} />);

    expect(screen.getByText("Loading assignment dashboard...")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Received Work" })).toBeNull();
  });
});
