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
      normalized.set(key, effect);
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
  operationsMode,
} = {}) {
  const { primary, secondary, roles } = resolvePrimaryAndSecondaryRoles(member);
  const selectedRoleIds = roles.map((role) => role.role_id).filter(Boolean);
  const selectedRoleIdSet = new Set(selectedRoleIds);
  const normalizedOverrides = normalizePermissionCenterOverrides(overrideRows, selectedRoleIds, rolePermissions);
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
      inherited: false,
      override: null,
      effective: false,
      sourceLabel: "Not granted",
    };

    if (selectedRoleIdSet.has(permission.role_id)) {
      existing.inherited = true;
      if (permission.role_name && !existing.sourceRoles.includes(permission.role_name)) {
        existing.sourceRoles.push(permission.role_name);
      }
    }

    const override = normalizedOverrides.get(key) || null;
    existing.override = override;
    existing.effective = override === "grant" || (existing.inherited && override !== "revoke");
    existing.sourceLabel =
      override === "grant"
        ? "Individual override"
        : override === "revoke"
          ? "Individual override"
          : existing.inherited
            ? existing.sourceRoles.length > 1
              ? "Primary or secondary role/template"
              : primary?.role_name && existing.sourceRoles.includes(primary.role_name)
                ? "Primary role"
                : "Secondary role/template"
            : "Not granted";

    permissionsByKey.set(key, existing);
  });

  normalizedOverrides.forEach((effect, key) => {
    if (permissionsByKey.has(key)) return;
    permissionsByKey.set(key, {
      key,
      label: humanizePermissionKey(key),
      description: describePermission({ permission_key: key }),
      categoryId: permissionCenterCategoryId({ permission_key: key }),
      sourceRoles: [],
      inherited: false,
      override: effect,
      effective: effect === "grant",
      sourceLabel: "Individual override",
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
    primaryRole: primary,
    secondaryRoles: secondary,
    roleCount: roles.length,
    categories,
    permissionCount: [...permissionsByKey.values()].filter((permission) => permission.effective).length,
    overrideCount: [...permissionsByKey.values()].filter((permission) => permission.override).length,
  };
}
