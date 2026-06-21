import supabase from "@/lib/supabaseClient";

function firstRow(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

function normalizeVendorDirectoryRow(row = {}) {
  const summary = row.service_area_summary || {};

  return {
    ...row,
    id: row.vendor_profile_id,
    service_area_summary: {
      active_count: Number(summary.active_count ?? 0),
      states: Array.isArray(summary.states) ? summary.states : [],
      counties: Array.isArray(summary.counties) ? summary.counties : [],
      zips: Array.isArray(summary.zips) ? summary.zips : [],
      markets: Array.isArray(summary.markets) ? summary.markets : [],
      product_types: Array.isArray(summary.product_types) ? summary.product_types : [],
    },
    product_eligibility: row.product_eligibility || {},
    tags: Array.isArray(row.tags) ? row.tags : [],
  };
}

function normalizeVendorProfileDetail(row = {}) {
  return {
    ...row,
    id: row.vendor_profile_id,
    primary_address: row.primary_address || {},
    capabilities: row.capabilities || {},
    product_eligibility: row.product_eligibility || {},
    tags: Array.isArray(row.tags) ? row.tags : [],
  };
}

function normalizeVendorContact(row = {}) {
  return {
    ...row,
    id: row.vendor_contact_id,
    is_primary: row.is_primary === true,
    receives_assignment_notifications: row.receives_assignment_notifications === true,
  };
}

function normalizeVendorServiceArea(row = {}) {
  return {
    ...row,
    id: row.vendor_service_area_id,
  };
}

function normalizeVendorCoverage(payload = {}) {
  const data = payload && typeof payload === "object" ? payload : {};
  const counties = Array.isArray(data.counties) ? data.counties : [];

  return {
    states: Array.isArray(data.states) ? data.states.filter(Boolean) : [],
    counties: counties
      .filter((county) => county && typeof county === "object")
      .map((county) => ({
        state_code: county.state_code || county.stateCode || "",
        county_name: county.county_name || county.countyName || "",
      }))
      .filter((county) => county.state_code && county.county_name),
    propertyTypes: Array.isArray(data.property_types)
      ? data.property_types.filter(Boolean)
      : Array.isArray(data.propertyTypes)
        ? data.propertyTypes.filter(Boolean)
        : [],
    assignmentTypes: Array.isArray(data.assignment_types)
      ? data.assignment_types.filter(Boolean)
      : Array.isArray(data.assignmentTypes)
        ? data.assignmentTypes.filter(Boolean)
        : [],
  };
}

function normalizeMatchingVendor(row = {}) {
  return {
    ...row,
    vendorProfileId: row.vendor_profile_id || row.vendorProfileId || null,
    vendorCompanyId: row.vendor_company_id || row.vendorCompanyId || row.company_id || null,
    vendorCompanyName: row.vendor_company_name || row.vendorCompanyName || row.company_name || "",
    matchedState: row.matched_state || row.matchedState || "",
    matchedCounty: row.matched_county || row.matchedCounty || "",
    matchedPropertyType: row.matched_property_type || row.matchedPropertyType || "",
    matchedAssignmentType: row.matched_assignment_type || row.matchedAssignmentType || "",
  };
}

function serializeVendorCoverage(coverage = {}) {
  const data = coverage && typeof coverage === "object" ? coverage : {};
  const counties = Array.isArray(data.counties) ? data.counties : [];

  return {
    states: Array.isArray(data.states) ? data.states : [],
    counties: counties
      .filter((county) => county && typeof county === "object")
      .map((county) => ({
        state_code: county.state_code || county.stateCode || "",
        county_name: county.county_name || county.countyName || "",
      })),
    propertyTypes: Array.isArray(data.propertyTypes)
      ? data.propertyTypes
      : Array.isArray(data.property_types)
        ? data.property_types
        : [],
    assignmentTypes: Array.isArray(data.assignmentTypes)
      ? data.assignmentTypes
      : Array.isArray(data.assignment_types)
        ? data.assignment_types
        : [],
  };
}

export async function listVendorDirectory({ status = null, query = null } = {}) {
  const data = await rpc("rpc_vendor_directory_list", {
    p_status: status || null,
    p_query: query || null,
  });
  return Array.isArray(data) ? data.map(normalizeVendorDirectoryRow) : [];
}

export async function getVendorProfileDetail(vendorProfileId) {
  const row = firstRow(await rpc("rpc_vendor_profile_detail", {
    p_vendor_profile_id: vendorProfileId,
  }));
  return row ? normalizeVendorProfileDetail(row) : null;
}

export async function getVendorProfileContacts(vendorProfileId) {
  const data = await rpc("rpc_vendor_profile_contacts", {
    p_vendor_profile_id: vendorProfileId,
  });
  return Array.isArray(data) ? data.map(normalizeVendorContact) : [];
}

export async function getVendorProfileServiceAreas(vendorProfileId) {
  const data = await rpc("rpc_vendor_profile_service_areas", {
    p_vendor_profile_id: vendorProfileId,
  });
  return Array.isArray(data) ? data.map(normalizeVendorServiceArea) : [];
}

export async function getVendorCoverage(vendorProfileId) {
  const data = await rpc("rpc_get_vendor_coverage", {
    p_vendor_profile_id: vendorProfileId,
  });
  return normalizeVendorCoverage(data);
}

export async function saveVendorCoverage(vendorProfileId, coverage = {}) {
  const payload = serializeVendorCoverage(coverage);
  const data = await rpc("rpc_save_vendor_coverage", {
    p_vendor_profile_id: vendorProfileId,
    p_states: payload.states,
    p_counties: payload.counties,
    p_property_types: payload.propertyTypes,
    p_assignment_types: payload.assignmentTypes,
  });
  return normalizeVendorCoverage(data);
}

export async function listVendorAssignmentCandidates(orderId) {
  const data = await rpc("rpc_vendor_assignment_candidates", {
    p_order_id: orderId,
  });
  return Array.isArray(data) ? data : [];
}

export async function getMatchingVendorsForOrder(orderId) {
  const data = await rpc("rpc_get_matching_vendors_for_order", {
    p_order_id: orderId,
  });
  return Array.isArray(data) ? data.map(normalizeMatchingVendor) : [];
}

export async function createVendorProfile(payload) {
  return firstRow(await rpc("rpc_vendor_profile_create", {
    p_payload: payload || {},
  }));
}

export async function updateVendorProfile(vendorProfileId, patch) {
  return rpc("rpc_vendor_profile_update", {
    p_vendor_profile_id: vendorProfileId,
    p_patch: patch || {},
  });
}

export async function createVendorContact(vendorProfileId, payload) {
  return rpc("rpc_vendor_contact_create", {
    p_vendor_profile_id: vendorProfileId,
    p_payload: payload || {},
  });
}

export async function updateVendorContact(contactId, patch) {
  return rpc("rpc_vendor_contact_update", {
    p_contact_id: contactId,
    p_patch: patch || {},
  });
}

export async function createVendorServiceArea(vendorProfileId, payload) {
  return rpc("rpc_vendor_service_area_create", {
    p_vendor_profile_id: vendorProfileId,
    p_payload: payload || {},
  });
}

export async function updateVendorServiceArea(serviceAreaId, patch) {
  return rpc("rpc_vendor_service_area_update", {
    p_service_area_id: serviceAreaId,
    p_patch: patch || {},
  });
}

export async function listVendorProfileUpdateRequests({ status = "pending" } = {}) {
  const data = await rpc("rpc_amc_vendor_profile_update_requests", {
    p_status: status || null,
  });
  return data?.ok === true && Array.isArray(data.requests) ? data.requests : [];
}

export async function reviewVendorProfileUpdateRequest(requestKey, payload = {}) {
  return rpc("rpc_amc_review_vendor_profile_update_request", {
    p_request_key: requestKey,
    p_payload: payload || {},
  });
}

export async function listAmcVendorInvoices({ status = "invoice_received" } = {}) {
  const data = await rpc("rpc_amc_vendor_invoices", {
    p_status: status || null,
  });
  return data?.ok === true && Array.isArray(data.items) ? data.items : [];
}

export async function reviewAmcVendorInvoice(invoiceKey, payload = {}) {
  return rpc("rpc_amc_review_vendor_invoice", {
    p_invoice_key: invoiceKey,
    p_payload: payload || {},
  });
}

export async function listAmcVendorPaymentLedger({ status = "approved" } = {}) {
  const data = await rpc("rpc_amc_vendor_payment_ledger", {
    p_status: status || null,
  });
  return data?.ok === true && Array.isArray(data.items) ? data.items : [];
}

export async function scheduleAmcVendorPayment(invoiceKey, payload = {}) {
  return rpc("rpc_amc_schedule_vendor_payment", {
    p_invoice_key: invoiceKey,
    p_payload: payload || {},
  });
}

export async function markAmcVendorPaymentPaid(paymentKey, payload = {}) {
  return rpc("rpc_amc_mark_vendor_payment_paid", {
    p_payment_key: paymentKey,
    p_payload: payload || {},
  });
}
