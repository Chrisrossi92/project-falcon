import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, ShieldCheck, UserRoundCheck, UserRoundX, X } from "lucide-react";
import toast from "react-hot-toast";

import CompanyInvitationsPanel from "@/features/company-invitations/CompanyInvitationsPanel";
import InviteCompanyMemberModal from "@/features/company-invitations/InviteCompanyMemberModal";
import { listCompanyRolePresets } from "@/features/company-invitations/api";
import { listCompanyMembers, setCompanyMemberStatus, updateCompanyMemberRoles } from "@/features/company-members/api";
import { useCan } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";

const DEFAULT_COLOR = "#6B82A7";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getMemberColor(member) {
  return member?.display_color || DEFAULT_COLOR;
}

function getMemberName(member) {
  return member?.display_name || member?.full_name || member?.email || "Team member";
}

function statusLabel(status) {
  const labels = {
    active: "Active",
    inactive: "Inactive",
    invited: "Invited",
  };
  return labels[String(status || "").toLowerCase()] || status || "-";
}

function statusClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "invited") return "border-blue-200 bg-blue-50 text-blue-700";
  if (normalized === "inactive") return "border-slate-300 bg-slate-50 text-slate-600";
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function roleAssignments(member) {
  const roles = Array.isArray(member?.role_assignments) ? member.role_assignments : [];
  return roles.filter((role) => String(role?.status || "").toLowerCase() === "active");
}

function activeRoleIds(member) {
  return roleAssignments(member).map((role) => role.role_id).filter(Boolean);
}

function primaryRoleId(member) {
  return roleAssignments(member).find((role) => role.is_primary)?.role_id || activeRoleIds(member)[0] || "";
}

function roleLabels(member) {
  const roles = roleAssignments(member);
  if (!roles.length) return [{ name: "No active role", primary: false, owner: false, admin: false }];
  return roles.map((role) => ({
    name: role.role_name || "Role",
    primary: Boolean(role.is_primary),
    owner: Boolean(role.is_owner_role) || String(role.role_name || "").toLowerCase() === "owner",
    admin: String(role.role_name || "").toLowerCase() === "admin",
  }));
}

function memberAccessSummary(member) {
  const roles = roleAssignments(member);
  if (member?.is_owner || roles.some((role) => role.is_owner_role || String(role.role_name || "").toLowerCase() === "owner")) {
    return "Owner-protected access";
  }
  if (!roles.length) return "No active role assigned";
  return `${roles.length} active ${roles.length === 1 ? "role" : "roles"}`;
}

function safeMemberActionError(error, fallback) {
  const text = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  if (/company_owner_required|last owner|owner_required/.test(text)) {
    return "A company must keep at least one active Owner.";
  }
  if (/users_grant_owner_permission_required/.test(text)) {
    return "You do not have permission to grant Owner access.";
  }
  if (/users_revoke_owner_permission_required/.test(text)) {
    return "You do not have permission to remove Owner access.";
  }
  if (/role_preset_required|unknown_role_id|duplicate_role_ids|role_id_required|primary_role_not_in_submitted_roles/.test(text)) {
    return "Choose valid role presets.";
  }
  if (/permission|not authorized|forbidden|42501/.test(text)) {
    return "You do not have permission to update this member.";
  }
  return fallback;
}

function roleSortValue(role) {
  const name = String(role?.role_name || "").toLowerCase();
  if (name === "owner") return 1;
  if (name === "admin") return 2;
  if (name === "reviewer") return 3;
  if (name === "appraiser") return 4;
  if (name === "billing") return 5;
  return 99;
}

