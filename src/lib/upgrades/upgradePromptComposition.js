import { getModuleMetadata } from '../modules/moduleHelpers.js';
import { MODULE_IDS } from '../modules/moduleRegistry.js';
import { PRODUCT_MODE_METADATA } from '../productModes/productModeMetadata.js';
import { isProductModeId, PRODUCT_MODE_IDS } from '../productModes/productModes.js';

export const SHADOW_UPGRADE_DIAGNOSTIC_STATUS = Object.freeze({
  METADATA_ONLY: 'metadata_only',
});

export const SHADOW_UPGRADE_AUTHORITY = Object.freeze({
  NONE: 'none_metadata_only',
});

export const SHADOW_UPGRADE_CONTEXT = Object.freeze({
  OPERATIONAL_EXPANSION: 'operational_expansion',
  NETWORK_EXPANSION: 'network_expansion',
  CLIENT_WORKSPACE: 'client_workspace',
  PACKET_WORKSPACE: 'packet_workspace',
  INTELLIGENCE: 'intelligence',
  PLATFORM_ADMIN: 'platform_admin',
});

const upgradePromptBlueprint = (id, label, moduleId, context, message, tags = []) =>
  Object.freeze({
    id,
    label,
    moduleId,
    context,
    message,
    tags: Object.freeze(tags),
  });

const UPGRADE_PROMPTS_BY_MODE = Object.freeze({
  [PRODUCT_MODE_IDS.STAFF_APPRAISAL]: Object.freeze([
    upgradePromptBlueprint(
      'staff-network-participation',
      'Add network assignment participation',
      MODULE_IDS.ASSIGNMENTS,
      SHADOW_UPGRADE_CONTEXT.NETWORK_EXPANSION,
      'Introduce controlled assignment workflows when internal operations need network participation.',
      ['staff', 'network', 'assignments'],
    ),
    upgradePromptBlueprint(
      'staff-client-portal',
      'Add client request/status workspace',
      MODULE_IDS.CLIENT_PORTAL,
      SHADOW_UPGRADE_CONTEXT.CLIENT_WORKSPACE,
      'Give clients a purpose-built request, status, document, and update workspace.',
      ['staff', 'client_portal'],
    ),
    upgradePromptBlueprint(
      'staff-intelligence',
      'Add operational intelligence',
      MODULE_IDS.ANALYTICS,
      SHADOW_UPGRADE_CONTEXT.INTELLIGENCE,
      'Add analytics and reporting after operational workflow data is stable.',
      ['staff', 'analytics'],
    ),
  ]),
  [PRODUCT_MODE_IDS.AMC_OPERATIONS]: Object.freeze([
    upgradePromptBlueprint(
      'amc-vendor-portal',
      'Add vendor packet workspace',
      MODULE_IDS.VENDOR_PORTAL,
      SHADOW_UPGRADE_CONTEXT.PACKET_WORKSPACE,
      'Expose assigned packet work through a vendor-native workspace instead of internal AMC screens.',
      ['amc', 'vendor_portal'],
    ),
    upgradePromptBlueprint(
      'amc-client-portal',
      'Add client request/status workspace',
      MODULE_IDS.CLIENT_PORTAL,
      SHADOW_UPGRADE_CONTEXT.CLIENT_WORKSPACE,
      'Expose client request, status, message, and document workflows through a client-native workspace.',
      ['amc', 'client_portal'],
    ),
    upgradePromptBlueprint(
      'amc-integrations',
      'Add lender integrations',
      MODULE_IDS.INTEGRATIONS,
      SHADOW_UPGRADE_CONTEXT.PLATFORM_ADMIN,
      'Connect lender and operational systems after AMC workflow boundaries are stable.',
      ['amc', 'integrations'],
    ),
  ]),
  [PRODUCT_MODE_IDS.VENDOR_PORTAL]: Object.freeze([
    upgradePromptBlueprint(
      'vendor-company-workspace',
      'Add company operations workspace',
      MODULE_IDS.ORDERS,
      SHADOW_UPGRADE_CONTEXT.OPERATIONAL_EXPANSION,
      'Expand from packet-only participation into a company-owned operations workspace when needed.',
      ['vendor', 'operations'],
    ),
    upgradePromptBlueprint(
      'vendor-ai-assistance',
      'Add report assistance',
      MODULE_IDS.AI_WORKSPACE,
      SHADOW_UPGRADE_CONTEXT.INTELLIGENCE,
      'Add contextual drafting or summary assistance for assigned work without exposing internal network operations.',
      ['vendor', 'ai'],
    ),
  ]),
  [PRODUCT_MODE_IDS.CLIENT_PORTAL]: Object.freeze([
    upgradePromptBlueprint(
      'client-integrations',
      'Add request integrations',
      MODULE_IDS.INTEGRATIONS,
      SHADOW_UPGRADE_CONTEXT.CLIENT_WORKSPACE,
      'Connect request intake and status updates to lender systems when the client workspace is ready.',
      ['client', 'integrations'],
    ),
    upgradePromptBlueprint(
      'client-analytics',
      'Add request reporting',
      MODULE_IDS.ANALYTICS,
      SHADOW_UPGRADE_CONTEXT.INTELLIGENCE,
      'Add request and delivery reporting without exposing internal workflow operations.',
      ['client', 'analytics'],
    ),
    upgradePromptBlueprint(
      'client-billing',
      'Add billing visibility',
      MODULE_IDS.BILLING,
      SHADOW_UPGRADE_CONTEXT.PLATFORM_ADMIN,
      'Expose future invoice and billing status only when billing features exist.',
      ['client', 'billing'],
    ),
  ]),
  [PRODUCT_MODE_IDS.HYBRID_ECOSYSTEM]: Object.freeze([
    upgradePromptBlueprint(
      'hybrid-internal-lane',
      'Expand internal operations lane',
      MODULE_IDS.ORDERS,
      SHADOW_UPGRADE_CONTEXT.OPERATIONAL_EXPANSION,
      'Add internal operating modules while keeping network and client lanes distinct.',
      ['hybrid', 'internal'],
    ),
    upgradePromptBlueprint(
      'hybrid-network-lane',
      'Expand network lane',
      MODULE_IDS.RELATIONSHIPS,
      SHADOW_UPGRADE_CONTEXT.NETWORK_EXPANSION,
      'Add relationship and assignment capabilities without granting visibility by relationship alone.',
      ['hybrid', 'network'],
    ),
    upgradePromptBlueprint(
      'hybrid-client-lane',
      'Expand client workspace lane',
      MODULE_IDS.CLIENT_PORTAL,
      SHADOW_UPGRADE_CONTEXT.CLIENT_WORKSPACE,
      'Add client-facing request/status surfaces with lane-specific visibility boundaries.',
      ['hybrid', 'client'],
    ),
  ]),
});

