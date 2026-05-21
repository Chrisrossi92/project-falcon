import { PRODUCT_MODE_METADATA } from '../productModes/productModeMetadata.js';
import { isProductModeId } from '../productModes/productModes.js';
import {
  composeProductModeModuleIds,
  getMissingDependencyIds,
  getModuleMetadata,
} from '../modules/moduleHelpers.js';
import { NAV_REGISTRATION_KINDS } from '../modules/moduleRegistry.js';

export const SHADOW_NAV_DIAGNOSTIC_STATUS = Object.freeze({
  METADATA_ONLY: 'metadata_only',
});

export const SHADOW_NAV_AUTHORITY = Object.freeze({
  NONE: 'none_metadata_only',
});

export const SHADOW_NAV_VISIBILITY = Object.freeze({
  CANDIDATE: 'candidate',
  HIDDEN_METADATA: 'hidden_metadata',
});

const isHiddenRegistration = (registration) =>
  registration?.kind === NAV_REGISTRATION_KINDS.HIDDEN_UNTIL_COMPOSED;

const createShadowNavEntry = (moduleDefinition) => {
  const navRegistration = moduleDefinition.navRegistration;
  const visibility = isHiddenRegistration(navRegistration)
    ? SHADOW_NAV_VISIBILITY.HIDDEN_METADATA
    : SHADOW_NAV_VISIBILITY.CANDIDATE;

  return Object.freeze({
    moduleId: moduleDefinition.id,
    label: moduleDefinition.label,
    category: moduleDefinition.category,
    registrationKind: navRegistration.kind,
    visibility,
    visibleInShadowNav: visibility === SHADOW_NAV_VISIBILITY.CANDIDATE,
    registrationStatus: SHADOW_NAV_DIAGNOSTIC_STATUS.METADATA_ONLY,
    runtimeComposed: false,
    permissionDomains: Object.freeze([...moduleDefinition.permissionDomains]),
    permissionAuthority: SHADOW_NAV_AUTHORITY.NONE,
    permissionMetadataOnly: true,
    notes: navRegistration.notes,
  });
};

export const getShadowNavigationEntriesForModuleIds = (moduleIds = []) =>
  Object.freeze(
    moduleIds
      .map((moduleId) => getModuleMetadata(moduleId))
      .filter(Boolean)
      .map((moduleDefinition) => createShadowNavEntry(moduleDefinition)),
  );

export const getShadowNavigationComposition = (modeId, additionalModuleIds = []) => {
  const isKnownMode = isProductModeId(modeId);

  if (!isKnownMode) {
    return Object.freeze({
      modeId,
      isKnownMode: false,
      moduleIds: Object.freeze([]),
      expectedNavLabels: Object.freeze([]),
      entries: Object.freeze([]),
      visibleEntries: Object.freeze([]),
      hiddenEntries: Object.freeze([]),
      missingDependencyIds: Object.freeze([]),
      permissionAuthority: SHADOW_NAV_AUTHORITY.NONE,
      runtimeComposed: false,
      diagnostics: Object.freeze(['Unknown product mode; no shadow navigation generated.']),
    });
  }

  const productMode = PRODUCT_MODE_METADATA[modeId];
  const moduleIds = composeProductModeModuleIds(modeId, additionalModuleIds);
  const entries = getShadowNavigationEntriesForModuleIds(moduleIds);
  const visibleEntries = Object.freeze(entries.filter((entry) => entry.visibleInShadowNav));
  const hiddenEntries = Object.freeze(entries.filter((entry) => !entry.visibleInShadowNav));

  return Object.freeze({
    modeId,
    isKnownMode: true,
    moduleIds,
    expectedNavLabels: productMode.futureNavShape,
    entries,
    visibleEntries,
    hiddenEntries,
    missingDependencyIds: getMissingDependencyIds(moduleIds),
    permissionAuthority: SHADOW_NAV_AUTHORITY.NONE,
    runtimeComposed: false,
    diagnostics: Object.freeze([
      'Shadow navigation is diagnostic metadata only.',
      'Permission domains describe future route/nav gates but do not authorize visibility here.',
    ]),
  });
};

export const getShadowNavigationModuleIds = (modeId, additionalModuleIds = []) =>
  getShadowNavigationComposition(modeId, additionalModuleIds).visibleEntries.map(
    (entry) => entry.moduleId,
  );
