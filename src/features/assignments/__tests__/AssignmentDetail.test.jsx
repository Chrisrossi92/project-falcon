// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const permissionState = vi.hoisted(() => ({
  loading: false,
  allowed: new Set(["order_company_assignments.read_owner"]),
}));

const assignmentApiState = vi.hoisted(() => ({
  acceptAssignment: vi.fn(),
  addVendorAssignmentInternalNote: vi.fn(),
  cancelAssignment: vi.fn(),
  completeAssignment: vi.fn(),
  createOrderCompanyAssignmentInvitation: vi.fn(),
  declineAssignment: vi.fn(),
  getAssignedOfferPacket: vi.fn(),
  getAssignedWorkPacket: vi.fn(),
  getOwnerAssignmentPacket: vi.fn(),
  listVendorAssignmentInternalNotes: vi.fn(),
  requestVendorAssignmentRevision: vi.fn(),
  revokeAssignment: vi.fn(),
  startAssignment: vi.fn(),
  submitAssignment: vi.fn(),
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useEffectivePermissions: () => ({
    loading: permissionState.loading,
    hasPermission: (permission) => permissionState.allowed.has(permission),
  }),
}));

vi.mock("../api", () => ({
  acceptAssignment: assignmentApiState.acceptAssignment,
  addVendorAssignmentInternalNote: assignmentApiState.addVendorAssignmentInternalNote,
  cancelAssignment: assignmentApiState.cancelAssignment,
  completeAssignment: assignmentApiState.completeAssignment,
  createOrderCompanyAssignmentInvitation: assignmentApiState.createOrderCompanyAssignmentInvitation,
  declineAssignment: assignmentApiState.declineAssignment,
  getAssignedOfferPacket: assignmentApiState.getAssignedOfferPacket,
  getAssignedWorkPacket: assignmentApiState.getAssignedWorkPacket,
  getOwnerAssignmentPacket: assignmentApiState.getOwnerAssignmentPacket,
  listVendorAssignmentInternalNotes: assignmentApiState.listVendorAssignmentInternalNotes,
  requestVendorAssignmentRevision: assignmentApiState.requestVendorAssignmentRevision,
  revokeAssignment: assignmentApiState.revokeAssignment,
  startAssignment: assignmentApiState.startAssignment,
  submitAssignment: assignmentApiState.submitAssignment,
}));

vi.mock("../components/AssignmentActivityTimeline", () => ({
  default: ({ assignmentId }) => (
    <section data-testid="assignment-activity">
      Assignment activity for {assignmentId}
    </section>
  ),
}));

const { default: AssignmentDetail } = await import("../AssignmentDetail");

const ownerPacket = {
  assignment_id: "assignment-1",
  assignment_status: "offered",
  assignment_type: "vendor_appraisal",
  owner_company_id: "owner-company-1",
  assigned_company_id: "vendor-company-1",
  assigned_company_name: "Field Partner",
  relationship_id: "relationship-1",
  relationship_type: "amc_vendor",
  relationship_status: "active",
  order_id: "order-1",
  order_number: "26001",
  order_status: "in_review",
  city: "Columbus",
  state: "OH",
  report_type: "Full appraisal",
  property_type: "Single family",
  due_at: "2026-05-25T12:00:00.000Z",
  instructions: "Confirm access before inspection.",
  terms: {},
  handoff_payload: {},
  submission_payload: {},
  compliance_snapshot: {},
};

