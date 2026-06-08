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

const operationsModeState = vi.hoisted(() => ({
  operationsMode: "internal_operations",
}));

const membersApiMock = vi.hoisted(() => ({
  listCompanyMemberPermissionOverrides: vi.fn(),
  listCompanyMembers: vi.fn(),
  saveCompanyMemberAccess: vi.fn(),
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

vi.mock("@/lib/operations/OperationsModeProvider", () => ({
  useOperationsMode: () => operationsModeState,
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

const amcOnlyMember = {
  user_id: "user-amc-only",
  membership_id: "membership-amc-only",
  display_name: "Morgan AMC",
  email: "morgan.amc@example.com",
  membership_status: "active",
  joined_at: "2026-05-02T15:00:00Z",
  auth_linked: true,
  is_owner: false,
  role_assignments: [
    {
      role_id: "role-amc-coordinator",
      role_name: "AMC Coordinator",
      is_owner_role: false,
      is_primary: true,
      status: "active",
    },
  ],
  can_update_roles: true,
  can_deactivate: true,
  can_reactivate: false,
};

const dualAccessMember = {
  user_id: "user-dual-access",
  membership_id: "membership-dual-access",
  display_name: "Drew Dual",
  email: "drew.dual@example.com",
  membership_status: "active",
  joined_at: "2026-05-02T16:00:00Z",
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

function expandAccessPermissionDetails(accessDialog) {
  fireEvent.click(within(accessDialog).getByText("Inspect permission details"));
}

describe("UsersIndex readability", () => {
  beforeEach(() => {
    permissionsState.allowed = true;
    shellProfileState.profileId = "operations";
    operationsModeState.operationsMode = "internal_operations";
    membersApiMock.listCompanyMembers.mockResolvedValue([
      ownerMember,
      adminMember,
      reviewerMember,
      appraiserMember,
      inactiveMember,
    ]);
    membersApiMock.listCompanyMemberPermissionOverrides.mockReset();
    membersApiMock.listCompanyMemberPermissionOverrides.mockResolvedValue([]);
    membersApiMock.saveCompanyMemberAccess.mockReset();
    membersApiMock.saveCompanyMemberAccess.mockResolvedValue({ role_changed: false, permission_overrides_changed: false });
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

  it("scopes Internal Users to internal-operation member access", async () => {
    operationsModeState.operationsMode = "internal_operations";
    membersApiMock.listCompanyMembers.mockImplementation(({ operationsScope }) => {
      expect(operationsScope).toBe("internal_operations");
      return Promise.resolve([
        appraiserMember,
        {
          ...dualAccessMember,
          role_assignments: [
            {
              role_id: "role-reviewer",
              role_name: "Reviewer",
              is_owner_role: false,
              is_primary: true,
              status: "active",
            },
          ],
        },
      ]);
    });

    renderUsersIndex();

    await screen.findByText("Active Team Members");
    expect(screen.getByText("Alex Appraiser")).toBeInTheDocument();
    expect(screen.getByText("Drew Dual")).toBeInTheDocument();
    expect(screen.queryByText("Morgan AMC")).not.toBeInTheDocument();
    expect(within(memberArticle("Drew Dual")).getByText("Reviewer")).toBeInTheDocument();
    expect(within(memberArticle("Drew Dual")).queryByText("AMC Coordinator")).not.toBeInTheDocument();
  });

  it("scopes AMC Users to AMC-operation member access", async () => {
    operationsModeState.operationsMode = "amc_operations";
    membersApiMock.listCompanyMembers.mockImplementation(({ operationsScope }) => {
      expect(operationsScope).toBe("amc_operations");
      return Promise.resolve([
        amcOnlyMember,
        {
          ...dualAccessMember,
          role_assignments: [
            {
              role_id: "role-amc-coordinator",
              role_name: "AMC Coordinator",
              is_owner_role: false,
              is_primary: true,
              status: "active",
            },
          ],
        },
      ]);
    });

    renderUsersIndex();

    await screen.findByText("Active Team Members");
    expect(screen.getByText("Morgan AMC")).toBeInTheDocument();
    expect(screen.getByText("Drew Dual")).toBeInTheDocument();
    expect(screen.queryByText("Alex Appraiser")).not.toBeInTheDocument();
    expect(within(memberArticle("Drew Dual")).getByText("AMC Coordinator")).toBeInTheDocument();
    expect(within(memberArticle("Drew Dual")).queryByText("Reviewer")).not.toBeInTheDocument();
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

  it("uses the Users member-card name priority without changing compact display-name surfaces", async () => {
    membersApiMock.listCompanyMembers.mockResolvedValue([
      {
        ...reviewerMember,
        user_id: "user-full-name",
        membership_id: "membership-full-name",
        full_name: "Michael Full Name",
        name: "Michael Name",
        display_name: "Mike Display",
        email: "michael@example.com",
      },
      {
        ...reviewerMember,
        user_id: "user-name",
        membership_id: "membership-name",
        display_name: "Pam Display",
        name: "Pam Name",
        email: "pam@example.com",
      },
      {
        ...reviewerMember,
        user_id: "user-email",
        membership_id: "membership-email",
        display_name: "",
        name: "",
        full_name: "",
        email: "fallback@example.com",
      },
    ]);

    renderUsersIndex();

    await screen.findByText("Active Team Members");
    expect(memberArticle("Michael Full Name")).not.toBeNull();
    expect(memberArticle("Pam Name")).not.toBeNull();
    expect(memberArticle("fallback@example.com")).not.toBeNull();
    expect(screen.queryByText("Mike Display")).not.toBeInTheDocument();
    expect(screen.queryByText("Pam Display")).not.toBeInTheDocument();
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
    expect(within(accessDialog).getByText("Granted")).toBeInTheDocument();
    expect(within(accessDialog).getByText("Categories")).toBeInTheDocument();
    expect(within(accessDialog).getByText("Overrides")).toBeInTheDocument();
    expect(within(accessDialog).getByText("Orders: 1/1")).toBeInTheDocument();
    expect(within(accessDialog).getByText("Users: 1/1")).toBeInTheDocument();
    expect(within(accessDialog).getByText("Inspect permission details")).toBeInTheDocument();
    expect(within(accessDialog).getByText("Read all orders")).not.toBeVisible();
    expect(within(accessDialog).getByText("Invite users")).not.toBeVisible();
    expandAccessPermissionDetails(accessDialog);
    expect(within(accessDialog).getByText("Orders")).toBeVisible();
    expect(within(accessDialog).getByText("Read all orders")).toBeVisible();
    expect(within(accessDialog).getByText("Invite users")).toBeVisible();
    expect(within(accessDialog).getAllByText("From Admin").length).toBeGreaterThan(0);
    expect(within(accessDialog).getAllByText("Inherited").length).toBeGreaterThan(0);
    expect(within(accessDialog).getAllByRole("button", { name: "Grant" }).length).toBeGreaterThan(0);
    expect(within(accessDialog).getAllByRole("button", { name: "Revoke" }).length).toBeGreaterThan(0);
    expect(within(accessDialog).queryByText("Read assignments")).toBeNull();

    const reviewerRole = within(accessDialog).getByText("Reviewer").closest("label");
    fireEvent.click(within(reviewerRole).getByRole("checkbox"));

    expect(await within(accessDialog).findByText("Review / Workflow")).toBeInTheDocument();
    expect(within(accessDialog).getByText("Work Eligibility")).toBeInTheDocument();
    expect(within(accessDialog).getByText("Assignable as Reviewer")).toBeVisible();
    expect(within(accessDialog).getByText("Approve review")).toBeVisible();
    expect(within(accessDialog).getAllByText("From Reviewer").length).toBeGreaterThan(0);
  });

  it("renders a read-only Permission Center scoped to the active operation", async () => {
    operationsModeState.operationsMode = "amc_operations";
    invitationsApiMock.listCompanyRolePermissionPreview.mockResolvedValue([
      {
        role_id: "role-admin",
        role_name: "Admin",
        permission_key: "orders.read.all",
        permission_category: "orders",
        permission_label: "Read all orders",
        permission_description: "View all orders in this operation.",
      },
      {
        role_id: "role-admin",
        role_name: "Admin",
        permission_key: "vendor_invoices.submit",
        permission_category: "vendor_invoices",
        permission_label: "Submit vendor invoices",
        permission_description: "Submit vendor invoices for AMC payment review.",
      },
    ]);
    membersApiMock.listCompanyMemberPermissionOverrides.mockResolvedValue([
      {
        permission_key: "vendor_invoices.submit",
        effect: "revoke",
      },
    ]);

    renderUsersIndex();

    await screen.findByText("Active Team Members");
    const adminCard = memberArticle("Ari Admin");
    fireEvent.click(within(adminCard).getByRole("button", { name: "Permission Center" }));

    const permissionDialog = await screen.findByRole("dialog", { name: "Ari Admin" });
    expect(permissionDialog).toBeInTheDocument();
    expect(within(permissionDialog).getByText("Permission Center")).toBeInTheDocument();
    expect(within(permissionDialog).getByText("Falcon AMC")).toBeInTheDocument();
    expect(within(permissionDialog).getByText(/scoped to the active operation\/company context/i)).toBeInTheDocument();
    expect(within(permissionDialog).getByText("Primary Role")).toBeInTheDocument();
    expect(within(permissionDialog).getByText("Admin")).toBeInTheDocument();
    expect(within(permissionDialog).getByRole("region", { name: "Access history" })).toBeInTheDocument();
    expect(within(permissionDialog).getByText(/Detailed permission history is planned/i)).toBeInTheDocument();
    expect(within(permissionDialog).getByText("Orders")).toBeInTheDocument();
    expect(within(permissionDialog).getByText("Payments")).toBeInTheDocument();
    const ordersGroup = within(permissionDialog).getByText("Orders").closest("details");
    expect(ordersGroup).not.toHaveAttribute("open");
    fireEvent.click(within(ordersGroup).getByText("Orders"));
    expect(ordersGroup).toHaveAttribute("open");
    expect(within(permissionDialog).getByText("Read all orders")).toBeInTheDocument();
    expect(within(permissionDialog).getByText("Submit vendor invoices")).toBeInTheDocument();
    expect(within(permissionDialog).getByText("Primary role")).toBeInTheDocument();
    expect(within(permissionDialog).getByText("Individual override")).toBeInTheDocument();
    expect(within(permissionDialog).getByText("Override")).toBeInTheDocument();
    expect(within(permissionDialog).queryByRole("button", { name: "Save Access" })).toBeNull();

    expect(membersApiMock.saveCompanyMemberAccess).not.toHaveBeenCalled();
    expect(membersApiMock.updateCompanyMemberRoles).not.toHaveBeenCalled();
    expect(membersApiMock.saveCompanyMemberPermissionOverrides).not.toHaveBeenCalled();
  });

  it("confirms and saves Permission Center changes through the atomic access path", async () => {
    operationsModeState.operationsMode = "amc_operations";
    let resolveSave;
    const savePromise = new Promise((resolve) => {
      resolveSave = resolve;
    });
    membersApiMock.saveCompanyMemberAccess.mockReturnValueOnce(savePromise);
    invitationsApiMock.listCompanyRolePresets.mockResolvedValue([
      {
        role_id: "role-admin",
        role_name: "Admin",
        assignable_by_current_user: true,
      },
      {
        role_id: "role-billing",
        role_name: "Billing/Admin",
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
        role_id: "role-billing",
        role_name: "Billing/Admin",
        permission_key: "vendor_invoices.submit",
        permission_category: "vendor_invoices",
        permission_label: "Submit vendor invoices",
      },
    ]);
    membersApiMock.listCompanyMemberPermissionOverrides.mockResolvedValue([]);

    renderUsersIndex();

    await screen.findByText("Active Team Members");
    const adminCard = memberArticle("Ari Admin");
    fireEvent.click(within(adminCard).getByRole("button", { name: "Permission Center" }));

    const permissionDialog = await screen.findByRole("dialog", { name: "Ari Admin" });
    fireEvent.click(within(permissionDialog).getByRole("button", { name: "Edit permissions" }));

    expect(within(permissionDialog).getByText("Choose an editing path")).toBeInTheDocument();
    expect(within(permissionDialog).getByText("Apply Secondary Role/Template")).toBeInTheDocument();
    expect(within(permissionDialog).getByRole("button", { name: "Review changes" })).toBeDisabled();
    fireEvent.click(within(permissionDialog).getByRole("checkbox", { name: /Billing\/Admin/i }));

    const invoiceRow = within(permissionDialog).getByText("Submit vendor invoices").closest("li");
    expect(within(invoiceRow).getAllByText("Pending change").length).toBeGreaterThan(0);
    expect(within(invoiceRow).getByText("Granted")).toBeInTheDocument();

    const orderRow = within(permissionDialog).getByText("Read all orders").closest("li");
    fireEvent.click(within(orderRow).getByRole("button", { name: "Remove" }));
    expect(within(orderRow).getAllByText("Pending change").length).toBeGreaterThan(0);
    expect(within(orderRow).getByText("Not granted")).toBeInTheDocument();

    fireEvent.click(within(permissionDialog).getByRole("button", { name: "Review changes" }));
    expect(within(permissionDialog).getByText("Review pending changes")).toBeInTheDocument();
    expect(within(permissionDialog).getByText("Added: Billing/Admin")).toBeInTheDocument();
    expect(within(permissionDialog).getAllByText("Submit vendor invoices").length).toBeGreaterThan(0);
    expect(within(permissionDialog).getAllByText("Read all orders").length).toBeGreaterThan(0);
    expect(within(permissionDialog).getAllByText("Payments").length).toBeGreaterThan(0);
    expect(within(permissionDialog).getAllByText("Orders").length).toBeGreaterThan(0);
    expect(within(permissionDialog).getByRole("button", { name: "Confirm changes" })).toBeEnabled();

    fireEvent.click(within(permissionDialog).getByRole("button", { name: "Confirm changes" }));
    const confirmDialog = await screen.findByRole("alertdialog", { name: "Confirm Permission Center changes" });
    expect(within(confirmDialog).getByText(/current operation\/company context/i)).toBeInTheDocument();
    expect(within(confirmDialog).getByText("Added: Billing/Admin")).toBeInTheDocument();
    expect(within(confirmDialog).getAllByText("Submit vendor invoices").length).toBeGreaterThan(0);
    expect(within(confirmDialog).getAllByText("Read all orders").length).toBeGreaterThan(0);
    const listCallsBeforeSave = membersApiMock.listCompanyMembers.mock.calls.length;

    const saveButton = within(confirmDialog).getByRole("button", { name: "Save Permission Center changes" });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);
    expect(membersApiMock.saveCompanyMemberAccess).toHaveBeenCalledTimes(1);
    expect(membersApiMock.saveCompanyMemberAccess).toHaveBeenCalledWith(
      "user-admin",
      ["role-admin", "role-billing"],
      "role-admin",
      [{ permission_key: "orders.read.all", effect: "revoke" }],
      expect.objectContaining({
        savePermissionOverrides: true,
        reason: "Updated from Permission Center",
        requestId: expect.any(String),
      }),
    );
    expect(membersApiMock.updateCompanyMemberRoles).not.toHaveBeenCalled();
    expect(membersApiMock.saveCompanyMemberPermissionOverrides).not.toHaveBeenCalled();

    resolveSave({});
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Permission Center changes saved."));
    await waitFor(() => expect(within(permissionDialog).getByRole("button", { name: "Edit permissions" })).toBeInTheDocument());
    expect(within(permissionDialog).queryByText("Review pending changes")).toBeNull();
    expect(membersApiMock.listCompanyMembers.mock.calls.length).toBeGreaterThan(listCallsBeforeSave);
  });

  it("shows a saved secondary Appraiser template after Permission Center reload", async () => {
    operationsModeState.operationsMode = "amc_operations";
    const adminWithAppraiser = {
      ...adminMember,
      role_assignments: [
        adminMember.role_assignments[0],
        {
          role_id: "role-appraiser",
          role_name: "Appraiser",
          is_owner_role: false,
          is_primary: false,
          status: "active",
        },
      ],
    };
    let memberLoadCount = 0;
    membersApiMock.listCompanyMembers.mockImplementation(() => {
      memberLoadCount += 1;
      return Promise.resolve(memberLoadCount === 1 ? [adminMember] : [adminWithAppraiser]);
    });
    invitationsApiMock.listCompanyRolePresets.mockResolvedValue([
      {
        role_id: "role-admin",
        role_name: "Admin",
        assignable_by_current_user: true,
      },
      {
        role_id: "role-appraiser",
        role_name: "Appraiser",
        assignable_by_current_user: true,
      },
    ]);
    invitationsApiMock.listCompanyRolePermissionPreview.mockResolvedValue([
      {
        role_id: "role-admin",
        role_name: "Admin",
        permission_key: "clients.create",
        permission_category: "clients",
        permission_label: "Create clients",
      },
      {
        role_id: "role-appraiser",
        role_name: "Appraiser",
        permission_key: "orders.assignable_as_appraiser",
        permission_category: "orders",
        permission_label: "Assignable as Appraiser",
      },
    ]);
    membersApiMock.listCompanyMemberPermissionOverrides.mockResolvedValue([]);

    renderUsersIndex();

    await screen.findByText("Active Team Members");
    const adminCard = memberArticle("Ari Admin");
    fireEvent.click(within(adminCard).getByRole("button", { name: "Permission Center" }));

    const permissionDialog = await screen.findByRole("dialog", { name: "Ari Admin" });
    expect(within(permissionDialog).getByText("None")).toBeInTheDocument();
    fireEvent.click(within(permissionDialog).getByRole("button", { name: "Edit permissions" }));

    const appraiserCheckbox = within(permissionDialog).getByRole("checkbox", { name: /Appraiser/i });
    expect(appraiserCheckbox).not.toBeChecked();
    fireEvent.click(appraiserCheckbox);
    fireEvent.click(within(permissionDialog).getByRole("button", { name: "Review changes" }));
    fireEvent.click(within(permissionDialog).getByRole("button", { name: "Confirm changes" }));
    const confirmDialog = await screen.findByRole("alertdialog", { name: "Confirm Permission Center changes" });
    fireEvent.click(within(confirmDialog).getByRole("button", { name: "Save Permission Center changes" }));

    await waitFor(() => {
      expect(membersApiMock.saveCompanyMemberAccess).toHaveBeenCalledWith(
        "user-admin",
        ["role-admin", "role-appraiser"],
        "role-admin",
        [],
        expect.objectContaining({
          savePermissionOverrides: true,
          reason: "Updated from Permission Center",
        }),
      );
    });
    await waitFor(() => expect(within(permissionDialog).getByText("Appraiser")).toBeInTheDocument());
    expect(within(permissionDialog).getByText("Additional role/template access currently assigned.")).toBeInTheDocument();

    fireEvent.click(within(permissionDialog).getByRole("button", { name: "Edit permissions" }));
    expect(within(permissionDialog).getByRole("checkbox", { name: /Appraiser/i })).toBeChecked();
  });

  it("preserves Permission Center draft changes when confirmed save fails", async () => {
    operationsModeState.operationsMode = "amc_operations";
    membersApiMock.saveCompanyMemberAccess.mockRejectedValueOnce({
      code: "500",
      message: "temporary failure",
    });
    invitationsApiMock.listCompanyRolePresets.mockResolvedValue([
      {
        role_id: "role-admin",
        role_name: "Admin",
        assignable_by_current_user: true,
      },
      {
        role_id: "role-billing",
        role_name: "Billing/Admin",
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
        role_id: "role-billing",
        role_name: "Billing/Admin",
        permission_key: "vendor_invoices.submit",
        permission_category: "vendor_invoices",
        permission_label: "Submit vendor invoices",
      },
    ]);

    renderUsersIndex();

    await screen.findByText("Active Team Members");
    const adminCard = memberArticle("Ari Admin");
    fireEvent.click(within(adminCard).getByRole("button", { name: "Permission Center" }));

    const permissionDialog = await screen.findByRole("dialog", { name: "Ari Admin" });
    fireEvent.click(within(permissionDialog).getByRole("button", { name: "Edit permissions" }));
    fireEvent.click(within(permissionDialog).getByRole("checkbox", { name: /Billing\/Admin/i }));
    fireEvent.click(within(permissionDialog).getByRole("button", { name: "Review changes" }));
    fireEvent.click(within(permissionDialog).getByRole("button", { name: "Confirm changes" }));

    const confirmDialog = await screen.findByRole("alertdialog", { name: "Confirm Permission Center changes" });
    const listCallsBeforeSave = membersApiMock.listCompanyMembers.mock.calls.length;
    fireEvent.click(within(confirmDialog).getByRole("button", { name: "Save Permission Center changes" }));

    await waitFor(() => {
      expect(within(permissionDialog).getByText("Falcon could not save these Permission Center changes.")).toBeInTheDocument();
    });
    expect(screen.queryByRole("alertdialog", { name: "Confirm Permission Center changes" })).toBeNull();
    expect(within(permissionDialog).getByText("Review pending changes")).toBeInTheDocument();
    expect(within(permissionDialog).getByText("Added: Billing/Admin")).toBeInTheDocument();
    expect(within(permissionDialog).getByRole("button", { name: "Back to edit" })).toBeEnabled();
    expect(membersApiMock.listCompanyMembers.mock.calls.length).toBe(listCallsBeforeSave);
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
    renderUsersIndex();

    await screen.findByText("Active Team Members");
    const adminCard = memberArticle("Ari Admin");
    fireEvent.click(within(adminCard).getByRole("button", { name: "Edit roles" }));

    const accessDialog = await screen.findByRole("dialog", { name: "Edit Access" });
    const reviewerRole = within(accessDialog).getByText("Reviewer").closest("label");
    fireEvent.click(within(reviewerRole).getByRole("checkbox"));
    fireEvent.click(within(reviewerRole).getByRole("radio"));
    expandAccessPermissionDetails(accessDialog);
    const ordersPermission = within(accessDialog).getByText("Read all orders").closest("li");
    fireEvent.click(within(ordersPermission).getByRole("button", { name: "Revoke" }));
    fireEvent.click(within(accessDialog).getByRole("button", { name: "Save Access" }));

    await waitFor(() => {
      expect(membersApiMock.saveCompanyMemberAccess).toHaveBeenCalledWith(
        "user-admin",
        ["role-admin", "role-reviewer"],
        "role-reviewer",
        [{ permission_key: "orders.read.all", effect: "revoke" }],
        {
          savePermissionOverrides: true,
          reason: "Updated from Users",
          requestId: expect.any(String),
        }
      );
    });
    expect(membersApiMock.updateCompanyMemberRoles).not.toHaveBeenCalled();
    expect(membersApiMock.saveCompanyMemberPermissionOverrides).not.toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith("Member access updated.");
  });

  it("skips the override RPC when saving role-only access changes", async () => {
    invitationsApiMock.listCompanyRolePresets.mockResolvedValue([
      {
        role_id: "role-reviewer",
        role_name: "Reviewer",
        assignable_by_current_user: true,
      },
      {
        role_id: "role-appraiser",
        role_name: "Appraiser",
        assignable_by_current_user: true,
      },
    ]);
    invitationsApiMock.listCompanyRolePermissionPreview.mockResolvedValue([
      {
        role_id: "role-reviewer",
        role_name: "Reviewer",
        permission_key: "orders.assignable_as_reviewer",
        permission_category: "orders",
        permission_label: "Assignable as Reviewer",
      },
      {
        role_id: "role-appraiser",
        role_name: "Appraiser",
        permission_key: "orders.assignable_as_appraiser",
        permission_category: "orders",
        permission_label: "Assignable as Appraiser",
      },
    ]);
    renderUsersIndex();

    await screen.findByText("Active Team Members");
    const reviewerCard = memberArticle("Riley Reviewer");
    fireEvent.click(within(reviewerCard).getByRole("button", { name: "Edit roles" }));

    const accessDialog = await screen.findByRole("dialog", { name: "Edit Access" });
    const appraiserRole = within(accessDialog).getByText("Appraiser").closest("label");
    fireEvent.click(within(appraiserRole).getByRole("checkbox"));
    fireEvent.click(within(accessDialog).getByRole("button", { name: "Save Access" }));

    await waitFor(() => {
      expect(membersApiMock.saveCompanyMemberAccess).toHaveBeenCalledWith(
        "user-reviewer",
        ["role-reviewer", "role-appraiser"],
        "role-reviewer",
        [],
        {
          savePermissionOverrides: false,
          reason: "Updated from Users",
          requestId: expect.any(String),
        }
      );
    });
    expect(membersApiMock.updateCompanyMemberRoles).not.toHaveBeenCalled();
    expect(membersApiMock.saveCompanyMemberPermissionOverrides).not.toHaveBeenCalled();
  });

  it("shows work eligibility as role-preset managed in V1", async () => {
    membersApiMock.listCompanyMembers.mockResolvedValue([
      ownerMember,
      {
        ...reviewerMember,
        role_assignments: [
          reviewerMember.role_assignments[0],
          {
            role_id: "role-appraiser",
            role_name: "Appraiser",
            is_owner_role: false,
            is_primary: false,
            status: "active",
          },
        ],
      },
    ]);
    invitationsApiMock.listCompanyRolePresets.mockResolvedValue([
      {
        role_id: "role-reviewer",
        role_name: "Reviewer",
        assignable_by_current_user: true,
      },
      {
        role_id: "role-appraiser",
        role_name: "Appraiser",
        assignable_by_current_user: true,
      },
    ]);
    invitationsApiMock.listCompanyRolePermissionPreview.mockResolvedValue([
      {
        role_id: "role-appraiser",
        role_name: "Appraiser",
        permission_key: "orders.assignable_as_appraiser",
        permission_category: "orders",
        permission_label: "Assignable as Appraiser",
      },
    ]);
    membersApiMock.listCompanyMemberPermissionOverrides.mockResolvedValue([
      {
        permission_key: "orders.assignable_as_appraiser",
        effect: "grant",
      },
    ]);

    renderUsersIndex();

    await screen.findByText("Active Team Members");
    const reviewerCard = memberArticle("Riley Reviewer");
    fireEvent.click(within(reviewerCard).getByRole("button", { name: "Edit roles" }));

    const accessDialog = await screen.findByRole("dialog", { name: "Edit Access" });
    expandAccessPermissionDetails(accessDialog);
    const appraiserEligibilityPermission = within(accessDialog)
      .getByText("Assignable as Appraiser")
      .closest("li");

    expect(within(appraiserEligibilityPermission).getByText("Inherited")).toBeInTheDocument();
    expect(within(appraiserEligibilityPermission).queryByText("Granted")).toBeNull();
    expect(within(accessDialog).getByText("Work eligibility is managed through Appraiser/Reviewer role presets in V1.")).toBeInTheDocument();
    expect(within(appraiserEligibilityPermission).getByText("Role preset managed")).toBeInTheDocument();
    expect(within(appraiserEligibilityPermission).queryByRole("button", { name: "Grant" })).toBeNull();
    expect(within(appraiserEligibilityPermission).queryByRole("button", { name: "Revoke" })).toBeNull();

    fireEvent.click(within(accessDialog).getByRole("button", { name: "Save Access" }));

    await waitFor(() => {
      expect(membersApiMock.saveCompanyMemberAccess).toHaveBeenCalled();
    });
    expect(membersApiMock.updateCompanyMemberRoles).not.toHaveBeenCalled();
    expect(membersApiMock.saveCompanyMemberPermissionOverrides).not.toHaveBeenCalled();
  });

  it("lets owners grant missing V1-safe permissions while leaving work eligibility read-only", async () => {
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
    membersApiMock.listCompanyMemberPermissionOverrides.mockResolvedValue([
      {
        permission_key: "relationships.read",
        permission_category: "relationships",
        effect: "revoke",
      },
      {
        permission_key: "orders.assignable_as_appraiser",
        permission_category: "orders",
        effect: "grant",
      },
    ]);

    renderUsersIndex();

    await screen.findByText("Active Team Members");
    const adminCard = memberArticle("Ari Admin");
    fireEvent.click(within(adminCard).getByRole("button", { name: "Edit roles" }));

    const accessDialog = await screen.findByRole("dialog", { name: "Edit Access" });
    expandAccessPermissionDetails(accessDialog);
    expect(within(accessDialog).getByText("Work Eligibility")).toBeInTheDocument();
    expect(within(accessDialog).getByText("Assignable as Appraiser")).toBeInTheDocument();
    expect(within(accessDialog).getByText("Create clients")).toBeInTheDocument();
    expect(within(accessDialog).queryByText("Read relationships")).toBeNull();

    const appraiserEligibilityPermission = within(accessDialog)
      .getByText("Assignable as Appraiser")
      .closest("li");
    expect(within(appraiserEligibilityPermission).getByText("Not granted")).toBeInTheDocument();
    expect(within(appraiserEligibilityPermission).getByText("Role preset managed")).toBeInTheDocument();
    expect(within(appraiserEligibilityPermission).queryByRole("button", { name: "Grant" })).toBeNull();

    const createClientsPermission = within(accessDialog).getByText("Create clients").closest("li");
    expect(within(createClientsPermission).getByText("Not granted")).toBeInTheDocument();
    fireEvent.click(within(createClientsPermission).getByRole("button", { name: "Grant" }));

    expect(within(createClientsPermission).getByText("Granted")).toBeInTheDocument();

    fireEvent.click(within(accessDialog).getByRole("button", { name: "Save Access" }));

    await waitFor(() => {
      expect(membersApiMock.saveCompanyMemberAccess).toHaveBeenCalledWith(
        "user-admin",
        ["role-admin"],
        "role-admin",
        [{ permission_key: "clients.create", effect: "grant" }],
        {
          savePermissionOverrides: true,
          reason: "Updated from Users",
          requestId: expect.any(String),
        }
      );
    });
    expect(membersApiMock.updateCompanyMemberRoles).not.toHaveBeenCalled();
    expect(membersApiMock.saveCompanyMemberPermissionOverrides).not.toHaveBeenCalled();
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
    expandAccessPermissionDetails(accessDialog);
    const inviteUsersPermission = await within(accessDialog).findByText("Invite users");
    const permissionRow = inviteUsersPermission.closest("li");

    expect(within(permissionRow).getByText("Revoked")).toBeInTheDocument();
    fireEvent.click(within(permissionRow).getByRole("button", { name: "Inherit" }));
    expect(within(permissionRow).getByText("Inherited")).toBeInTheDocument();

    fireEvent.click(within(accessDialog).getByRole("button", { name: "Save Access" }));

    await waitFor(() => {
      expect(membersApiMock.saveCompanyMemberAccess).toHaveBeenCalledWith(
        "user-admin",
        ["role-admin"],
        "role-admin",
        [],
        {
          savePermissionOverrides: true,
          reason: "Updated from Users",
          requestId: expect.any(String),
        }
      );
    });
    expect(membersApiMock.updateCompanyMemberRoles).not.toHaveBeenCalled();
    expect(membersApiMock.saveCompanyMemberPermissionOverrides).not.toHaveBeenCalled();
  });

  it("uses the atomic access save path for failures so roles are not persisted separately", async () => {
    invitationsApiMock.listCompanyRolePresets.mockResolvedValue([
      {
        role_id: "role-reviewer",
        role_name: "Reviewer",
        assignable_by_current_user: true,
      },
      {
        role_id: "role-appraiser",
        role_name: "Appraiser",
        assignable_by_current_user: true,
      },
    ]);
    invitationsApiMock.listCompanyRolePermissionPreview.mockResolvedValue([]);
    membersApiMock.saveCompanyMemberAccess.mockRejectedValueOnce({
      code: "42501",
      message: "roles_manage_permissions_required",
    });

    renderUsersIndex();

    await screen.findByText("Active Team Members");
    const reviewerCard = memberArticle("Riley Reviewer");
    fireEvent.click(within(reviewerCard).getByRole("button", { name: "Edit roles" }));

    const accessDialog = await screen.findByRole("dialog", { name: "Edit Access" });
    const appraiserRole = within(accessDialog).getByText("Appraiser").closest("label");
    fireEvent.click(within(appraiserRole).getByRole("checkbox"));
    fireEvent.click(within(accessDialog).getByRole("button", { name: "Save Access" }));

    expect(await within(accessDialog).findByText("You do not have permission to update this member.")).toBeInTheDocument();
    expect(membersApiMock.saveCompanyMemberAccess).toHaveBeenCalledWith(
      "user-reviewer",
      ["role-reviewer", "role-appraiser"],
      "role-reviewer",
      [],
      {
        savePermissionOverrides: false,
        reason: "Updated from Users",
        requestId: expect.any(String),
      }
    );
    expect(membersApiMock.updateCompanyMemberRoles).not.toHaveBeenCalled();
    expect(membersApiMock.saveCompanyMemberPermissionOverrides).not.toHaveBeenCalled();
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
    expect(membersApiMock.saveCompanyMemberAccess).not.toHaveBeenCalled();
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
    expect(membersApiMock.saveCompanyMemberAccess).not.toHaveBeenCalled();
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
    expect(membersApiMock.saveCompanyMemberAccess).not.toHaveBeenCalled();
  });
});
