export function num(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

export default function normalizeOrder(o = {}) {
  const street = o.address || o.property_address || "";
  const city   = o.city || o.cty || "";
  const state  = o.state || o.st || "";
  const postal = o.postal_code || o.zip || "";

  const cityLine = [city, state].filter(Boolean).join(", ") + (postal ? ` ${postal}` : "");

  return {
    id: o.id ?? o.order_id ?? null,
    orderNo: o.order_no ?? o.order_number ?? o.display_title ?? null,
    status: o.status ?? null,

    clientName: o.client_name ?? o.client?.name ?? o.manual_client_name ?? null,

    street,
    city,
    state,
    postal,
    cityLine,

    propertyType: o.property_type ?? null,

    appraiserName: o.appraiser_name ?? o.assigned_appraiser_name ?? o.appraiser?.full_name ?? null,

    feeAmount:     num(o.fee_amount ?? o.fee ?? o.base_fee),
    baseFee:       num(o.base_fee),
    appraiserFee:  num(o.appraiser_fee),
    splitPct:      num(o.split_pct ?? o.fee_split ?? o.split),

    siteVisitAt:   o.site_visit_at ?? null,
    reviewDueAt:   o.review_due_at ?? o.due_for_review ?? null,
    finalDueAt:    o.final_due_at ?? o.due_date ?? null,

    createdAt:     o.created_at ?? null,
    updatedAt:     o.updated_at ?? null,
  };
}
