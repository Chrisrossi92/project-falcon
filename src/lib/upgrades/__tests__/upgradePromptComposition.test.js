import { describe, expect, it } from 'vitest';

import { MODULE_IDS } from '../../modules/moduleRegistry.js';
import { PRODUCT_MODE_IDS } from '../../productModes/productModes.js';
import {
  SHADOW_UPGRADE_AUTHORITY,
  SHADOW_UPGRADE_CONTEXT,
  SHADOW_UPGRADE_DIAGNOSTIC_STATUS,
  getShadowUpgradePromptComposition,
  getShadowUpgradePromptIds,
  getShadowUpgradePromptsForModuleIds,
  getShadowUpgradePromptsForMode,
} from '../upgradePromptComposition.js';

describe('shadow upgrade prompt composition diagnostics', () => {
  it('creates contextual Staff upgrade prompt metadata', () => {
    const composition = getShadowUpgradePromptComposition(PRODUCT_MODE_IDS.STAFF_APPRAISAL);

    expect(composition.prompts.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        'staff-network-participation',
        'staff-client-portal',
        'staff-intelligence',
      ]),
    );
    expect(composition.promptsByContext[SHADOW_UPGRADE_CONTEXT.NETWORK_EXPANSION]).toHaveLength(
      1,
    );
  });

  it('creates AMC ecosystem expansion prompt metadata', () => {
    const promptIds = getShadowUpgradePromptIds(PRODUCT_MODE_IDS.AMC_OPERATIONS);

    expect(promptIds).toEqual(
      expect.arrayContaining(['amc-vendor-portal', 'amc-client-portal', 'amc-integrations']),
    );
  });

  it('keeps Vendor prompts free of Staff/AMC internal concepts', () => {
    const composition = getShadowUpgradePromptComposition(PRODUCT_MODE_IDS.VENDOR_PORTAL);
    const promptText = composition.prompts.map(({ label, message }) => `${label} ${message}`).join(' ');

    expect(composition.prompts.map(({ id }) => id)).toEqual(
      expect.arrayContaining(['vendor-company-workspace', 'vendor-ai-assistance']),
    );
    expect(promptText).not.toContain('AMC');
    expect(promptText).not.toContain('review queue');
    expect(promptText).not.toContain('internal AMC');
  });

  it('keeps Client prompts contextual and free of internal workflow/vendor concepts', () => {
    const composition = getShadowUpgradePromptComposition(PRODUCT_MODE_IDS.CLIENT_PORTAL);
    const promptText = composition.prompts.map(({ label, message }) => `${label} ${message}`).join(' ');

    expect(composition.prompts.map(({ id }) => id)).toEqual(
      expect.arrayContaining(['client-integrations', 'client-analytics', 'client-billing']),
    );
    expect(promptText).toContain('request');
    expect(promptText).not.toContain('review queue');
    expect(promptText).not.toContain('vendor operations');
    expect(promptText).not.toContain('assignment packet lifecycle');
  });

  it('preserves Hybrid lane expansion metadata', () => {
    const composition = getShadowUpgradePromptComposition(PRODUCT_MODE_IDS.HYBRID_ECOSYSTEM);

    expect(Object.keys(composition.promptsByContext)).toEqual(
      expect.arrayContaining([
        SHADOW_UPGRADE_CONTEXT.OPERATIONAL_EXPANSION,
        SHADOW_UPGRADE_CONTEXT.NETWORK_EXPANSION,
        SHADOW_UPGRADE_CONTEXT.CLIENT_WORKSPACE,
      ]),
    );
  });

  it('returns safe empty diagnostics for unknown modes', () => {
    expect(getShadowUpgradePromptsForMode('unknown_mode')).toEqual([]);
    expect(
      getShadowUpgradePromptsForModuleIds(PRODUCT_MODE_IDS.STAFF_APPRAISAL, [
        MODULE_IDS.CLIENT_PORTAL,
        'unknown_module',
      ]).map(({ id }) => id),
    ).toEqual(['staff-client-portal']);
    expect(
      getShadowUpgradePromptsForModuleIds(PRODUCT_MODE_IDS.STAFF_APPRAISAL, [
        'unknown_module',
      ]),
    ).toEqual([]);
    expect(getShadowUpgradePromptComposition('unknown_mode')).toMatchObject({
      isKnownMode: false,
      upgradePaths: [],
      prompts: [],
      promptsByContext: {},
      runtimeComposed: false,
    });
  });

  it('marks permission and billing keys as diagnostic metadata only', () => {
    const composition = getShadowUpgradePromptComposition(PRODUCT_MODE_IDS.STAFF_APPRAISAL);

    composition.prompts.forEach((prompt) => {
      expect(prompt).toMatchObject({
        registrationStatus: SHADOW_UPGRADE_DIAGNOSTIC_STATUS.METADATA_ONLY,
        runtimeComposed: false,
        permissionAuthority: SHADOW_UPGRADE_AUTHORITY.NONE,
        permissionMetadataOnly: true,
        billingAuthority: SHADOW_UPGRADE_AUTHORITY.NONE,
        billingMetadataOnly: true,
      });
      expect(Array.isArray(prompt.permissionDomains)).toBe(true);
    });

    expect(composition.diagnostics).toEqual(
      expect.arrayContaining([
        'Permission domains and billing concepts do not authorize visibility or enforce packaging here.',
      ]),
    );
  });
});
