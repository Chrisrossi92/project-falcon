// src/lib/mappers/orderMapper.js
import { normalizeOrderStatus } from "@/lib/constants/orderStatus";

/**
 * @typedef {Object} OrderFrontend
 * @property {string|null} id
 * @property {string|null} order_number        Canonical order number (falls back to order_no or id prefix)
 * @property {string|null} order_no            Alias of order_number for legacy callers
 * @property {string|null} order_id            Alias of id for callers that still expect order_id
 * @property {string|null} status              Raw status from backend
 * @property {string|null} status_normalized   Normalized status (snake-case uppercase)
 * @property {string|null} client_id
 * @property {string|null} client_name
 * @property {string|null} amc_id
 * @property {string|null} amc_name
 * @property {string|null} appraiser_id
 * @property {string|null} appraiser_name
 * @property {string|null} reviewer_id
 * @property {string|null} reviewer_name
 * @property {string|null} assigned_to
 * @property {string|null} address_line1
 * @property {string|null} address             Alias of address_line1
 * @property {string|null} city
 * @property {string|null} state
 * @property {string|null} postal_code
 * @property {string|null} zip                 Alias of postal_code
 * @property {string|null} property_type
 * @property {string|null} report_type
 * @property {number|null} fee_amount
 * @property {number|null} base_fee
 * @property {number|null} appraiser_fee
 * @property {string|null} review_due_at
 * @property {string|null} final_due_at
 * @property {string|null} due_date
 * @property {string|null} site_visit_at
 * @property {string|null} created_at
 * @property {string|null} updated_at
 * @property {string|null} property_contact_name
 * @property {string|null} property_contact_phone
 * @property {string|null} entry_contact_name
 * @property {string|null} entry_contact_phone
 * @property {string|null} access_notes
 * @property {string|null} notes
 */

const emptyOrder = {
  id: null,
  order_id: null,
  order_number: null,
  order_no: null,
  status: null,
  status_normalized: null,
  client_id: null,
  client_name: null,
  amc_id: null,
  amc_name: null,
  appraiser_id: null,
  appraiser_name: null,
  reviewer_id: null,
  reviewer_name: null,
  managing_amc_id: null,
  split_pct: null,
  assigned_to: null,
  address_line1: null,
  address: null,
  city: null,
  state: null,
  postal_code: null,
  zip: null,
  property_type: null,
  report_type: null,
  fee_amount: null,
  base_fee: null,
  appraiser_fee: null,
  review_due_at: null,
  final_due_at: null,
  due_date: null,
  site_visit_at: null,
  created_at: null,
  updated_at: null,
  property_contact_name: null,
  property_contact_phone: null,
  entry_contact_name: null,
  entry_contact_phone: null,
  access_notes: null,
  notes: null,
};

/**
 * Map a raw Supabase row (v_orders_frontend_v4) into the canonical OrderFrontend shape.
 * @param {object} row
 * @returns {OrderFrontend}
 */
export function mapOrderRow(row = {}) {
  if (!row || typeof row !== "object") return { ...emptyOrder };

  const id = row.id ?? row.order_id ?? null;
  const orderId = row.order_id ?? row.id ?? null;
  const orderNumber =
    row.order_number ??
    row.order_no ??
    (id ? String(id).slice(0, 8) : null);
  const postalCode =
    row.postal_code ??
    row.zip ??
    row.zip_code ??
    row.property_zip ??
    null;
  const addressLine1 = row.address_line1 ?? row.address ?? row.property_address ?? null;
  const city = row.city ?? row.property_city ?? null;
  const state = row.state ?? row.property_state ?? null;

  const status = row.status ?? null;
  const statusNormalized = normalizeOrderStatus(status);

  return {
    ...emptyOrder,
    id,
    order_id: orderId,
    order_number: orderNumber,
    order_no: orderNumber,
    status,
    status_normalized: statusNormalized,
    client_id: row.client_id ?? null,
    client_name:
      row.client_name ??
      row.client ??
      row.manual_client_name ??
      null,
    amc_id: row.amc_id ?? null,
    amc_name: row.amc_name ?? null,
    managing_amc_id: row.managing_amc_id ?? null,
    appraiser_id: row.appraiser_id || null,
    appraiser_name: row.appraiser_name || null,
    reviewer_id: row.reviewer_id || null,
    reviewer_name: row.reviewer_name || null,
    assigned_to: row.assigned_to ?? row.appraiser_id ?? null,
    address_line1: addressLine1,
    address: addressLine1,
    city,
    state,
    postal_code: postalCode,
    zip: postalCode,
    property_type: row.property_type ?? null,
    report_type: row.report_type ?? null,
    fee_amount: row.fee_amount ?? null,
    base_fee: row.base_fee ?? row.fee_amount ?? null,
    appraiser_fee: row.appraiser_fee ?? null,
    split_pct: row.split_pct ?? row.appraiser_split ?? null,
    review_due_at:
      row.review_due_at ??
      row.review_due_date ??
      row.review_due ??
      row.review_due_by ??
      row.date_review_due ??
      null,
    final_due_at:
      row.final_due_at ??
      row.final_due_date ??
      row.due_date ??
      row.due_to_client ??
      null,
    due_date: row.due_date ?? row.final_due_at ?? null,
    site_visit_at:
      row.site_visit_at ??
      row.site_visit_date ??
      row.inspection_date ??
      row.site_visit_date ??
      null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    property_contact_name: row.property_contact_name ?? null,
    property_contact_phone: row.property_contact_phone ?? null,
    entry_contact_name: row.entry_contact_name ?? null,
    entry_contact_phone: row.entry_contact_phone ?? null,
    access_notes: row.access_notes ?? null,
    notes: row.notes ?? null,
  };
}

export function mapOrderRows(rows = []) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => mapOrderRow(r));
}
