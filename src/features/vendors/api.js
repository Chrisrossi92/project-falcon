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

export async function listVendorAssignmentCandidates(orderId) {
  const data = await rpc("rpc_vendor_assignment_candidates", {
    p_order_id: orderId,
  });
  return Array.isArray(data) ? data : [];
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
