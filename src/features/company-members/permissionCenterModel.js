import { isWorkEligibilityPermissionKey } from "@/features/company-members/permissionOverrideVisibility";
import { getWorkspaceIdentity } from "@/lib/workspace/workspaceIdentity";

export const PERMISSION_CENTER_CATEGORIES = Object.freeze([
  { id: "orders", label: "Orders", prefixes: ["orders.", "workflow.status.", "workflow.override_"] },
  { id: "assignments", label: "Assignments", prefixes: ["assignments.", "order_company_assignments."] },
  {
    id: "vendors",
    label: "Vendors",
    prefixes: ["vendors.", "relationships.", "vendor_workspace.", "vendor_bids.", "vendor_profile.", "bid_requests."],
  },
  { id: "clients", label: "Clients", prefixes: ["clients."] },
  { id: "payments", label: "Payments", prefixes: ["billing.", "vendor_payments.", "vendor_invoices."] },
  { id: "reports", label: "Reports", prefixes: ["reports.", "documents."] },
  { id: "administration", label: "Administration", prefixes: ["company.", "users.", "roles.", "settings.", "navigation."] },
  { id: "notifications_activity", label: "Notifications / Activity", prefixes: ["notifications.", "activity.", "communications."] },
  { id: "other", label: "Other", prefixes: [] },
]);

const categoryById = new Map(PERMISSION_CENTER_CATEGORIES.map((category) => [category.id, category]));

function normalizeKey(value) {
  return String(value || "").trim();
}

