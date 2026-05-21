import { describe, expect, it } from 'vitest';

import { MODULE_IDS } from '../../modules/moduleRegistry.js';
import {
  PRODUCT_MODE_METADATA,
  PRODUCT_MODE_METADATA_LIST,
} from '../productModeMetadata.js';
import {
  PRODUCT_MODE_IDS,
  PRODUCT_MODE_LABELS,
  PRODUCT_MODE_ORDER,
  isProductModeId,
} from '../productModes.js';

describe('product mode metadata', () => {
  it('defines all canonical product modes in stable order', () => {
    expect(PRODUCT_MODE_ORDER).toEqual([
      PRODUCT_MODE_IDS.STAFF_APPRAISAL,
      PRODUCT_MODE_IDS.AMC_OPERATIONS,
      PRODUCT_MODE_IDS.VENDOR_PORTAL,
      PRODUCT_MODE_IDS.CLIENT_PORTAL,
      PRODUCT_MODE_IDS.HYBRID_ECOSYSTEM,
    ]);

    expect(PRODUCT_MODE_METADATA_LIST.map((mode) => mode.id)).toEqual(PRODUCT_MODE_ORDER);
  });

  it('exposes complete metadata for each canonical mode', () => {
    PRODUCT_MODE_ORDER.forEach((modeId) => {
      const metadata = PRODUCT_MODE_METADATA[modeId];

      expect(metadata).toMatchObject({
        id: modeId,
        label: PRODUCT_MODE_LABELS[modeId],
      });
      expect(metadata.includedModules).toContain(MODULE_IDS.CORE_WORKSPACE);
      expect(metadata.includedModules).toContain(MODULE_IDS.DASHBOARD);
      expect(metadata.primaryDailyQuestion).toEqual(expect.any(String));
      expect(metadata.dashboardName).toEqual(expect.any(String));
      expect(metadata.futureNavShape.length).toBeGreaterThan(0);
      expect(metadata.futureDashboardSections.length).toBeGreaterThan(0);
    });
  });

  it('keeps Client Portal request/status/document focused', () => {
    const clientMode = PRODUCT_MODE_METADATA[PRODUCT_MODE_IDS.CLIENT_PORTAL];

    expect(clientMode.includedModules).toEqual(
      expect.arrayContaining([
        MODULE_IDS.CLIENT_PORTAL,
        MODULE_IDS.REPORTS,
        MODULE_IDS.ORDERS,
      ]),
    );
    expect(clientMode.hiddenByDefaultModules).toEqual(
      expect.arrayContaining([
        MODULE_IDS.CLIENTS,
        MODULE_IDS.ASSIGNMENTS,
        MODULE_IDS.REVIEWS,
        MODULE_IDS.AMC_OPERATIONS,
        MODULE_IDS.VENDOR_PORTAL,
      ]),
    );
  });

  it('identifies known and unknown product mode ids safely', () => {
    expect(isProductModeId(PRODUCT_MODE_IDS.STAFF_APPRAISAL)).toBe(true);
    expect(isProductModeId('unknown_mode')).toBe(false);
    expect(isProductModeId(null)).toBe(false);
  });
});
