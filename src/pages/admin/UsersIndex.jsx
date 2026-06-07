import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, ShieldCheck, UserRoundCheck, UserRoundX, X } from "lucide-react";
import toast from "react-hot-toast";

import CompanyInvitationsPanel from "@/features/company-invitations/CompanyInvitationsPanel";
import InviteCompanyMemberModal from "@/features/company-invitations/InviteCompanyMemberModal";
import { listCompanyRolePermissionPreview, listCompanyRolePresets } from "@/features/company-invitations/api";
import {
  V1_SUPPRESSED_PERMISSION_CATEGORIES,
  isWorkEligibilityPermissionKey,
  normalizeEffectiveOverrideMap,
  normalizeOverrideRows,
  serializeOverrideMap,
  serializedOverrideSignature,
} from "@/features/company-members/permissionOverrideVisibility";
import {
  listCompanyMemberPermissionOverrides,
  listCompanyMembers,
  saveCompanyMemberAccess,
  setCompanyMemberStatus,
} from "@/features/company-members/api";
import {
  buildPermissionCenterModel,
  buildPermissionCenterReview,
} from "@/features/company-members/permissionCenterModel";
import { useCan } from "@/lib/hooks/usePermissions";
import { useOperationsMode } from "@/lib/operations/OperationsModeProvider";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { useShellProfile } from "@/lib/shell/useShellProfile";
import { SHELL_PROFILE_IDS } from "@/lib/shell/resolveShellProfile";

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
  return member?.full_name || member?.name || member?.display_name || member?.email || "Team member";
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

function memberRoleNames(member) {
  return roleLabels(member)
    .map((role) => role.name)
    .filter(Boolean);
}