function renderAssignmentDetail(initialPath = "/assignments/assignment-1") {
  return render(
    <MemoryRouter initialEntries={[initialPath]} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Routes>
        <Route path="/assignments/:assignmentId" element={<AssignmentDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

function absoluteLink(path) {
  return new URL(path, window.location.origin).toString();
}

describe("AssignmentDetail assignment invitation actions", () => {
  beforeEach(() => {
    permissionState.loading = false;
    permissionState.allowed = new Set(["order_company_assignments.read_owner"]);
    Object.values(assignmentApiState).forEach((mock) => mock.mockReset());
    assignmentApiState.listVendorAssignmentInternalNotes.mockResolvedValue({ ok: true, items: [] });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Generate Assignment Link for offered owner vendor appraisal assignment details", async () => {
    assignmentApiState.getOwnerAssignmentPacket.mockResolvedValue(ownerPacket);

    renderAssignmentDetail();

    expect(await screen.findByRole("button", { name: "Generate Assignment Link" })).toBeInTheDocument();
    expect(assignmentApiState.getOwnerAssignmentPacket).toHaveBeenCalledWith("assignment-1");
    expect(screen.getByText("Assignment invitation")).toBeInTheDocument();
  });

  it("generates and displays an assignment invitation link from AssignmentDetail", async () => {
    assignmentApiState.getOwnerAssignmentPacket.mockResolvedValue(ownerPacket);
    assignmentApiState.createOrderCompanyAssignmentInvitation.mockResolvedValue({
      invitation_id: "invitation-1",
      assignment_id: "assignment-1",
      path: "/vendor/assignment-offers/token-1",
    });

    renderAssignmentDetail();

    fireEvent.click(await screen.findByRole("button", { name: "Generate Assignment Link" }));

    await waitFor(() => {
      expect(assignmentApiState.createOrderCompanyAssignmentInvitation).toHaveBeenCalledWith("assignment-1");
    });
    expect(await screen.findByRole("link", { name: absoluteLink("/vendor/assignment-offers/token-1") })).toHaveAttribute(
      "href",
      absoluteLink("/vendor/assignment-offers/token-1"),
    );
  });

  it("does not render assignment invitation actions for non-offered owner assignment details", async () => {
    assignmentApiState.getOwnerAssignmentPacket.mockResolvedValue({
      ...ownerPacket,
      assignment_status: "accepted",
    });

    renderAssignmentDetail();

    await screen.findByText("Owner Packet");
    expect(screen.queryByRole("button", { name: "Generate Assignment Link" })).not.toBeInTheDocument();
  });

  it("requests a vendor assignment revision from submitted owner assignment details", async () => {
    assignmentApiState.getOwnerAssignmentPacket
      .mockResolvedValueOnce({
        ...ownerPacket,
        assignment_status: "submitted",
        submitted_at: "2026-06-05T15:00:00.000Z",
        submission_payload: { note: "Initial report submitted" },
      })
      .mockResolvedValueOnce({
        ...ownerPacket,
        assignment_status: "revision_requested",
        submitted_at: "2026-06-05T15:00:00.000Z",
        submission_payload: {
          note: "Initial report submitted",
          revision: {
            status: "revision_requested",
            instructions: "Revise the rent grid.",
            requested_at: "2026-06-05T16:00:00.000Z",
            due_at: "2026-06-08T17:00:00.000Z",
          },
        },
      });
    assignmentApiState.requestVendorAssignmentRevision.mockResolvedValue({
      ok: true,
      status: "revision_requested",
    });

    renderAssignmentDetail();

    fireEvent.click(await screen.findByRole("button", { name: "Request Revision" }));
    fireEvent.change(screen.getByLabelText("Vendor-facing instructions"), {
      target: { value: "Revise the rent grid." },
    });
    fireEvent.change(screen.getByLabelText("Revision due date"), {
      target: { value: "2026-06-08T17:00" },
    });
    const requestButtons = screen.getAllByRole("button", { name: "Request Revision" });
    fireEvent.click(requestButtons[requestButtons.length - 1]);

    await waitFor(() => {
      expect(assignmentApiState.requestVendorAssignmentRevision).toHaveBeenCalledWith("assignment-1", {
        revision_instructions: "Revise the rent grid.",
        revision_due_at: "2026-06-08T17:00",
      });
    });
    await waitFor(() => {
      expect(assignmentApiState.getOwnerAssignmentPacket).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByLabelText("Revision request summary")).toHaveTextContent("Revise the rent grid.");
  });

  it("records private internal coordinator notes separately from revision instructions", async () => {
    permissionState.allowed = new Set([
      "order_company_assignments.read_owner",
      "order_company_assignments.complete",
    ]);
    assignmentApiState.getOwnerAssignmentPacket.mockResolvedValue({
      ...ownerPacket,
      assignment_status: "submitted",
      submitted_at: "2026-06-05T15:00:00.000Z",
      submission_payload: { note: "Initial report submitted" },
    });
    assignmentApiState.listVendorAssignmentInternalNotes
      .mockResolvedValueOnce({ ok: true, items: [] })
      .mockResolvedValueOnce({
        ok: true,
        items: [
          {
            note_key: "note-key-1",
            note_context: "revision",
            note_text: "Coordinator-only: verify rent grid before vendor message.",
            author_name: "AMC Coordinator",
            created_at: "2026-06-05T16:30:00.000Z",
          },
        ],
      });
    assignmentApiState.addVendorAssignmentInternalNote.mockResolvedValue({
      ok: true,
      message: "Internal note saved.",
    });

    renderAssignmentDetail();

    expect(await screen.findByLabelText("Internal coordinator notes")).toHaveTextContent(
      "These are not sent to vendors.",
    );
    fireEvent.change(screen.getByLabelText("Context"), {
      target: { value: "revision" },
    });
    fireEvent.change(screen.getByLabelText("Internal note"), {
      target: { value: "Coordinator-only: verify rent grid before vendor message." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Internal Note" }));

    await waitFor(() => {
      expect(assignmentApiState.addVendorAssignmentInternalNote).toHaveBeenCalledWith("assignment-1", {
        note_text: "Coordinator-only: verify rent grid before vendor message.",
        note_context: "revision",
      });
    });
    expect(await screen.findByText("Coordinator-only: verify rent grid before vendor message.")).toBeInTheDocument();
    expect(screen.getByText("By AMC Coordinator")).toBeInTheDocument();
  });
});
