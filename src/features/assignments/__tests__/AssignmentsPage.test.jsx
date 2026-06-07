// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AssignmentsPage from "../AssignmentsPage";
import { OperationsModeProvider } from "@/lib/operations/OperationsModeProvider";

const listAssignedAssignmentsMock = vi.hoisted(() => vi.fn());
const listOwnerAssignmentsMock = vi.hoisted(() => vi.fn());
const permissionState = vi.hoisted(() => ({
  allowed: new Set(),
  loading: false,
}));

vi.mock("../api", () => ({
  listAssignedAssignments: listAssignedAssignmentsMock,
  listOwnerAssignments: listOwnerAssignmentsMock,
}));

vi.mock("@/lib/permissions/constants", () => ({
  PERMISSIONS: {
    ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED: "order_company_assignments.read_assigned",
    ORDER_COMPANY_ASSIGNMENTS_READ_OWNER: "order_company_assignments.read_owner",
  },
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useCanAny: (permissionKeys) => ({
    allowed: permissionKeys.some((permissionKey) => permissionState.allowed.has(permissionKey)),
    loading: permissionState.loading,
  }),
  useEffectivePermissions: () => ({
    loading: permissionState.loading,
    error: null,
    hasPermission: (permissionKey) => permissionState.allowed.has(permissionKey),
  }),
}));

function renderAssignments() {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <OperationsModeProvider>
        <AssignmentsPage />
      </OperationsModeProvider>
    </MemoryRouter>,
  );
}

describe("AssignmentsPage workspace polish", () => {
  beforeEach(() => {
    permissionState.allowed = new Set([
      "order_company_assignments.read_assigned",
      "order_company_assignments.read_owner",
    ]);
    permissionState.loading = false;
    listAssignedAssignmentsMock.mockResolvedValue([
      {
        assignment_id: "assignment-received-1",
        assignment_status: "offered",
        assignment_type: "vendor_appraisal",
        owner_company_name: "Owner AMC",
        order_number: "26001",
        city: "Denver",
        state: "CO",
        instructions: "Inspect the property and confirm access notes.",
        due_at: "2026-05-25T12:00:00.000Z",
        expires_at: "2026-05-23T12:00:00.000Z",
      },
    ]);
    listOwnerAssignmentsMock.mockResolvedValue([
      {
        id: "assignment-sent-1",
        status: "submitted",
        assignment_type: "vendor_appraisal",
        relationship_type: "vendor",
        assigned_company_name: "Mountain Appraisals",
        instructions: "Complete the field assignment packet.",
        due_at: "2026-05-25T12:00:00.000Z",
        updated_at: "2026-05-22T12:00:00.000Z",
      },
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders packet coordination hierarchy without changing lane data sources", async () => {
    renderAssignments();

    expect(screen.getByText("Staff Assignments")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Internal Staff Assignments" })).toBeInTheDocument();
    expect(screen.getByLabelText("Assignments workspace context")).toHaveTextContent("Packet-scoped");
    expect(screen.getByLabelText("Assignments workspace context")).toHaveTextContent("Received work + Sent assignments");

    expect(screen.getByText("Received Work")).toBeInTheDocument();
    expect(screen.getByLabelText("Received work")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Work requests assigned to your company" })).toBeInTheDocument();
    expect(screen.getByText("Sent Assignments")).toBeInTheDocument();
    expect(screen.getByLabelText("Sent assignment packets")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Assignment packets offered by your company" })).toBeInTheDocument();

    await waitFor(() => {
      expect(listAssignedAssignmentsMock).toHaveBeenCalledWith({ status: "" });
      expect(listOwnerAssignmentsMock).toHaveBeenCalledWith({ status: "" });
    });

    expect(await screen.findByRole("link", { name: "Open received work request #26001" })).toHaveAttribute(
      "href",
      "/assignments/assignment-received-1",
    );
    expect(screen.getByText("Work Request")).toBeInTheDocument();
    expect(screen.getByText("Owner AMC")).toBeInTheDocument();
    expect(screen.getByText("Denver, CO")).toBeInTheDocument();
    expect(screen.getByText("Inspect the property and confirm access notes.")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Open sent assignment packet for Mountain Appraisals" })).toHaveAttribute(
      "href",
      "/assignments/assignment-sent-1",
    );
    expect(screen.getByText("Sent Packet")).toBeInTheDocument();
    expect(screen.getByText("Mountain Appraisals")).toBeInTheDocument();
    expect(screen.getByText("Complete the field assignment packet.")).toBeInTheDocument();
    expect(screen.getByText("Open work request")).toBeInTheDocument();
    expect(screen.getByText("Open packet")).toBeInTheDocument();
  });

  it("preserves assigned and owner status filter semantics", async () => {
    renderAssignments();

    await waitFor(() => {
      expect(listAssignedAssignmentsMock).toHaveBeenCalledWith({ status: "" });
      expect(listOwnerAssignmentsMock).toHaveBeenCalledWith({ status: "" });
    });

    fireEvent.change(screen.getByLabelText("Received work status"), {
      target: { value: "accepted" },
    });
    fireEvent.change(screen.getByLabelText("Sent assignments status"), {
      target: { value: "submitted" },
    });

    await waitFor(() => {
      expect(listAssignedAssignmentsMock).toHaveBeenLastCalledWith({ status: "accepted" });
      expect(listOwnerAssignmentsMock).toHaveBeenLastCalledWith({ status: "submitted" });
    });
  });

  it("uses received-work navigation language for assigned-only access", async () => {
    permissionState.allowed = new Set(["order_company_assignments.read_assigned"]);

    renderAssignments();

    expect(screen.getByLabelText("Assignments workspace context")).toHaveTextContent("Assignment-scoped");
    expect(screen.getByLabelText("Assignments workspace context")).toHaveTextContent("Open received work only");
    expect(screen.getByLabelText("Received work")).toBeInTheDocument();
    expect(screen.queryByLabelText("Sent assignment packets")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(listAssignedAssignmentsMock).toHaveBeenCalledWith({ status: "" });
    });
    expect(listOwnerAssignmentsMock).not.toHaveBeenCalled();
  });

  it("keeps unavailable assignment access in a packet-specific empty state", () => {
    permissionState.allowed = new Set();

    renderAssignments();

    expect(screen.getByText("Assignments unavailable")).toBeInTheDocument();
    expect(screen.getByText("Assignments are not available for your current company role.")).toBeInTheDocument();
    expect(listAssignedAssignmentsMock).not.toHaveBeenCalled();
    expect(listOwnerAssignmentsMock).not.toHaveBeenCalled();
  });
});
