// src/lib/utils/orderFormMapping.js

export function toFormOrder(o) {
  if (!o) return o;

  // Order number (keep both keys so the form can read either)
  const order_number = o.order_number ?? o.order_no ?? o.external_order_no ?? "";

  // Address lines
  const address = o.property_address ?? o.address ?? "";
  const city = o.city ?? "";
  const state = o.state ?? "";
  const postal_code = o.postal_code ?? o.zip ?? "";

  // Dates (coalesce all synonyms you use across the app)
  const site_visit_at =
    o.site_visit_at ?? o.inspection_date ?? null;

  const review_due_at =
    o.review_due_at ?? o.review_due_date ?? o.due_for_review ?? null;

  const final_due_at =
    o.final_due_at ?? o.client_due_at ?? o.due_to_client ?? o.due_date ?? null;

  // Parties / fees
  const client_id = o.client_id ?? null;
  const manual_client_name =
    o.manual_client_name ?? (client_id ? null : (o.client_name ?? ""));

  const appraiser_id =
    o.appraiser_id ?? o.assigned_to ?? o.reviewer_id ?? null;

  const base_fee = o.base_fee ?? o.fee_amount ?? null;
  const appraiser_fee = o.appraiser_fee ?? null;

  return {
    ...o,

    // numbers
    order_no: order_number,
    order_number,

    // address
    property_address: address,
    address,
    city,
    state,
    postal_code,

    // dates
    site_visit_at,
    review_due_at,
    final_due_at,

    // entities
    client_id,
    manual_client_name,
    appraiser_id,

    // fees
    base_fee,
    appraiser_fee,
  };
}
