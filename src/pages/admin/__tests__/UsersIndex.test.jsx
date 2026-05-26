// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const permissionsState = vi.hoisted(() => ({
  allowed: true,
}));

const shellProfileState = vi.hoisted(() => ({
  profileId: "operations",
}));

const membersApiMock = vi.hoisted(() => ({
  listCompanyMemberPermissionOverrides: vi.fn(),
  listCompanyMembers: vi.fn(),
  saveCompanyMemberPermissionOverrides: vi.fn(),
  setCompanyMemberStatus: vi.fn(),
  updateCompanyMemberRoles: vi.fn(),
}));

const invitationsApiMock = vi.hoisted(() => ({
  cancelCompanyInvitation: vi.fn(),
  listCompanyInvitations: vi.fn(),
  listCompanyRolePermissionPreview: vi.fn(),
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

vi.mock("@/lib/shell/useShellProfile", () => ({
  useShellProfile: () => ({
    profileId: shellProfileState.profileId,
    metadataAuthority: "presentation_only",
    isPresentationOnly: true,
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

const adminMember = {
  user_id: "user-admin",
  membership_id: "membership-admin",
  display_name: "Ari Admin",
  email: "ari@example.com",
  membership_status: "active",
  joined_at: "2026-05-02T13:00:00Z",
  auth_linked: true,
  is_owner: false,
  role_assignments: [
    {
      role_id: "role-admin",
      role_name: "Admin",
      is_owner_role: false,
      is_primary: true,
      status: "active",
    },
  ],
  can_update_roles: true,
  can_deactivate: true,
  can_reactivate: false,
};

const reviewerMember = {
  user_id: "user-reviewer",
  membership_id: "membership-reviewer",
  display_name: "Riley Reviewer",
  email: "riley@example.com",
  membership_status: "active",
  joined_at: "2026-05-02T14:00:00Z",
  auth_linked: true,
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

describe("UsersIndex readability", () => {
  beforeEach(() => {
    permissionsState.allowed = true;
    shellProfileState.profileId = "operations";
    membersApiMock.listCompanyMembers.mockResolvedValue([
      ownerMember,
      adminMember,
      reviewerMember,
      appraiserMember,
      inactiveMember,
    ]);
    membersApiMock.listCompanyMemberPermissionOverrides.mockReset();
    membersApiMock.listCompanyMemberPermissionOverrides.mockResolvedValue([]);
    membersApiMock.saveCompanyMemberPermissionOverrides.mockReset();
    membersApiMock.saveCompanyMemberPermissionOverrides.mockResolvedValue({ changed: false, overrides: [] });
    membersApiMock.setCompanyMemberStatus.mockReset();
    membersApiMock.updateCompanyMemberRoles.mockReset();
    invitationsApiMock.cancelCompanyInvitation.mockReset();
    invitationsApiMock.listCompanyInvitations.mockReset();
    invitationsApiMock.listCompanyInvitations.mockResolvedValue([pendingInvitation]);
    invitationsApiMock.listCompanyRolePermissionPreview.mockResolvedValue([]);
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
    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByText(/Manage company users, roles, and invitations/)).toBeInTheDocument();
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
    expect(screen.getByText("Pending access")).toBeInTheDocument();
    expect(screen.getByText("Awaiting acceptance")).toBeInTheDocument();
    expect(screen.getByText("Invite sent. Access starts only after the recipient accepts.")).toBeInTheDocument();
    expect(screen.getByText("Admin (primary)")).toBeInTheDocument();
    expect(screen.getByText("Role presets apply after acceptance.")).toBeInTheDocument();
    expect(screen.getByText("Backend send recorded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send another invite email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders invite modal help text without sending or activating access", async () => {
    invitationsApiMock.listCompanyRolePresets.mockResolvedValue([
      {
        role_id: "role-admin",
        role_name: "Admin",
        description: "Can manage operational setup.",
        assignable_by_current_user: true,
      },
      {
        role_id: "role-reviewer",
        role_name: "Reviewer",
        description: "Can review orders.",
        assignable_by_current_user: true,
      },
    ]);

    renderUsersIndex();

    fireEvent.click(await screen.findByRole("button", { name: "Invite Member" }));

    const inviteDialog = await screen.findByRole("dialog", { name: "Invite Member" });
    expect(inviteDialog).toBeInTheDocument();
    expect(screen.getByText(/Access activates only after the recipient accepts/)).toBeInTheDocument();
    expect(screen.getByText("The invited person appears as pending until they accept.")).toBeInTheDocument();
    expect(screen.getByText(/backend permissions remain authoritative/i)).toBeInTheDocument();

    const adminRole = within(inviteDialog).getByText("Admin").closest("label");
    const reviewerRole = within(inviteDialog).getByText("Reviewer").closest("label");

    fireEvent.click(within(adminRole).getByRole("checkbox"));
    fireEvent.click(within(reviewerRole).getByRole("checkbox"));

    expect(await screen.findByText("Primary Role")).toBeInTheDocument();
    expect(screen.getByText("Primary role is the main role label shown after acceptance.")).toBeInTheDocument();
    expect(invitationsApiMock.sendCompanyInvitation).not.toHaveBeenCalled();
  });

  it("renders editable effective permissions in the access modal and updates as roles change", async () => {
    invitationsApiMock.listCompanyRolePresets.mockResolvedValue([
      {
        role_id: "role-admin",
        role_name: "Admin",
        description: "Can manage operational setup.",
        assignable_by_current_user: true,
      },
      {
        role_id: "role-reviewer",
        role_name: "Reviewer",
        description: "Can review orders.",
        assignable_by_current_user: true,
      },
    ]);
    invitationsApiMock.listCompanyRolePermissionPreview.mockResolvedValue([
      {
        role_id: "role-admin",
        role_name: "Admin",
        permission_key: "orders.read.all",
        permission_category: "orders",
        permission_label: "Read all orders",
        permission_description: "View all company orders.",
      },
      {
        role_id: "role-admin",
        role_name: "Admin",
        permission_key: "users.invite",
        permission_category: "users",
        permission_label: "Invite users",
        permission_description: "Invite users to the company.",
      },
      {
        role_id: "role-reviewer",
        role_name: "Reviewer",
        permission_key: "orders.assignable_as_reviewer",
        permission_category: "orders",
        permission_label: "Assignable as Reviewer",
        permission_description: "Can be selected as a reviewer.",
      },
      {
        role_id: "role-reviewer",
        role_name: "Reviewer",
        permission_key: "workflow.status.approve_review",
        permission_category: "workflow",
        permission_label: "Approve review",
        permission_description: "Approve reviewed work.",
      },
      {
        role_id: "role-admin",
        role_name: "Admin",
        permission_key: "assignments.read",
        permission_category: "assignments",
        permission_label: "Read assignments",
        permission_description: "Suppressed in V1.",
      },
    ]);

    renderUsersIndex();

    await screen.findByText("Active Team Members");
    const adminCard = memberArticle("Ari Admin");
    fireEvent.click(within(adminCard).getByRole("button", { name: "Edit roles" }));

    const accessDialog = await screen.findByRole("dialog", { name: "Edit Access" });
    expect(accessDialog).toBeInTheDocument();
    expect(screen.getByText(/inherited access plus explicit overrides/i)).toBeInTheDocument();
    expect(await within(accessDialog).findByText("Effective Permissions")).toBeInTheDocument();
    expect(screen.getByText(/role-derived access plus explicit V1-safe grants or revokes/i)).toBeInTheDocument();
    expect(within(accessDialog).getByText("Orders")).toBeInTheDocument();
    expect(within(accessDialog).getByText("Read all orders")).toBeInTheDocument();
    expect(within(accessDialog).getByText("Invite users")).toBeInTheDocument();
    expect(within(accessDialog).getAllByText("From Admin").length).toBeGreaterThan(0);
    expect(within(accessDialog).getAllByText("Inherited").length).toBeGreaterThan(0);
    expect(within(accessDialog).getAllByRole("button", { name: "Grant" }).length).toBeGreaterThan(0);
    expect(within(accessDialog).getAllByRole("button", { name: "Revoke" }).length).toBeGreaterThan(0);
    expect(within(accessDialog).queryByText("Read assignments")).toBeNull();

    const reviewerRole = within(accessDialog).getByText("Reviewer").closest("label");
    fireEvent.click(within(reviewerRole).getByRole("checkbox"));

    expect(await within(accessDialog).findByText("Review / Workflow")).toBeInTheDocument();
    expect(within(accessDialog).getByText("Work Eligibility")).toBeInTheDocument();
    expect(within(accessDialog).getByText("Assignable as Reviewer")).toBeInTheDocument();
    expect(within(accessDialog).getByText("Approve review")).toBeInTheDocument();
    expect(within(accessDialog).getAllByText("From Reviewer").length).toBeGreaterThan(0);
  });

  it("saves roles and explicit permission overrides from the access modal", async () => {
    invitationsApiMock.listCompanyRolePresets.mockResolvedValue([
      {
        role_id: "role-admin",
        role_name: "Admin",
        assignable_by_current_user: true,
      },
      {
        role_id: "role-reviewer",
        role_name: "Reviewer",
        assignable_by_current_user: true,
      },
    ]);
    invitationsApiMock.listCompanyRolePermissionPreview.mockResolvedValue([
      {
        role_id: "role-admin",
        role_name: "Admin",
        permission_key: "orders.read.all",
        permission_category: "orders",
        permission_label: "Read all orders",
      },
      {
        role_id: "role-admin",
        role_name: "Admin",
        permission_key: "clients.create",
        permission_category: "clients",
        permission_label: "Create clients",
      },
      {
        role_id: "role-reviewer",
        role_name: "Reviewer",
        permission_key: "workflow.status.approve_review",
        permission_category: "workflow",
        permission_label: "Approve review",
      },
    ]);
    membersApiMock.updateCompanyMemberRoles.mockResolvedValue({ changed: true });
    membersApiMock.saveCompanyMemberPermissionOverrides.mockResolvedValue({
      changed: true,
      overrides: [{ permission_key: "orders.read.all", effect: "revoke" }],
    });

    renderUsersIndex();

    await screen.findByText("Active Team Members");
    const adminCard = memberArticle("Ari Admin");
    fireEvent.click(within(adminCard).getByRole("button", { name: "Edit roles" }));

    const accessDialog = await screen.findByRole("dialog", { name: "Edit Access" });
    const reviewerRole = within(accessDialog).getByText("Reviewer").closest("label");
    fireEvent.click(within(reviewerRole).getByRole("checkbox"));
    fireEvent.click(within(reviewerRole).getByRole("radio"));
    const ordersPermission = within(accessDialog).getByText("Read all orders").closest("li");
    fireEvent.click(within(ordersPermission).getByRole("button", { name: "Revoke" }));
    fireEvent.click(within(accessDialog).getByRole("button", { name: "Save Access" }));

    await waitFor(() => {
      expect(membersApiMock.updateCompanyMemberRoles).toHaveBeenCalledWith(
        "user-admin",
        ["role-admin", "role-reviewer"],
        "role-reviewer",
        "Updated from Users",
        expect.any(String)
      );
    });
    expect(membersApiMock.saveCompanyMemberPermissionOverrides).toHaveBeenCalledWith(
      "user-admin",
      [{ permission_key: "orders.read.all", effect: "revoke" }],
      "Updated from Users",
      expect.any(String)
    );
    expect(toastMock.success).toHaveBeenCalledWith("Member access updated.");
  });

  it("lets owners grant missing V1-safe permissions without exposing hidden product domains", async () => {
    invitationsApiMock.listCompanyRolePresets.mockResolvedValue([
      {
        role_id: "role-admin",
        role_name: "Admin",
        assignable_by_current_user: true,
      },
    ]);
    invitationsApiMock.listCompanyRolePermissionPreview.mockResolvedValue([
      {
        role_id: "role-admin",
        role_name: "Admin",
        permission_key: "orders.read.all",
        permission_category: "orders",
        permission_label: "Read all orders",
      },
      {
        role_id: "role-reviewer",
        role_name: "Reviewer",
        permission_key: "orders.assignable_as_appraiser",
        permission_category: "orders",
        permission_label: "Assignable as Appraiser",
      },
      {
        role_id: "role-reviewer",
        role_name: "Reviewer",
        permission_key: "clients.create",
        permission_category: "clients",
        permission_label: "Create clients",
      },
      {
        role_id: "role-admin",
        role_name: "Admin",
        permission_key: "relationships.read",
        permission_category: "relationships",
        permission_label: "Read relationships",
      },
    ]);

    renderUsersIndex();

    await screen.findByText("Active Team Members");
    const adminCard = memberArticle("Ari Admin");
    fireEvent.click(within(adminCard).getByRole("button", { name: "Edit roles" }));

    const accessDialog = await screen.findByRole("dialog", { name: "Edit Access" });
    expect(within(accessDialog).getByText("Work Eligibility")).toBeInTheDocument();
    expect(within(accessDialog).getByText("Assignable as Appraiser")).toBeInTheDocument();
    expect(within(accessDialog).getByText("Create clients")).toBeInTheDocument();
    expect(within(accessDialog).queryByText("Read relationships")).toBeNull();

    const appraiserEligibilityPermission = within(accessDialog)
      .getByText("Assignable as Appraiser")
      .closest("li");
    expect(within(appraiserEligibilityPermission).getByText("Not granted")).toBeInTheDocument();
    fireEvent.click(within(appraiserEligibilityPermission).getByRole("button", { name: "Grant" }));
    expect(within(appraiserEligibilityPermission).getByText("Granted")).toBeInTheDocument();

    const createClientsPermission = within(accessDialog).getByText("Create clients").closest("li");
    expect(within(createClientsPermission).getByText("Not granted")).toBeInTheDocument();
    fireEvent.click(within(createClientsPermission).getByRole("button", { name: "Grant" }));

    expect(within(createClientsPermission).getByText("Granted")).toBeInTheDocument();

    fireEvent.click(within(accessDialog).getByRole("button", { name: "Save Access" }));

    await waitFor(() => {
      expect(membersApiMock.saveCompanyMemberPermissionOverrides).toHaveBeenCalledWith(
        "user-admin",
        [
          { permission_key: "clients.create", effect: "grant" },
          { permission_key: "orders.assignable_as_appraiser", effect: "grant" },
        ],
        "Updated from Users",
        expect.any(String)
      );
    });
  });

  it("loads existing override revokes and allows returning to inherited access", async () => {
    invitationsApiMock.listCompanyRolePresets.mockResolvedValue([
      {
        role_id: "role-admin",
        role_name: "Admin",
        assignable_by_current_user: true,
      },
    ]);
    invitationsApiMock.listCompanyRolePermissionPreview.mockResolvedValue([
      {
        role_id: "role-admin",
        role_name: "Admin",
        permission_key: "users.invite",
        permission_category: "users",
        permission_label: "Invite users",
      },
    ]);
    membersApiMock.listCompanyMemberPermissionOverrides.mockResolvedValue([
      {
        permission_key: "users.invite",
        effect: "revoke",
      },
    ]);

    renderUsersIndex();

    await screen.findByText("Active Team Members");
    const adminCard = memberArticle("Ari Admin");
    fireEvent.click(within(adminCard).getByRole("button", { name: "Edit roles" }));

    const accessDialog = await screen.findByRole("dialog", { name: "Edit Access" });
    const inviteUsersPermission = await within(accessDialog).findByText("Invite users");
    const permissionRow = inviteUsersPermission.closest("li");

    expect(within(permissionRow).getByText("Revoked")).toBeInTheDocument();
    fireEvent.click(within(permissionRow).getByRole("button", { name: "Inherit" }));
    expect(within(permissionRow).getByText("Inherited")).toBeInTheDocument();

    fireEvent.click(within(accessDialog).getByRole("button", { name: "Save Access" }));

    await waitFor(() => {
      expect(membersApiMock.saveCompanyMemberPermissionOverrides).toHaveBeenCalledWith(
        "user-admin",
        [],
        "Updated from Users",
        expect.any(String)
      );
    });
  });

  it("keeps owner-protected role presets locked in the access modal", async () => {
    invitationsApiMock.listCompanyRolePresets.mockResolvedValue([
      {
        role_id: "role-owner",
        role_name: "Owner",
        assignable_by_current_user: false,
      },
    ]);
    invitationsApiMock.listCompanyRolePermissionPreview.mockResolvedValue([]);

    renderUsersIndex();

    await screen.findByText("Active Team Members");
    const ownerCard = memberArticle("Olivia Owner");
    fireEvent.click(within(ownerCard).getByRole("button", { name: "Edit roles" }));

    const accessDialog = await screen.findByRole("dialog", { name: "Edit Access" });
    const ownerRole = within(accessDialog).getByText("Owner").closest("label");
    expect(within(ownerRole).getByRole("checkbox")).toBeDisabled();
    expect(within(ownerRole).getByText("This role is protected for your current permissions.")).toBeInTheDocument();
    expect(membersApiMock.updateCompanyMemberRoles).not.toHaveBeenCalled();
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

  it("renders appraiser Users page as a read-only staff directory", async () => {
    shellProfileState.profileId = "my_work";

    renderUsersIndex();

    await screen.findByRole("heading", { name: "Owner" });

    expect(screen.getByRole("heading", { name: "Staff Directory" })).toBeInTheDocument();
    expect(screen.getByText("Current company contacts.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Admin" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reviewers" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Appraisers" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Show inactive")).toBeNull();
    expect(screen.queryByText("Active Members")).toBeNull();
    expect(screen.queryByText("Members Shown")).toBeNull();
    expect(screen.queryByText("Access Model")).toBeNull();
    expect(screen.queryByText("Members")).toBeNull();
    expect(screen.queryByText("Membership")).toBeNull();
    expect(screen.queryByText("Access summary")).toBeNull();
    expect(screen.queryByText("Login linked")).toBeNull();
    expect(screen.queryByText("Joined")).toBeNull();
    expect(screen.queryByText(/Profile fields are read-only/)).toBeNull();
    expect(screen.queryByText("Pending Invitations")).toBeNull();
    expect(screen.queryByRole("button", { name: "Invite Member" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit roles" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Deactivate" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reactivate" })).toBeNull();
    expect(screen.getByText("Olivia Owner")).toBeInTheDocument();
    expect(screen.getByText("Ari Admin")).toBeInTheDocument();
    expect(screen.getByText("Riley Reviewer")).toBeInTheDocument();
    expect(screen.getByText("Alex Appraiser")).toBeInTheDocument();
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    expect(screen.getByText("ari@example.com")).toBeInTheDocument();
    expect(screen.getByText("riley@example.com")).toBeInTheDocument();
    expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    expect(screen.queryByText("Inactive Irene")).toBeNull();
    expect(invitationsApiMock.listCompanyInvitations).not.toHaveBeenCalled();
    expect(membersApiMock.setCompanyMemberStatus).not.toHaveBeenCalled();
    expect(membersApiMock.updateCompanyMemberRoles).not.toHaveBeenCalled();
  });
});
