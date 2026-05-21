export const MODULE_CATEGORY_IDS = Object.freeze({
  SYSTEM: 'system',
  CORE_OPERATIONS: 'core_operations',
  NETWORK_ECOSYSTEM: 'network_ecosystem',
  INTELLIGENCE: 'intelligence',
  PLATFORM_ADMIN: 'platform_admin',
});

export const MODULE_CATEGORY_LABELS = Object.freeze({
  [MODULE_CATEGORY_IDS.SYSTEM]: 'System',
  [MODULE_CATEGORY_IDS.CORE_OPERATIONS]: 'Core operations',
  [MODULE_CATEGORY_IDS.NETWORK_ECOSYSTEM]: 'Network / ecosystem',
  [MODULE_CATEGORY_IDS.INTELLIGENCE]: 'Intelligence',
  [MODULE_CATEGORY_IDS.PLATFORM_ADMIN]: 'Platform / admin',
});

export const MODULE_CATEGORY_ORDER = Object.freeze([
  MODULE_CATEGORY_IDS.SYSTEM,
  MODULE_CATEGORY_IDS.CORE_OPERATIONS,
  MODULE_CATEGORY_IDS.NETWORK_ECOSYSTEM,
  MODULE_CATEGORY_IDS.INTELLIGENCE,
  MODULE_CATEGORY_IDS.PLATFORM_ADMIN,
]);

export const isModuleCategoryId = (categoryId) =>
  MODULE_CATEGORY_ORDER.includes(categoryId);