function titleizeToken(value) {
  return String(value || "")
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function humanizePermissionKey(permissionKey) {
  const key = normalizeKey(permissionKey);
  if (!key) return "Permission";

  const [domain, ...actions] = key.split(".");
  if (!actions.length) return titleizeToken(domain);

  return `${titleizeToken(actions.join(" "))} ${titleizeToken(domain)}`.trim();
}

export function describePermission(permission = {}) {
  const explicit = String(permission.permission_description || permission.description || "").trim();
  if (explicit) return explicit;

  const key = normalizeKey(permission.permission_key || permission.key);
  if (!key) return "Controls access for this capability.";

  if (key.includes(".read") || key.includes("view")) return "Allows viewing this information in the current operation.";
  if (key.includes(".create") || key.includes("invite")) return "Allows creating or inviting records in the current operation.";
  if (key.includes(".update") || key.includes("manage")) return "Allows managing this capability in the current operation.";
  if (key.includes(".delete") || key.includes("archive") || key.includes("deactivate")) {
    return "Allows removing, archiving, or deactivating records in the current operation.";
  }
  if (key.includes("assign") || key.includes("offer")) return "Allows assignment or dispatch actions in the current operation.";
  if (key.includes("billing") || key.includes("payment") || key.includes("invoice")) {
    return "Allows financial workflow actions in the current operation.";
  }

  return "Controls access for this capability in the current operation.";
}

export function permissionCenterCategoryId(permission = {}) {
  const key = normalizeKey(permission.permission_key || permission.key);
  const category = String(permission.permission_category || permission.category || "").toLowerCase();

  if (isWorkEligibilityPermissionKey(key)) return "assignments";
  if (categoryById.has(category)) return category;

  const matched = PERMISSION_CENTER_CATEGORIES.find((candidate) =>
    candidate.prefixes.some((prefix) => key.startsWith(prefix)),
  );
  return matched?.id || "other";
}

function activeRoleAssignments(member = {}) {
  return (Array.isArray(member.role_assignments) ? member.role_assignments : []).filter(
    (role) => String(role?.status || "active").toLowerCase() === "active",
  );
}

function roleDetailsFromPermissions(rolePermissions = []) {
  const roles = new Map();
  (Array.isArray(rolePermissions) ? rolePermissions : []).forEach((permission) => {
    const roleId = normalizeKey(permission.role_id);
    if (!roleId || roles.has(roleId)) return;
    roles.set(roleId, {
      role_id: roleId,
      role_name: permission.role_name || "Role template",
      is_primary: false,
      status: "active",
    });
  });
  return roles;
}

function normalizePermissionCenterOverrides(overrideRows = [], selectedRoleIds = [], rolePermissions = []) {
  const inheritedKeys = new Set(
    (Array.isArray(rolePermissions) ? rolePermissions : [])
      .filter((permission) => selectedRoleIds.includes(permission.role_id))
      .map((permission) => normalizeKey(permission.permission_key))
      .filter(Boolean),
  );
  const normalized = new Map();

  (Array.isArray(overrideRows) ? overrideRows : []).forEach((row) => {
    const key = normalizeKey(row?.permission_key || row?.key);
    const effect = String(row?.effect || row?.override_effect || "").toLowerCase();
    if (!key || (effect !== "grant" && effect !== "revoke")) return;

    const inherited = inheritedKeys.has(key);
    if ((effect === "grant" && !inherited) || (effect === "revoke" && inherited)) {
      normalized.set(key, {
        effect,
        pending: Boolean(row?.pending),
      });
    }
  });

  return normalized;
}

export function resolvePrimaryAndSecondaryRoles(member = {}) {
  const roles = activeRoleAssignments(member);
  const primary = roles.find((role) => role.is_primary) || roles[0] || null;
  const secondary = roles.filter((role) => role !== primary);
  return { primary, secondary, roles };
}

export function buildPermissionCenterModel({
  member,
  rolePermissions = [],
  overrideRows = [],
  draftRoleIds = null,
  draftOverrideRows = null,
  operationsMode,
} = {}) {
  const { primary, roles } = resolvePrimaryAndSecondaryRoles(member);
  const originalRoleIds = roles.map((role) => role.role_id).filter(Boolean);
  const roleDetailsById = roleDetailsFromPermissions(rolePermissions);
  roles.forEach((role) => {
    if (role?.role_id) roleDetailsById.set(role.role_id, role);
  });
  const selectedRoleIds = Array.isArray(draftRoleIds) ? draftRoleIds.filter(Boolean) : originalRoleIds;
  const selectedRoleIdSet = new Set(selectedRoleIds);
  const pendingRoleIdSet = new Set(selectedRoleIds.filter((roleId) => !originalRoleIds.includes(roleId)));
  const selectedRoles = selectedRoleIds.map((roleId) => roleDetailsById.get(roleId)).filter(Boolean);
  const selectedPrimary = selectedRoles.find((role) => role?.role_id === primary?.role_id) || primary || selectedRoles[0] || null;
  const selectedSecondary = selectedRoles.filter((role) => role?.role_id !== selectedPrimary?.role_id);
  const normalizedOverrides = normalizePermissionCenterOverrides(
    Array.isArray(draftOverrideRows) ? draftOverrideRows : overrideRows,
    selectedRoleIds,
    rolePermissions,
  );
  const permissionsByKey = new Map();

  (Array.isArray(rolePermissions) ? rolePermissions : []).forEach((permission) => {
    const key = normalizeKey(permission.permission_key);
    if (!key) return;

    const existing = permissionsByKey.get(key) || {
      key,
      label: permission.permission_label || humanizePermissionKey(key),
      description: describePermission(permission),
      categoryId: permissionCenterCategoryId(permission),
      sourceRoles: [],
      sourceRoleIds: [],
      inherited: false,
      override: null,
      pending: false,
      effective: false,
      sourceLabel: "Not granted",
    };

    if (selectedRoleIdSet.has(permission.role_id)) {
      existing.inherited = true;
      if (!existing.sourceRoleIds.includes(permission.role_id)) {
        existing.sourceRoleIds.push(permission.role_id);
      }
      if (permission.role_name && !existing.sourceRoles.includes(permission.role_name)) {
        existing.sourceRoles.push(permission.role_name);
      }
    }

    const override = normalizedOverrides.get(key) || null;
    const overrideEffect = override?.effect || null;
    const pendingTemplate = existing.sourceRoleIds.some((roleId) => pendingRoleIdSet.has(roleId));
    existing.override = overrideEffect;
    existing.pending = Boolean(override?.pending || pendingTemplate);
    existing.effective = overrideEffect === "grant" || (existing.inherited && overrideEffect !== "revoke");
    existing.sourceLabel = existing.pending
      ? "Pending change"
      : overrideEffect === "grant"
        ? "Individual override"
        : overrideEffect === "revoke"
          ? "Individual override"
          : existing.inherited
            ? existing.sourceRoles.length > 1
              ? "Primary or secondary role/template"
              : selectedPrimary?.role_name && existing.sourceRoles.includes(selectedPrimary.role_name)
                ? "Primary role"
                : "Secondary role/template"
            : "Not granted";

    permissionsByKey.set(key, existing);
  });

  normalizedOverrides.forEach((override, key) => {
    if (permissionsByKey.has(key)) return;
    const effect = override.effect;
    permissionsByKey.set(key, {
      key,
      label: humanizePermissionKey(key),
      description: describePermission({ permission_key: key }),
      categoryId: permissionCenterCategoryId({ permission_key: key }),
      sourceRoles: [],
      sourceRoleIds: [],
      inherited: false,
      override: effect,
      pending: Boolean(override.pending),
      effective: effect === "grant",
      sourceLabel: override.pending ? "Pending change" : "Individual override",
    });
  });

  const groups = new Map();
  [...permissionsByKey.values()]
    .sort((a, b) => a.label.localeCompare(b.label))
    .forEach((permission) => {
      const group = groups.get(permission.categoryId) || [];
      group.push(permission);
      groups.set(permission.categoryId, group);
    });

  const categories = PERMISSION_CENTER_CATEGORIES
    .filter((category) => groups.has(category.id))
    .map((category) => {
      const permissions = groups.get(category.id);
      return {
        ...category,
        permissions,
        effectiveCount: permissions.filter((permission) => permission.effective).length,
        overrideCount: permissions.filter((permission) => permission.override).length,
      };
    });

  const workspaceIdentity = getWorkspaceIdentity(operationsMode);

  return {
    member,
    operationLabel: workspaceIdentity.label,
    operationDescription: "Permissions shown here are scoped to the active operation/company context.",
    primaryRole: selectedPrimary,
    secondaryRoles: selectedSecondary,
    roleCount: selectedRoles.length,
    selectedRoleIds,
    originalRoleIds,
    categories,
    permissions: [...permissionsByKey.values()],
    permissionCount: [...permissionsByKey.values()].filter((permission) => permission.effective).length,
    overrideCount: [...permissionsByKey.values()].filter((permission) => permission.override).length,
  };
}

export function buildPermissionCenterReview(originalModel, draftModel) {
  const originalPermissions = new Map((originalModel?.permissions || []).map((permission) => [permission.key, permission]));
  const draftPermissions = new Map((draftModel?.permissions || []).map((permission) => [permission.key, permission]));
  const permissionKeys = new Set([...originalPermissions.keys(), ...draftPermissions.keys()]);
  const addedPermissions = [];
  const removedPermissions = [];

  permissionKeys.forEach((key) => {
    const original = originalPermissions.get(key);
    const draft = draftPermissions.get(key);
    if (!original?.effective && draft?.effective) addedPermissions.push(draft);
    if (original?.effective && !draft?.effective) removedPermissions.push(original);
  });

  const originalRoleIds = originalModel?.selectedRoleIds || [];
  const draftRoleIds = draftModel?.selectedRoleIds || [];
  const roleById = new Map();
  [...(originalModel?.secondaryRoles || []), originalModel?.primaryRole, ...(draftModel?.secondaryRoles || []), draftModel?.primaryRole]
    .filter(Boolean)
    .forEach((role) => {
      if (role?.role_id) roleById.set(role.role_id, role);
    });

  const addedTemplates = draftRoleIds
    .filter((roleId) => !originalRoleIds.includes(roleId))
    .map((roleId) => roleById.get(roleId))
    .filter(Boolean);
  const removedTemplates = originalRoleIds
    .filter((roleId) => !draftRoleIds.includes(roleId))
    .map((roleId) => roleById.get(roleId))
    .filter(Boolean);
  const categoryByPermission = new Map(
    (draftModel?.categories || []).flatMap((category) =>
      category.permissions.map((permission) => [permission.key, category.label]),
    ),
  );
  (originalModel?.categories || []).forEach((category) => {
    category.permissions.forEach((permission) => {
      if (!categoryByPermission.has(permission.key)) categoryByPermission.set(permission.key, category.label);
    });
  });
  const affectedCategories = [
    ...new Set(
      [...addedPermissions, ...removedPermissions]
        .map((permission) => categoryByPermission.get(permission.key))
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));

  return {
    addedPermissions,
    removedPermissions,
    addedTemplates,
    removedTemplates,
    affectedCategories,
    hasChanges:
      addedPermissions.length > 0 ||
      removedPermissions.length > 0 ||
      addedTemplates.length > 0 ||
      removedTemplates.length > 0,
  };
}