const createShadowUpgradePrompt = (modeId, blueprint) => {
  const moduleDefinition = getModuleMetadata(blueprint.moduleId);

  return Object.freeze({
    id: blueprint.id,
    label: blueprint.label,
    message: blueprint.message,
    context: blueprint.context,
    tags: blueprint.tags,
    moduleId: blueprint.moduleId,
    moduleLabel: moduleDefinition?.label ?? null,
    permissionDomains: Object.freeze([...(moduleDefinition?.permissionDomains ?? [])]),
    registrationStatus: SHADOW_UPGRADE_DIAGNOSTIC_STATUS.METADATA_ONLY,
    runtimeComposed: false,
    permissionAuthority: SHADOW_UPGRADE_AUTHORITY.NONE,
    permissionMetadataOnly: true,
    billingAuthority: SHADOW_UPGRADE_AUTHORITY.NONE,
    billingMetadataOnly: true,
    modeId,
  });
};

export const getShadowUpgradePromptsForMode = (modeId) => {
  if (!isProductModeId(modeId)) {
    return Object.freeze([]);
  }

  return Object.freeze(
    (UPGRADE_PROMPTS_BY_MODE[modeId] ?? []).map((blueprint) =>
      createShadowUpgradePrompt(modeId, blueprint),
    ),
  );
};

export const getShadowUpgradePromptsForModuleIds = (modeId, moduleIds = []) => {
  if (!isProductModeId(modeId)) {
    return Object.freeze([]);
  }

  const knownModuleIds = new Set(
    moduleIds.filter((moduleId) => Boolean(getModuleMetadata(moduleId))),
  );

  if (knownModuleIds.size === 0) {
    return Object.freeze([]);
  }

  return Object.freeze(
    getShadowUpgradePromptsForMode(modeId).filter((prompt) =>
      knownModuleIds.has(prompt.moduleId),
    ),
  );
};

export const getShadowUpgradePromptComposition = (modeId) => {
  if (!isProductModeId(modeId)) {
    return Object.freeze({
      modeId,
      isKnownMode: false,
      upgradePaths: Object.freeze([]),
      prompts: Object.freeze([]),
      promptsByContext: Object.freeze({}),
      permissionAuthority: SHADOW_UPGRADE_AUTHORITY.NONE,
      billingAuthority: SHADOW_UPGRADE_AUTHORITY.NONE,
      runtimeComposed: false,
      diagnostics: Object.freeze(['Unknown product mode; no shadow upgrade prompts generated.']),
    });
  }

  const prompts = getShadowUpgradePromptsForMode(modeId);
  const promptsByContext = prompts.reduce((accumulator, prompt) => {
    const existingPrompts = accumulator[prompt.context] ?? [];

    return {
      ...accumulator,
      [prompt.context]: Object.freeze([...existingPrompts, prompt]),
    };
  }, {});

  return Object.freeze({
    modeId,
    isKnownMode: true,
    upgradePaths: PRODUCT_MODE_METADATA[modeId].upgradePaths,
    prompts,
    promptsByContext: Object.freeze(promptsByContext),
    permissionAuthority: SHADOW_UPGRADE_AUTHORITY.NONE,
    billingAuthority: SHADOW_UPGRADE_AUTHORITY.NONE,
    runtimeComposed: false,
    diagnostics: Object.freeze([
      'Shadow upgrade prompts are contextual diagnostic metadata only.',
      'Permission domains and billing concepts do not authorize visibility or enforce packaging here.',
    ]),
  });
};

export const getShadowUpgradePromptIds = (modeId) =>
  getShadowUpgradePromptComposition(modeId).prompts.map((prompt) => prompt.id);
