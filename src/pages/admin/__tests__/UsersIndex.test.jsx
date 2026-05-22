// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const permissionsState = vi.hoisted(() => ({
  allowed: true,
}));

const membersApiMock = vi.hoisted(() => ({
  listCompanyMembers: vi.fn(),
  setCompanyMemberStatus: vi.fn(),
  updateCompanyMemberRoles: vi.fn(),
}));

const invitationsApiMock = vi.hoisted(() => ({
  cancelCompanyInvitation: vi.fn(),
  listCompanyInvitations: vi.fn(),
  listCompanyRolePresets: vi.fn(),
  resendCompanyInvitation: vi.fn(),
  sendCompanyInvitation: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useCan: () => ({
    allowed: permissionsState.allowed,
    loading: false,
    error: null,
  }),
}));

vi.mock("@/features/company-members/api", () => membersApiMock);
vi.mock("@/features/company-invitations/api", () => invitationsApiMock);

vi.mock("react-hot-toast", () => ({
  default: toastMock,
}));

const { default: UsersIndex } = await import("../UsersIndex.jsx");

const ownerMember = {
  user_id: "user-owner",
  membership_id: "membership-owner",
  display_name: "Olivia Owner",
  email: "owner@example.com",
  membership_status: "active",
  membership_type: "company",
  joined_at: "2026-05-01T12:00:00Z",
  auth_linked: true,
  is_owner: true,
  role_assignments: [
    {
      role_id: "role-owner",
      role_name: "Owner",
      is_owner_role: true,
      is_primary: true,
      status: "active",
    },
  ],
  can_update_roles: true,
  can_deactivate: false,
  can_reactivate: false,
};

const appraiserMember = {
  user_id: "user-appraiser",
  membership_id: "membership-appraiser",
  display_name: "Alex Appraiser",
  email: "alex@example.com",
  membership_status: "active",
  joined_at: "2026-05-02T12:00:00Z",
  auth_linked: true,
  is_owner: false,
  role_assignments: [
    {
      role_id: "role-appraiser",
      role_name: "Appraiser",
      is_owner_role: false,
      is_primary: true,
      status: "active",
    },
  ],
  can_update_roles: true,
  can_deactivate: true,
  can_reactivate: false,
};

const inactiveMember = {
  user_id: "user-inactive",
  membership_id: "membership-inactive",
  display_name: "Inactive Irene",
  email: "inactive@example.com",
  membership_status: "inactive",
  joined_at: "2026-05-03T12:00:00Z",
  auth_linked: false,
  is_owner: false,
  role_assignments: [
    {
      role_id: "role-reviewer",
      role_name: "Reviewer",
      is_owner_role: false,
      is_primary: true,
      status: "active",
    },
  ],
  can_update_roles: false,
  can_deactivate: false,
  can_reactivate: true,
};

const pendingInvitation = {
  invitation_id: "invite-1",
  invite_email: "pending@example.com",
  invitation_status: "sent",
  role_assignments: [
    {
      role_id: "role-admin",
      role_name: "Admin",
      display_name: "Admin",
      is_primary: true,
    },
  ],
  invited_by_display_name: "Olivia Owner",
  created_at: "2026-05-04T12:00:00Z",
  expires_at: "2026-05-11T12:00:00Z",
  auth_invite_sent_at: "2026-05-04T12:05:00Z",
  accepted_at: null,
  cancelled_at: null,
  can_resend: true,
  can_cancel: true,
};

function renderUsersIndex() {
  return render(<UsersIndex />);
}

function memberArticle(name) {
  return screen.getAllByText(name).map((node) => node.closest("article")).find(Boolean);
}

describe("UsersIndex Team Access readability", () => {
  beforeEach(() => {
    permissionsState.allowed = true;
    membersApiMock.listCompanyMembers.mockResolvedValue([
      ownerMember,
      appraiserMember,
      inactiveMember,
    ]);
    membersApiMock.setCompanyMemberStatus.mockReset();
    membersApiMock.updateCompanyMemberRoles.mockReset();
    invitationsApiMock.cancelCompanyInvitation.mockReset();
    invitationsApiMock.listCompanyInvitations.mockResolvedValue([pendingInvitation]);
    invitationsApiMock.listCompanyRolePresets.mockResolvedValue([]);
    invitationsApiMock.resendCompanyInvitation.mockReset();
    invitationsApiMock.sendCompanyInvitation.mockReset();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders active team members separately from inactive or invited member rows", async () => {
    renderUsersIndex();

    const activeSection = await screen.findByText("Active Team Members");
    expect(activeSection).toBeInTheDocument();
    expect(screen.getByText("People with active current-company membership.")).toBeInTheDocument();
    expect(screen.getAllByText("Olivia Owner").length).toBeGreaterThan(0);
    expect(screen.getByText("Alex Appraiser")).toBeInTheDocument();
    expect(screen.queryByText("Inactive Irene")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Show inactive"));

    await screen.findByText("Inactive / Invited Members");
    expect(screen.getByText("Inactive Irene")).toBeInTheDocument();
    expect(screen.getByText("These rows are separated from active access for clarity.")).toBeInTheDocument();
  });

  it("renders clearer status chips and owner/admin access indicators", async () => {
    renderUsersIndex();

    await screen.findByText("Active Team Members");

    const ownerCard = memberArticle("Olivia Owner");
    expect(ownerCard).not.toBeNull();
    expect(within(ownerCard).getAllByText("Owner").length).toBeGreaterThan(0);
    expect(within(ownerCard).getByText("Active")).toBeInTheDocument();
    expect(within(ownerCard).getByText("Owner-protected access")).toBeInTheDocument();
    expect(within(ownerCard).getByText("Primary")).toBeInTheDocument();

    const appraiserCard = memberArticle("Alex Appraiser");
    expect(appraiserCard).not.toBeNull();
    expect(within(appraiserCard).getByText("Appraiser")).toBeInTheDocument();
    expect(within(appraiserCard).getByText("1 active role")).toBeInTheDocument();
  });

  it("renders pending invitations with status help and role primary labels", async () => {
    renderUsersIndex();

    await screen.findByText("Pending Invitations");
    expect(screen.getByText("pending@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("Sent").length).toBeGreaterThan(0);
    expect(screen.getByText("Waiting for acceptance")).toBeInTheDocument();
    expect(screen.getByText("Admin (primary)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send another invite email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders safer empty states", async () => {
    membersApiMock.listCompanyMembers.mockResolvedValue([]);
    invitationsApiMock.listCompanyInvitations.mockResolvedValue([]);

    renderUsersIndex();

    expect(await screen.findByText(/No company members are visible for the current filter/)).toBeInTheDocument();
    expect(screen.getByText(/Solo-owner setup is valid/)).toBeInTheDocument();
    expect(screen.getByText(/No pending invitations/)).toBeInTheDocument();
    expect(screen.getByText(/Invite a member when another person needs company access/)).toBeInTheDocument();
  });

  it("does not call governed mutation APIs during readability rendering", async () => {
    renderUsersIndex();

    await screen.findByText("Active Team Members");
    await screen.findByText("pending@example.com");

    expect(membersApiMock.setCompanyMemberStatus).not.toHaveBeenCalled();
    expect(membersApiMock.updateCompanyMemberRoles).not.toHaveBeenCalled();
    expect(invitationsApiMock.cancelCompanyInvitation).not.toHaveBeenCalled();
    expect(invitationsApiMock.resendCompanyInvitation).not.toHaveBeenCalled();
    expect(invitationsApiMock.sendCompanyInvitation).not.toHaveBeenCalled();
  });
});
