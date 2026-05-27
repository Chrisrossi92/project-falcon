export const V1_SUPPRESSED_PERMISSION_CATEGORIES = Object.freeze([
  "assignments",
  "relationships",
  "order_company_assignments",
]);

export const V1_VISIBLE_PERMISSION_CATEGORIES = Object.freeze([
  "orders",
  "clients",
  "users",
  "roles",
  "workflow",
  "billing",
  "settings",
]);

export const WORK_ELIGIBILITY_PERMISSION_KEYS = Object.freeze([
  "orders.assignable_as_appraiser",
  "orders.assignable_as_reviewer",
]);

const suppressedCategories = new Set(V1_SUPPRESSED_PERMISSION_CATEGORIES);
const visibleCategories = new Set(V1_VISIBLE_PERMISSION_CATEGORIES);
const workEligibilityKeys = new Set(WORK_ELIGIBILITY_PERMISSION_KEYS);

const normalizeKey = (value) => String(value || "").trim();
const normalizeToken = (value) => normalizeKey(value).toLowerCase();

export function isWorkEligibilityPermissionKey(permissionKey) {
  return workEligibilityKeys.has(normalizeKey(permissionKey));
}

export function isV1VisiblePermissionOverride(permission) {
  const permissionKey = normalizeKey(
    typeof permission === "string" ? permission : permission?.permission_key,
  );
  if (!permissionKey || isWorkEligibilityPermissionKey(permissionKey)) return false;

  const category = normalizeToken(
    typeof permission === "string" ? "" : permission?.permission_category,
  );
  if (suppressedCategories.has(category)) return false;
  return visibleCategories.has(category);
}

export function v1VisiblePermissionKeys(permissions = []) {
  return new Set(
    (Array.isArray(permissions) ? permissions : [])
      .filter(isV1VisiblePermissionOverride)
      .map((permission) => normalizeKey(permission.permission_key))
      .filter(Boolean),
  );
}

export function normalizeOverrideRows(rows = [], visiblePermissions = []) {
  const visibleKeys = v1VisiblePermissionKeys(visiblePermissions);
  const shouldUseVisibleKeys = visibleKeys.size > 0;
  const overrides = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const permissionKey = normalizeKey(row?.permission_key);
    const effect = normalizeToken(row?.effect);
    if (!permissionKey || (effect !== "grant" && effect !== "revoke")) return;
    if (shouldUseVisibleKeys && !visibleKeys.has(permissionKey)) return;
    if (!shouldUseVisibleKeys && !isV1VisiblePermissionOverride(row)) return;

    overrides.set(permissionKey, effect);
  });

  return overrides;
}

export function roleDerivedPermissionKeys(selectedRoleIds, permissions) {
  const selected = new Set(Array.isArray(selectedRoleIds) ? selectedRoleIds : []);
  const keys = new Set();
  (Array.isArray(permissions) ? permissions : []).forEach((permission) => {
    const key = normalizeKey(permission?.permission_key);
    if (key && selected.has(permission.role_id) && isV1VisiblePermissionOverride(permission)) {
      keys.add(key);
    }
  });
  return keys;
}

export function normalizeEffectiveOverrideMap(overrides, selectedRoleIds, permissions) {
  const inheritedKeys = roleDerivedPermissionKeys(selectedRoleIds, permissions);
  const visibleKeys = v1VisiblePermissionKeys(permissions);
  const normalized = new Map();

  if (!(overrides instanceof Map)) return normalized;

  overrides.forEach((effect, permissionKey) => {
    const key = normalizeKey(permissionKey);
    if (!visibleKeys.has(key)) return;

    const inherited = inheritedKeys.has(key);
    if (effect === "grant" && !inherited) normalized.set(key, effect);
    if (effect === "revoke" && inherited) normalized.set(key, effect);
  });

  return normalized;
}

export function serializeOverrideMap(overrides, selectedRoleIds, permissions) {
  return [...normalizeEffectiveOverrideMap(overrides, selectedRoleIds, permissions).entries()]
    .filter(([, effect]) => effect === "grant" || effect === "revoke")
    .map(([permission_key, effect]) => ({ permission_key, effect }))
    .sort((a, b) => a.permission_key.localeCompare(b.permission_key));
}

export function serializedOverrideSignature(overrides) {
  return JSON.stringify(overrides);
}