function EditRolePresetsModal({ member, open, onClose, onSaved }) {
  const [roles, setRoles] = useState([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [selectedPrimaryRoleId, setSelectedPrimaryRoleId] = useState("");
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !member) return;
    setSelectedRoleIds(activeRoleIds(member));
    setSelectedPrimaryRoleId(primaryRoleId(member));
    setError("");
    setLoadingRoles(true);
    listCompanyRolePresets()
      .then((rows) => setRoles(Array.isArray(rows) ? rows : []))
      .catch((loadError) => {
        console.debug("Role preset list failed", {
          code: loadError?.code,
          message: loadError?.message,
        });
        setRoles([]);
        setError("Falcon could not load role presets.");
      })
      .finally(() => setLoadingRoles(false));
  }, [member, open]);

  useEffect(() => {
    if (!selectedRoleIds.length) {
      setSelectedPrimaryRoleId("");
      return;
    }
    if (!selectedRoleIds.includes(selectedPrimaryRoleId)) {
      setSelectedPrimaryRoleId(selectedRoleIds[0]);
    }
  }, [selectedPrimaryRoleId, selectedRoleIds]);

  if (!open || !member) return null;

  const currentRoleIds = new Set(activeRoleIds(member));
  const visibleRoles = [...roles]
    .filter((role) => role.assignable_by_current_user || currentRoleIds.has(role.role_id))
    .sort((a, b) => roleSortValue(a) - roleSortValue(b) || String(a.role_name).localeCompare(String(b.role_name)));

  const toggleRole = (role) => {
    if (!role.assignable_by_current_user && !currentRoleIds.has(role.role_id)) return;
    setSelectedRoleIds((current) => {
      if (current.includes(role.role_id)) return current.filter((id) => id !== role.role_id);
      return [...current, role.role_id];
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!selectedRoleIds.length) {
      setError("Choose at least one role preset.");
      return;
    }
    if (!selectedPrimaryRoleId || !selectedRoleIds.includes(selectedPrimaryRoleId)) {
      setError("Choose a primary role.");
      return;
    }
    setSubmitting(true);
    try {
      await updateCompanyMemberRoles(
        member.user_id,
        selectedRoleIds,
        selectedPrimaryRoleId,
        "Updated from Team Access",
        crypto.randomUUID()
      );
      toast.success("Member roles updated.");
      onSaved?.();
      onClose?.();
    } catch (updateError) {
      console.debug("Company member role update failed", {
        code: updateError?.code,
        message: updateError?.message,
      });
      setError(safeMemberActionError(updateError, "Falcon could not update this member's roles."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose?.();
      }}
    >
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-role-presets-title"
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Team Access</div>
            <h2 id="edit-role-presets-title" className="mt-1 text-xl font-semibold text-slate-950">Edit Role Presets</h2>
            <p className="mt-1 text-sm text-slate-500">Roles are company-scoped presets. Owner changes are protected by backend policy.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            aria-label="Close role preset modal"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-5 px-5 py-5">
          {error && (
            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>{error}</div>
            </div>
          )}

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="font-medium text-slate-800">{getMemberName(member)}</div>
            <div className="mt-1 text-slate-500">{member.email || "-"}</div>
          </div>

          {loadingRoles ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">Loading role presets...</div>
          ) : visibleRoles.length === 0 ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">No role presets are available for this member.</div>
          ) : (
            <div className="grid gap-2">
              {visibleRoles.map((role) => {
                const selected = selectedRoleIds.includes(role.role_id);
                const locked = !role.assignable_by_current_user && currentRoleIds.has(role.role_id);
                return (
                  <label
                    key={role.role_id}
                    className={`grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-[auto_1fr_auto] ${selected ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selected}
                      onChange={() => toggleRole(role)}
                      disabled={submitting || locked}
                    />
                    <span>
                      <span className="block font-medium text-slate-800">{role.role_name}</span>
                      {role.description && <span className="mt-1 block text-xs text-slate-500">{role.description}</span>}
                      {locked && <span className="mt-1 block text-xs text-amber-700">This role is protected for your current permissions.</span>}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-slate-500">
                      <input
                        type="radio"
                        name="primary-role"
                        checked={selectedPrimaryRoleId === role.role_id}
                        onChange={() => setSelectedPrimaryRoleId(role.role_id)}
                        disabled={submitting || !selected}
                      />
                      Primary
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || loadingRoles}
            className="rounded-md border border-slate-950 bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save Roles"}
          </button>
        </div>
      </form>
    </div>
  );
}

function MemberCard({ member, busy, onEditRoles, onSetStatus }) {
  const name = getMemberName(member);
  const color = getMemberColor(member);
  const roles = roleLabels(member);
  const status = String(member.membership_status || "").toLowerCase();
  const hasOwnerAccess = member?.is_owner || roles.some((role) => role.owner);
  const hasAdminAccess = roles.some((role) => role.admin);

  return (
    <article className="flex min-h-72 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: color }}
          title={name}
        >
          {member.avatar_url ? (
            <img src={member.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            (name || "?").slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="truncate font-semibold text-slate-950">{name}</div>
            {hasOwnerAccess && (
              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                Owner
              </span>
            )}
            {!hasOwnerAccess && hasAdminAccess && (
              <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                Admin
              </span>
            )}
          </div>
          <div className="truncate text-xs text-slate-500">{member.email || "-"}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {roles.map((role) => (
              <span
                key={`${role.name}-${role.primary ? "primary" : "role"}`}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700"
              >
                {role.name}
                {role.primary && <span className="ml-1 text-slate-400">Primary</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Membership</span>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass(status)}`}>
            {statusLabel(status)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Access summary</span>
          <span className="text-right text-xs font-medium text-slate-700">{memberAccessSummary(member)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Login linked</span>
          <span className="font-medium text-slate-800">{member.auth_linked ? "Yes" : "No"}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Joined</span>
          <span className="font-medium text-slate-800">{formatDate(member.joined_at)}</span>
        </div>
        {member.phone && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Phone</span>
            <a className="font-medium text-slate-800 underline" href={`tel:${member.phone}`}>
              {member.phone}
            </a>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Profile fields are read-only here while team access is managed through company membership RPCs.
        </div>
        {(member.can_update_roles || member.can_deactivate || member.can_reactivate) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {member.can_update_roles && (
              <button
                type="button"
                onClick={() => onEditRoles(member)}
                disabled={busy}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Edit roles
              </button>
            )}
            {member.can_deactivate && (
              <button
                type="button"
                onClick={() => onSetStatus(member, "inactive")}
                disabled={busy}
                className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
              >
                Deactivate
              </button>
            )}
            {member.can_reactivate && (
              <button
                type="button"
                onClick={() => onSetStatus(member, "active")}
                disabled={busy}
                className="rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
              >
                Reactivate
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default function UsersIndex() {
  const canReadUsersPermission = useCan(PERMISSIONS.USERS_READ);
  const canInviteUsersPermission = useCan(PERMISSIONS.USERS_INVITE);
  const canManageCompanyAccessPermission = useCan(PERMISSIONS.USERS_MANAGE_COMPANY_ACCESS);
  const canAssignRolesPermission = useCan(PERMISSIONS.ROLES_ASSIGN);

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleEditorMember, setRoleEditorMember] = useState(null);
  const [busyMemberId, setBusyMemberId] = useState(null);
  const [invitationRefreshKey, setInvitationRefreshKey] = useState(0);

  const canListMembers = canReadUsersPermission.allowed;
  const canManageInvitations =
    canInviteUsersPermission.allowed && canManageCompanyAccessPermission.allowed;
  const canSendInvitations = canManageInvitations && canAssignRolesPermission.allowed;
  const canListInvitations = canReadUsersPermission.allowed || canManageInvitations;

  const activeCount = useMemo(
    () => members.filter((member) => String(member.membership_status || "").toLowerCase() === "active").length,
    [members]
  );
  const activeMembers = useMemo(
    () => members.filter((member) => String(member.membership_status || "").toLowerCase() === "active"),
    [members]
  );
  const inactiveOrInvitedMembers = useMemo(
    () => members.filter((member) => String(member.membership_status || "").toLowerCase() !== "active"),
    [members]
  );

  const load = useCallback(async () => {
    if (!canListMembers) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rows = await listCompanyMembers({ includeInactive: showInactive });
      setMembers(rows);
    } catch (loadError) {
      console.debug("Company member list failed", {
        code: loadError?.code,
        message: loadError?.message,
      });
      setMembers([]);
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [canListMembers, showInactive]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSetStatus = async (member, status) => {
    const isDeactivate = status === "inactive";
    const confirmed = window.confirm(
      isDeactivate
        ? "Deactivate this member? They will lose active company access."
        : "Reactivate this member? Their company access will become active again."
    );
    if (!confirmed) return;

    setBusyMemberId(member.user_id);
    try {
      await setCompanyMemberStatus(
        member.user_id,
        status,
        isDeactivate ? "Deactivated from Team Access" : "Reactivated from Team Access",
        crypto.randomUUID()
      );
      toast.success(isDeactivate ? "Member deactivated." : "Member reactivated.");
      await load();
    } catch (statusError) {
      console.debug("Company member status update failed", {
        code: statusError?.code,
        message: statusError?.message,
      });
      toast.error(safeMemberActionError(statusError, "Falcon could not update this member's status."));
    } finally {
      setBusyMemberId(null);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Team Access</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Manage company membership and invitations. New access starts with an invite; direct user creation is no longer available here.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="rounded border-slate-300"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
            />
            Show inactive
          </label>
          {canSendInvitations && (
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={() => setInviteOpen(true)}
            >
              <UserRoundCheck className="h-4 w-4" aria-hidden="true" />
              Invite Member
            </button>
          )}
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            onClick={load}
            disabled={loading || !canListMembers}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <UserRoundCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Active Members
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{activeCount}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <UserRoundX className="h-4 w-4 text-slate-500" aria-hidden="true" />
            Members Shown
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{members.length}</div>
          <p className="mt-1 text-xs text-slate-500">Inactive members appear only when enabled.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ShieldCheck className="h-4 w-4 text-blue-600" aria-hidden="true" />
            Access Model
          </div>
          <p className="mt-2 text-sm text-slate-500">Roles are company-scoped presets. Legacy profile role editing is disabled on this page.</p>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Members</h2>
          <p className="mt-1 text-sm text-slate-500">
            Current-company members only. Owner and role authority remains backend-governed.
          </p>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-sm text-slate-500">Loading members...</div>
        ) : error ? (
          <div className="px-4 py-6">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Falcon could not load company members.
            </div>
          </div>
        ) : members.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">
            No company members are visible for the current filter. Solo-owner setup is valid; use invitations when another person needs access.
          </div>
        ) : (
          <div className="space-y-5 p-4">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Active Team Members</h3>
                  <p className="mt-0.5 text-xs text-slate-500">People with active current-company membership.</p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  {activeMembers.length}
                </span>
              </div>
              {activeMembers.length === 0 ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                  No active team members are visible.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {activeMembers.map((member) => (
                    <MemberCard
                      key={member.membership_id || member.user_id}
                      member={member}
                      busy={busyMemberId === member.user_id}
                      onEditRoles={setRoleEditorMember}
                      onSetStatus={handleSetStatus}
                    />
                  ))}
                </div>
              )}
            </div>

            {showInactive && (
              <div>
                <div className="mb-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Inactive / Invited Members</h3>
                    <p className="mt-0.5 text-xs text-slate-500">These rows are separated from active access for clarity.</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {inactiveOrInvitedMembers.length}
                  </span>
                </div>
                {inactiveOrInvitedMembers.length === 0 ? (
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                    No inactive or invited member rows are visible.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {inactiveOrInvitedMembers.map((member) => (
                      <MemberCard
                        key={member.membership_id || member.user_id}
                        member={member}
                        busy={busyMemberId === member.user_id}
                        onEditRoles={setRoleEditorMember}
                        onSetStatus={handleSetStatus}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <CompanyInvitationsPanel
        canList={canListInvitations}
        canInvite={canSendInvitations}
        onOpenInvite={() => setInviteOpen(true)}
        refreshToken={invitationRefreshKey}
      />

      <InviteCompanyMemberModal
        open={canSendInvitations && inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={() => {
          setInviteOpen(false);
          toast.success("Company invitation sent.");
          setInvitationRefreshKey((key) => key + 1);
          load();
        }}
      />
      <EditRolePresetsModal
        open={Boolean(roleEditorMember)}
        member={roleEditorMember}
        onClose={() => setRoleEditorMember(null)}
        onSaved={load}
      />
    </div>
  );
}
