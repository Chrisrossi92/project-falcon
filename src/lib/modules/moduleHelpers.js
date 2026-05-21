import { PRODUCT_MODE_METADATA } from '../productModes/productModeMetadata.js';
import { isProductModeId } from '../productModes/productModes.js';
import {
  MODULE_BUNDLE_TYPES,
  MODULE_ID_LIST,
  MODULE_REGISTRY,
  MODULE_REGISTRY_LIST,
} from './moduleRegistry.js';

export const getModuleMetadata = (moduleId) => MODULE_REGISTRY[moduleId] ?? null;

export const getProductModeMetadata = (modeId) =>
  PRODUCT_MODE_METADATA[modeId] ?? null;

export const getModulesByCategory = (categoryId) =>
  MODULE_REGISTRY_LIST.filter((moduleDefinition) => moduleDefinition.category === categoryId);

export const getModulesByBundleType = (bundleType) =>
  MODULE_REGISTRY_LIST.filter((moduleDefinition) => moduleDefinition.bundleType === bundleType);

export const getSystemModules = () => getModulesByBundleType(MODULE_BUNDLE_TYPES.SYSTEM);

export const getModulesForProductMode = (modeId) => {
  const productMode = getProductModeMetadata(modeId);

  if (!productMode) {
    return Object.freeze([]);
  }

  return Object.freeze(
    productMode.includedModules
      .map((moduleId) => getModuleMetadata(moduleId))
      .filter(Boolean),
  );
};

export const getOptionalModulesForProductMode = (modeId) => {
  const productMode = getProductModeMetadata(modeId);

  if (!productMode) {
    return Object.freeze([]);
  }

  return Object.freeze(
    productMode.optionalModules
      .map((moduleId) => getModuleMetadata(moduleId))
      .filter(Boolean),
  );
};

export const getHiddenModulesForProductMode = (modeId) => {
  const productMode = getProductModeMetadata(modeId);

  if (!productMode) {
    return Object.freeze([]);
  }

  return Object.freeze(
    productMode.hiddenByDefaultModules
      .map((moduleId) => getModuleMetadata(moduleId))
      .filter(Boolean),
  );
};

export const getModuleDependencyIds = (moduleId) => {
  const moduleDefinition = getModuleMetadata(moduleId);

  return moduleDefinition?.dependencies ?? Object.freeze([]);
};

export const getMissingDependencyIds = (enabledModuleIds) => {
  const enabledModuleSet = new Set(enabledModuleIds);
  const missingDependencyIds = new Set();

  enabledModuleIds.forEach((moduleId) => {
    getModuleDependencyIds(moduleId).forEach((dependencyId) => {
      if (!enabledModuleSet.has(dependencyId)) {
        missingDependencyIds.add(dependencyId);
      }
    });
  });

  return Object.freeze([...missingDependencyIds]);
};

export const hasModuleDependencyCoverage = (enabledModuleIds) =>
  getMissingDependencyIds(enabledModuleIds).length === 0;

export const composeProductModeModuleIds = (modeId, additionalModuleIds = []) => {
  const productMode = getProductModeMetadata(modeId);

  if (!productMode) {
    return Object.freeze([]);
  }

  const composedModuleIds = new Set([
    ...productMode.includedModules,
    ...additionalModuleIds.filter((moduleId) => MODULE_ID_LIST.includes(moduleId)),
  ]);

  return Object.freeze([...composedModuleIds]);
};

export const getMetadataOnlyNavRegistrations = (moduleIds) =>
  Object.freeze(
    moduleIds
      .map((moduleId) => getModuleMetadata(moduleId)?.navRegistration)
      .filter(Boolean),
  );

export const getMetadataOnlyDashboardRegistrations = (moduleIds) =>
  Object.freeze(
    moduleIds
      .map((moduleId) => getModuleMetadata(moduleId)?.dashboardRegistration)
      .filter(Boolean),
  );

export const describeProductModeComposition = (modeId, additionalModuleIds = []) => {
  if (!isProductModeId(modeId)) {
    return null;
  }

  const moduleIds = composeProductModeModuleIds(modeId, additionalModuleIds);

  return Object.freeze({
    modeId,
    moduleIds,
    missingDependencyIds: getMissingDependencyIds(moduleIds),
    navRegistrations: getMetadataOnlyNavRegistrations(moduleIds),
    dashboardRegistrations: getMetadataOnlyDashboardRegistrations(moduleIds),
    runtimeComposed: false,
  });
};