function memberDirectoryGroupId(member) {
  const roleNames = memberRoleNames(member).map((role) => role.toLowerCase());

  if (member?.is_owner || roleNames.some((role) => role.includes("owner"))) return "owner";
  if (roleNames.some((role) => role.includes("admin"))) return "admin";
  if (roleNames.some((role) => role.includes("reviewer"))) return "reviewer";
  if (roleNames.some((role) => role.includes("appraiser"))) return "appraiser";
  return "other";
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
  if (/owner_self_protection_override_blocked/.test(text)) {
    return "Owner self-protection permissions cannot be revoked from your own access.";
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

const V1_SUPPRESSED_PERMISSION_CATEGORY_SET = new Set(V1_SUPPRESSED_PERMISSION_CATEGORIES);

const PERMISSION_GROUP_LABELS = Object.freeze({
  work_eligibility: "Work Eligibility",
  orders: "Orders",
  clients: "Clients",
  users: "Users",
  roles: "Roles",
  workflow: "Review / Workflow",
  billing: "Billing",
  settings: "Settings",
});

const PERMISSION_GROUP_ORDER = Object.freeze([
  "work_eligibility",
  "orders",
  "clients",
  "users",
  "roles",
  "workflow",
  "billing",
  "settings",
  "other",
]);

function permissionGroupId(permission) {
  const key = String(permission?.permission_key || "").trim();
  if (isWorkEligibilityPermissionKey(key)) return "work_eligibility";
  const category = String(permission?.permission_category || "").toLowerCase();
  if (V1_SUPPRESSED_PERMISSION_CATEGORY_SET.has(category)) return null;
  if (PERMISSION_GROUP_LABELS[category]) return category;
  return "other";
}

function buildEffectivePermissionPreview(selectedRoleIds, permissions, overrides = new Map()) {
  const selected = new Set(selectedRoleIds);
  const byPermission = new Map();

  (Array.isArray(permissions) ? permissions : []).forEach((permission) => {
    const groupId = permissionGroupId(permission);
    if (!groupId) return;

    const key = permission.permission_key || `${permission.permission_category}:${permission.permission_label}`;
    const existing = byPermission.get(key) || {
      key,
      label: permission.permission_label || "Permission",
      description: permission.permission_description || "",
      groupId,
      sourceRoles: [],
      inherited: false,
    };

    if (selected.has(permission.role_id)) {
      existing.inherited = true;
    }

    if (selected.has(permission.role_id) && permission.role_name && !existing.sourceRoles.includes(permission.role_name)) {
      existing.sourceRoles.push(permission.role_name);
    }

    existing.override = overrides.get(key) || null;
    existing.effective = existing.override === "grant" || (existing.inherited && existing.override !== "revoke");
    existing.readOnly = isWorkEligibilityPermissionKey(key);

    byPermission.set(key, existing);
  });

  const groups = new Map();
  [...byPermission.values()]
    .sort((a, b) => a.label.localeCompare(b.label))
    .forEach((permission) => {
      const group = groups.get(permission.groupId) || [];
      group.push(permission);
      groups.set(permission.groupId, group);
    });

  return PERMISSION_GROUP_ORDER
    .filter((groupId) => groups.has(groupId))
    .map((groupId) => ({
      id: groupId,
      label: PERMISSION_GROUP_LABELS[groupId] || "Other",
      permissions: groups.get(groupId),
    }));
}

function EditRolePresetsModal({ member, open, onClose, onSaved }) {
  const [roles, setRoles] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [permissionOverrides, setPermissionOverrides] = useState(new Map());
  const [initialOverrideSignature, setInitialOverrideSignature] = useState("[]");
  const [overridesTouched, setOverridesTouched] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [selectedPrimaryRoleId, setSelectedPrimaryRoleId] = useState("");
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !member) return;
    setSelectedRoleIds(activeRoleIds(member));
    setSelectedPrimaryRoleId(primaryRoleId(member));
    setPermissionOverrides(new Map());
    setInitialOverrideSignature("[]");
    setOverridesTouched(false);
    setError("");
    setLoadingRoles(true);
    Promise.all([
      listCompanyRolePresets(),
      listCompanyRolePermissionPreview(),
      listCompanyMemberPermissionOverrides(member.user_id),
    ])
      .then(([roleRows, permissionRows, overrideRows]) => {
        const activeIds = activeRoleIds(member);
        const normalizedOverrides = normalizeEffectiveOverrideMap(
          normalizeOverrideRows(overrideRows, permissionRows),
          activeIds,
          permissionRows
        );
        setRoles(Array.isArray(roleRows) ? roleRows : []);
        setRolePermissions(Array.isArray(permissionRows) ? permissionRows : []);
        setPermissionOverrides(normalizedOverrides);
        setInitialOverrideSignature(serializedOverrideSignature(serializeOverrideMap(normalizedOverrides, activeIds, permissionRows)));
      })
      .catch((loadError) => {
        console.debug("Access detail list failed", {
          code: loadError?.code,
          message: loadError?.message,
        });
        setRoles([]);
        setRolePermissions([]);
        setPermissionOverrides(new Map());
        setError("Falcon could not load access details.");
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
  const effectivePermissionOverrides = normalizeEffectiveOverrideMap(permissionOverrides, selectedRoleIds, rolePermissions);
  const permissionPreviewGroups = buildEffectivePermissionPreview(selectedRoleIds, rolePermissions, effectivePermissionOverrides);

  const toggleRole = (role) => {
    if (!role.assignable_by_current_user && !currentRoleIds.has(role.role_id)) return;
    setSelectedRoleIds((current) => {
      if (current.includes(role.role_id)) return current.filter((id) => id !== role.role_id);
      return [...current, role.role_id];
    });
  };

  const setPermissionOverride = (permissionKey, effect) => {
    setPermissionOverrides((current) => {
      const next = new Map(current);
      if (effect === "grant" || effect === "revoke") {
        next.set(permissionKey, effect);
      } else {
        next.delete(permissionKey);
      }
      return next;
    });
    setOverridesTouched(true);
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
      const requestId = crypto.randomUUID();
      const overridePayload = serializeOverrideMap(permissionOverrides, selectedRoleIds, rolePermissions);
      const shouldSaveOverrides =
        overridesTouched && serializedOverrideSignature(overridePayload) !== initialOverrideSignature;
      await saveCompanyMemberAccess(
        member.user_id,
        selectedRoleIds,
        selectedPrimaryRoleId,
        overridePayload,
        {
          savePermissionOverrides: shouldSaveOverrides,
          reason: "Updated from Users",
          requestId,
        }
      );
      toast.success("Member access updated.");
      onSaved?.();
      onClose?.();
    } catch (updateError) {
      console.debug("Company member role update failed", {
        code: updateError?.code,
        message: updateError?.message,
      });
      setError(safeMemberActionError(updateError, "Falcon could not update this member's access."));
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
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Users</div>
            <h2 id="edit-role-presets-title" className="mt-1 text-xl font-semibold text-slate-950">Edit Access</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose role presets and one primary role. Permissions below show inherited access plus explicit overrides.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            aria-label="Close access modal"
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

          <section aria-labelledby="effective-permissions-title" className="rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-3 py-3">
              <h3 id="effective-permissions-title" className="text-sm font-semibold text-slate-800">Effective Permissions</h3>
              <p className="mt-1 text-xs text-slate-500">
                Role-derived access plus explicit V1-safe grants or revokes. Hidden product domains stay suppressed.
              </p>
              {permissionPreviewGroups.some((group) => group.id === "work_eligibility") && (
                <p className="mt-1 text-xs text-slate-500">
                  Work eligibility is managed through Appraiser/Reviewer role presets in V1.
                </p>
              )}
            </div>
            {loadingRoles ? (
              <div className="px-3 py-4 text-sm text-slate-500">Loading permission preview...</div>
            ) : selectedRoleIds.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-500">Choose role presets to preview access.</div>
            ) : permissionPreviewGroups.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-500">
                No V1 staff-appraisal permissions are visible for the selected roles.
              </div>
            ) : (
              <div className="grid gap-3 p-3">
                {permissionPreviewGroups.map((group) => (
                  <div key={group.id}>
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{group.label}</div>
                    <ul className="mt-2 grid gap-2">
                      {group.permissions.map((permission) => (
                        <li key={permission.key} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 sm:grid-cols-[1fr_auto]">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-slate-800">{permission.label}</span>
                              {permission.override === "grant" && (
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                  Granted
                                </span>
                              )}
                              {permission.override === "revoke" && (
                                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                                  Revoked
                                </span>
                              )}
                              {!permission.override && permission.inherited && (
                                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                                  Inherited
                                </span>
                              )}
                              {!permission.effective && !permission.override && (
                                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                                  Not granted
                                </span>
                              )}
                            </div>
                            {permission.sourceRoles.length > 0 && (
                              <div className="mt-1 text-xs text-slate-500">
                                From {permission.sourceRoles.join(", ")}
                              </div>
                            )}
                          </div>
                          {permission.readOnly ? (
                            <div className="text-xs font-medium text-slate-500">Role preset managed</div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setPermissionOverride(permission.key, null)}
                                disabled={submitting || !permission.override}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                              >
                                Inherit
                              </button>
                              <button
                                type="button"
                                onClick={() => setPermissionOverride(permission.key, "grant")}
                                disabled={submitting || permission.override === "grant"}
                                className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                              >
                                Grant
                              </button>
                              <button
                                type="button"
                                onClick={() => setPermissionOverride(permission.key, "revoke")}
                                disabled={submitting || permission.override === "revoke"}
                                className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                              >
                                Revoke
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
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
            {submitting ? "Saving..." : "Save Access"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PermissionCenterDialog({ member, open, operationsMode, onClose }) {
  const [rolePermissions, setRolePermissions] = useState([]);
  const [permissionOverrides, setPermissionOverrides] = useState([]);
  const [rolePresets, setRolePresets] = useState([]);
  const [mode, setMode] = useState("view");
  const [draftRoleIds, setDraftRoleIds] = useState([]);
  const [draftOverrideRows, setDraftOverrideRows] = useState([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !member) return;

    setLoadingAccess(true);
    setError("");
    setMode("view");
    setDraftRoleIds([]);
    setDraftOverrideRows([]);
    Promise.all([
      listCompanyRolePermissionPreview(),
      listCompanyMemberPermissionOverrides(member.user_id),
      listCompanyRolePresets(),
    ])
      .then(([permissionRows, overrideRows, presetRows]) => {
        setRolePermissions(Array.isArray(permissionRows) ? permissionRows : []);
        setPermissionOverrides(Array.isArray(overrideRows) ? overrideRows : []);
        setRolePresets(Array.isArray(presetRows) ? presetRows : []);
      })
      .catch((loadError) => {
        console.debug("Permission Center detail load failed", {
          code: loadError?.code,
          message: loadError?.message,
        });
        setRolePermissions([]);
        setPermissionOverrides([]);
        setRolePresets([]);
        setError("Falcon could not load this member's permission detail.");
      })
      .finally(() => setLoadingAccess(false));
  }, [member, open]);

  if (!open || !member) return null;

  const originalModel = buildPermissionCenterModel({
    member,
    rolePermissions,
    overrideRows: permissionOverrides,
    operationsMode,
  });
  const draftModel = buildPermissionCenterModel({
    member,
    rolePermissions,
    overrideRows: permissionOverrides,
    draftRoleIds,
    draftOverrideRows,
    operationsMode,
  });
  const model = mode === "view" ? originalModel : draftModel;
  const review = buildPermissionCenterReview(originalModel, draftModel);
  const primaryRoleId = originalModel.primaryRole?.role_id || "";
  const roleTemplateMap = new Map();

  rolePresets.forEach((role) => {
    if (role?.role_id) roleTemplateMap.set(role.role_id, role);
  });
  rolePermissions.forEach((permission) => {
    if (!permission.role_id || roleTemplateMap.has(permission.role_id)) return;
    roleTemplateMap.set(permission.role_id, {
      role_id: permission.role_id,
      role_name: permission.role_name || "Role template",
      display_name: permission.role_name || "Role template",
    });
  });
  const roleTemplates = [...roleTemplateMap.values()]
    .filter((role) => role.role_id && role.role_id !== primaryRoleId)
    .sort((a, b) => String(a.role_name || a.display_name).localeCompare(String(b.role_name || b.display_name)));
  const permissionKeysByRole = rolePermissions.reduce((acc, permission) => {
    if (!permission.role_id || !permission.permission_key) return acc;
    const keys = acc.get(permission.role_id) || [];
    keys.push(permission.permission_key);
    acc.set(permission.role_id, keys);
    return acc;
  }, new Map());
  const hasDraftChanges = review.hasChanges || draftOverrideRows.some((row) => row.pending);

  const beginEdit = () => {
    setDraftRoleIds(originalModel.selectedRoleIds);
    setDraftOverrideRows(
      permissionOverrides
        .filter((row) => row?.permission_key && (row.effect === "grant" || row.effect === "revoke"))
        .map((row) => ({ permission_key: row.permission_key, effect: row.effect, pending: false })),
    );
    setMode("edit");
  };
  const cancelDraft = () => {
    setMode("view");
    setDraftRoleIds([]);
    setDraftOverrideRows([]);
  };
  const toggleRoleTemplate = (roleId) => {
    setDraftRoleIds((currentRoleIds) => {
      const selected = currentRoleIds.includes(roleId);
      return selected ? currentRoleIds.filter((id) => id !== roleId) : [...currentRoleIds, roleId];
    });
    const templatePermissionKeys = new Set(permissionKeysByRole.get(roleId) || []);
    setDraftOverrideRows((currentRows) =>
      currentRows.filter((row) => !(templatePermissionKeys.has(row.permission_key) && row.pending && row.effect === "grant")),
    );
  };
  const setPermissionDraft = (permission) => {
    const nextEffective = !permission.effective;
    const nextEffect = nextEffective ? "grant" : "revoke";
    setDraftOverrideRows((currentRows) => {
      const withoutPermission = currentRows.filter((row) => row.permission_key !== permission.key);
      if (nextEffective === permission.inherited) return withoutPermission;
      return [...withoutPermission, { permission_key: permission.key, effect: nextEffect, pending: true }];
    });
  };
  const renderPermissionGroups = ({ editable = false } = {}) => {
    if (loadingAccess) {
      return <div className="px-4 py-6 text-sm text-slate-500">Loading Permission Center...</div>;
    }
    if (model.categories.length === 0) {
      return (
        <div className="px-4 py-6 text-sm text-slate-500">
          No permissions are visible for this member in the current operation context.
        </div>
      );
    }

    return (
      <div className="divide-y divide-slate-200">
        {model.categories.map((category) => (
          <details key={category.id} className="group" open={category.effectiveCount > 0 || editable}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
              <span>
                <span className="block text-sm font-semibold text-slate-900">{category.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {category.effectiveCount} effective of {category.permissions.length}
                  {category.overrideCount ? ` - ${category.overrideCount} overrides` : ""}
                </span>
              </span>
              <span className="text-xs font-semibold text-slate-400 group-open:hidden">Expand</span>
              <span className="hidden text-xs font-semibold text-slate-400 group-open:inline">Collapse</span>
            </summary>
            <ul className="grid gap-2 bg-slate-50/70 px-4 pb-4">
              {category.permissions.map((permission) => (
                <li
                  key={permission.key}
                  className="grid gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{permission.label}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          permission.effective
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {permission.effective ? "Granted" : "Not granted"}
                      </span>
                      {permission.override && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          Override
                        </span>
                      )}
                      {permission.pending && (
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          Pending change
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{permission.description}</p>
                    {permission.sourceRoles.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">Roles: {permission.sourceRoles.join(", ")}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-xs font-semibold text-slate-500">{permission.sourceLabel}</div>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => setPermissionDraft(permission)}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {permission.effective ? "Remove" : "Add"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="permission-center-title"
        className="w-full max-w-4xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Permission Center</div>
            <h2 id="permission-center-title" className="mt-1 text-xl font-semibold text-slate-950">
              {getMemberName(member)}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {mode === "view"
                ? `Read-only access summary for ${model.operationLabel}. Edit drafts stay local in this slice.`
                : `Drafting local access changes for ${model.operationLabel}. Backend save is not wired yet.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            aria-label="Close Permission Center"
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

          <section className="grid gap-3 md:grid-cols-3" aria-label="Permission access summary">
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Active Operation</div>
              <div className="mt-2 text-sm font-semibold text-slate-950">{model.operationLabel}</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">{model.operationDescription}</p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Primary Role</div>
              <div className="mt-2 text-sm font-semibold text-slate-950">
                {model.primaryRole?.role_name || "No primary role"}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">Main role label for this operation context.</p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Secondary Templates</div>
              <div className="mt-2 text-sm font-semibold text-slate-950">
                {model.secondaryRoles.length
                  ? model.secondaryRoles.map((role) => role.role_name).join(", ")
                  : "None"}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Additional role/template access currently assigned.
              </p>
            </article>
          </section>

          {mode === "edit" && (
            <section className="grid gap-4 rounded-lg border border-blue-200 bg-blue-50/60 p-4" aria-label="Permission edit options">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Choose an editing path</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Apply a secondary template for guided access, or make individual permission overrides below.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-white bg-white p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Apply Secondary Role/Template
                  </div>
                  <div className="mt-3 grid gap-2">
                    {roleTemplates.length === 0 ? (
                      <div className="text-xs text-slate-500">No secondary templates are available to preview.</div>
                    ) : (
                      roleTemplates.map((role) => {
                        const roleName = role.role_name || role.display_name || "Role template";
                        const checked = draftRoleIds.includes(role.role_id);
                        const permissionCount = permissionKeysByRole.get(role.role_id)?.length || 0;
                        return (
                          <label
                            key={role.role_id}
                            className="flex items-start gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRoleTemplate(role.role_id)}
                              className="mt-1"
                            />
                            <span>
                              <span className="block font-semibold text-slate-900">{roleName}</span>
                              <span className="text-xs text-slate-500">
                                {permissionCount} permissions inherit from this template when selected.
                              </span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-white bg-white p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Customize Individual Permissions
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Use Add or Remove on grouped permission rows. Individual changes are tracked as pending
                    overrides and do not conflict with template inheritance.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
                      {review.addedPermissions.length} added
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
                      {review.removedPermissions.length} removed
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {mode === "review" && (
            <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4" aria-label="Permission change review">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Review pending changes</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  This is a local draft review only. Confirmation is disabled until backend save wiring is added.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Templates added/removed
                  </div>
                  <ul className="mt-2 grid gap-1 text-sm text-slate-700">
                    {review.addedTemplates.map((role) => (
                      <li key={`added-${role.role_id}`}>Added: {role.role_name}</li>
                    ))}
                    {review.removedTemplates.map((role) => (
                      <li key={`removed-${role.role_id}`}>Removed: {role.role_name}</li>
                    ))}
                    {!review.addedTemplates.length && !review.removedTemplates.length && <li>No template changes.</li>}
                  </ul>
                </div>
                <div className="rounded-md border border-slate-200 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Affected categories
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {review.affectedCategories.length ? (
                      review.affectedCategories.map((category) => (
                        <span
                          key={category}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600"
                        >
                          {category}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">No permission categories changed.</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    Permissions added
                  </div>
                  <ul className="mt-2 grid gap-1 text-sm text-emerald-900">
                    {review.addedPermissions.length ? (
                      review.addedPermissions.map((permission) => <li key={permission.key}>{permission.label}</li>)
                    ) : (
                      <li>No permissions added.</li>
                    )}
                  </ul>
                </div>
                <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
                    Permissions removed
                  </div>
                  <ul className="mt-2 grid gap-1 text-sm text-rose-900">
                    {review.removedPermissions.length ? (
                      review.removedPermissions.map((permission) => <li key={permission.key}>{permission.label}</li>)
                    ) : (
                      <li>No permissions removed.</li>
                    )}
                  </ul>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-lg border border-slate-200 bg-white" aria-labelledby="permission-center-effective-title">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 id="permission-center-effective-title" className="text-sm font-semibold text-slate-950">
                Effective Permissions
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Grouped by business area. Source labels explain whether access comes from a primary role,
                secondary role/template, or individual override.
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
                  {model.permissionCount} effective
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
                  {model.overrideCount} overrides
                </span>
              </div>
            </div>
            {renderPermissionGroups({ editable: mode === "edit" })}
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          {mode === "view" && (
            <button
              type="button"
              onClick={beginEdit}
              disabled={loadingAccess}
              className="rounded-md border border-slate-950 bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Edit permissions
            </button>
          )}
          {mode === "edit" && (
            <>
              <button
                type="button"
                onClick={cancelDraft}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel changes
              </button>
              <button
                type="button"
                onClick={() => setMode("review")}
                disabled={!hasDraftChanges}
                className="rounded-md border border-slate-950 bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                Review changes
              </button>
            </>
          )}
          {mode === "review" && (
            <>
              <button
                type="button"
                onClick={() => setMode("edit")}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to edit
              </button>
              <button
                type="button"
                onClick={cancelDraft}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel changes
              </button>
              <button
                type="button"
                disabled
                className="rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-500"
              >
                Confirm changes (not wired yet)
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

function MemberCard({ member, busy, readOnly = false, onEditRoles, onOpenPermissionCenter, onSetStatus }) {
  const name = getMemberName(member);
  const color = getMemberColor(member);
  const roles = roleLabels(member);
  const status = String(member.membership_status || "").toLowerCase();
  const hasOwnerAccess = member?.is_owner || roles.some((role) => role.owner);
  const hasAdminAccess = roles.some((role) => role.admin);
  const [pendingStatus, setPendingStatus] = useState(null);
  const isPendingDeactivate = pendingStatus === "inactive";
  const pendingStatusLabel = isPendingDeactivate ? "Deactivate" : "Reactivate";

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
        {!readOnly && (member.can_update_roles || member.can_deactivate || member.can_reactivate) && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onOpenPermissionCenter(member)}
              disabled={busy}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Permission Center
            </button>
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
                onClick={() => setPendingStatus("inactive")}
                disabled={busy}
                className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
              >
                Deactivate
              </button>
            )}
            {member.can_reactivate && (
              <button
                type="button"
                onClick={() => setPendingStatus("active")}
                disabled={busy}
                className="rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
              >
                Reactivate
              </button>
            )}
          </div>
        )}
        {pendingStatus && (
          <div
            role="alertdialog"
            aria-label={`${pendingStatusLabel} member`}
            className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          >
            <div className="font-semibold">
              {pendingStatusLabel} {name}?
            </div>
            <div className="mt-1 text-xs text-amber-800">
              {isPendingDeactivate
                ? "They will lose active company access."
                : "Their company access will become active again."}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPendingStatus(null)}
                disabled={busy}
                className="rounded border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onSetStatus(member, pendingStatus);
                  setPendingStatus(null);
                }}
                disabled={busy}
                className="rounded border border-amber-700 bg-amber-700 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
              >
                {pendingStatusLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function StaffDirectoryCard({ member }) {
  const name = getMemberName(member);
  const color = getMemberColor(member);
  const roles = memberRoleNames(member);
  const roleText = roles.length ? roles.join(", ") : "Staff";
  const accentClass = {
    owner: "border-l-emerald-500",
    admin: "border-l-blue-500",
    reviewer: "border-l-violet-500",
    appraiser: "border-l-amber-500",
    other: "border-l-slate-400",
  }[memberDirectoryGroupId(member)];

  return (
    <li className="min-w-0">
      <article
        className={`flex h-full min-h-36 flex-col rounded-lg border border-l-4 border-slate-200 ${accentClass} bg-gradient-to-br from-white to-slate-50/70 p-3.5 shadow-sm transition hover:border-slate-300 hover:shadow-md`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm ring-2 ring-white"
            style={{ backgroundColor: color }}
            title={name}
          >
            {member.avatar_url ? (
              <img src={member.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              (name || "?").slice(0, 1).toUpperCase()
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold text-slate-950">{name}</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(roles.length ? roles : [roleText]).map((role) => (
                <span
                  key={role}
                  className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 shadow-sm"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex min-w-0 flex-1 flex-col justify-end gap-2 border-t border-slate-200/80 pt-3 text-sm">
          {member.email && (
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Email</div>
              <a
                href={`mailto:${member.email}`}
                className="mt-0.5 block truncate font-medium text-slate-700 underline decoration-dotted underline-offset-2 hover:text-slate-950"
              >
                {member.email}
              </a>
            </div>
          )}
          {member.phone && (
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Phone</div>
              <a
                href={`tel:${member.phone}`}
                className="mt-0.5 block truncate font-medium text-slate-600 underline decoration-dotted underline-offset-2 hover:text-slate-950"
              >
                {member.phone}
              </a>
            </div>
          )}
        </div>
      </article>
    </li>
  );
}

const STAFF_DIRECTORY_GROUPS = Object.freeze([
  { id: "owner", title: "Owner" },
  { id: "admin", title: "Admin" },
  { id: "reviewer", title: "Reviewers" },
  { id: "appraiser", title: "Appraisers" },
  { id: "other", title: "Other Staff" },
]);

function StaffDirectory({ members }) {
  const activeMembers = members.filter(
    (member) => String(member.membership_status || "").toLowerCase() === "active",
  );
  const groupedMembers = activeMembers.reduce((groups, member) => {
    const groupId = memberDirectoryGroupId(member);
    groups[groupId] = [...(groups[groupId] || []), member];
    return groups;
  }, {});

  if (activeMembers.length === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 shadow-sm">
        No staff contacts are visible.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-label="Staff directory">
      {STAFF_DIRECTORY_GROUPS.flatMap((group) => {
        const groupMembers = groupedMembers[group.id] || [];
        if (groupMembers.length === 0) return [];

        return [
          <section key={group.id} aria-labelledby={`staff-directory-${group.id}`} className="border-b border-slate-200 last:border-b-0">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-2">
              <h2 id={`staff-directory-${group.id}`} className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {group.title}
              </h2>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                {groupMembers.length}
              </span>
            </div>
            <ul className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {groupMembers.map((member) => (
                <StaffDirectoryCard key={member.membership_id || member.user_id} member={member} />
              ))}
            </ul>
          </section>,
        ];
      })}
    </section>
  );
}

export default function UsersIndex() {
  const shellProfilePresentation = useShellProfile();
  const { operationsMode } = useOperationsMode();
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
  const [permissionCenterMember, setPermissionCenterMember] = useState(null);
  const [busyMemberId, setBusyMemberId] = useState(null);
  const [invitationRefreshKey, setInvitationRefreshKey] = useState(0);

  const shellProfileId = shellProfilePresentation?.profileId ?? shellProfilePresentation?.id;
  const isAppraiserDirectoryMode =
    shellProfileId === SHELL_PROFILE_IDS.MY_WORK || shellProfileId === SHELL_PROFILE_IDS.REVIEW_QUEUE;
  const pageTitle = isAppraiserDirectoryMode ? "Staff Directory" : "Users";
  const canListMembers = canReadUsersPermission.allowed;
  const canManageInvitations =
    !isAppraiserDirectoryMode &&
    canInviteUsersPermission.allowed &&
    canManageCompanyAccessPermission.allowed;
  const canSendInvitations =
    !isAppraiserDirectoryMode && canManageInvitations && canAssignRolesPermission.allowed;
  const canListInvitations =
    !isAppraiserDirectoryMode && (canReadUsersPermission.allowed || canManageInvitations);

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
    setBusyMemberId(member.user_id);
    try {
      await setCompanyMemberStatus(
        member.user_id,
        status,
        isDeactivate ? "Deactivated from Users" : "Reactivated from Users",
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
          <h1 className="text-2xl font-semibold text-slate-950">{pageTitle}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            {isAppraiserDirectoryMode
              ? "Current company contacts."
              : "Manage company users, roles, and invitations. New access starts with an invite; direct user creation is no longer available here."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!isAppraiserDirectoryMode && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={showInactive}
                onChange={(event) => setShowInactive(event.target.checked)}
              />
              Show inactive
            </label>
          )}
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

      {!isAppraiserDirectoryMode && (
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
            <p className="mt-1 text-xs text-slate-500">Owner/admin users manage access changes.</p>
          </div>
        </div>
      )}

      {isAppraiserDirectoryMode ? (
        loading ? (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 shadow-sm">
            Loading staff directory...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Falcon could not load staff contacts.
          </div>
        ) : (
          <StaffDirectory members={members} />
        )
      ) : (
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
                      readOnly={isAppraiserDirectoryMode}
                      onEditRoles={setRoleEditorMember}
                      onOpenPermissionCenter={setPermissionCenterMember}
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
                      readOnly={isAppraiserDirectoryMode}
                      onEditRoles={setRoleEditorMember}
                      onOpenPermissionCenter={setPermissionCenterMember}
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
      )}

      {!isAppraiserDirectoryMode && (
        <CompanyInvitationsPanel
          canList={canListInvitations}
          canInvite={canSendInvitations}
          onOpenInvite={() => setInviteOpen(true)}
          refreshToken={invitationRefreshKey}
        />
      )}

      <InviteCompanyMemberModal
        open={canSendInvitations && inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={() => {
          setInviteOpen(false);
          toast.success("Invitation sent. Access starts after the recipient accepts.");
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
      <PermissionCenterDialog
        open={Boolean(permissionCenterMember)}
        member={permissionCenterMember}
        operationsMode={operationsMode}
        onClose={() => setPermissionCenterMember(null)}
      />
    </div>
  );
}
