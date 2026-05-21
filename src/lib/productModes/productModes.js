export const PRODUCT_MODE_IDS = Object.freeze({
  STAFF_APPRAISAL: 'staff_appraisal',
  AMC_OPERATIONS: 'amc_operations',
  VENDOR_PORTAL: 'vendor_portal',
  CLIENT_PORTAL: 'client_portal',
  HYBRID_ECOSYSTEM: 'hybrid_ecosystem',
});

export const PRODUCT_MODE_LABELS = Object.freeze({
  [PRODUCT_MODE_IDS.STAFF_APPRAISAL]: 'Staff Appraisal',
  [PRODUCT_MODE_IDS.AMC_OPERATIONS]: 'AMC Operations',
  [PRODUCT_MODE_IDS.VENDOR_PORTAL]: 'Vendor Portal',
  [PRODUCT_MODE_IDS.CLIENT_PORTAL]: 'Client Portal',
  [PRODUCT_MODE_IDS.HYBRID_ECOSYSTEM]: 'Hybrid / Ecosystem',
});

export const PRODUCT_MODE_ORDER = Object.freeze([
  PRODUCT_MODE_IDS.STAFF_APPRAISAL,
  PRODUCT_MODE_IDS.AMC_OPERATIONS,
  PRODUCT_MODE_IDS.VENDOR_PORTAL,
  PRODUCT_MODE_IDS.CLIENT_PORTAL,
  PRODUCT_MODE_IDS.HYBRID_ECOSYSTEM,
]);

export const isProductModeId = (modeId) => PRODUCT_MODE_ORDER.includes(modeId);
