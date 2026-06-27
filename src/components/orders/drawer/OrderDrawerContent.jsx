// src/components/orders/view/OrderDrawerContent.jsx
import { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import ActivityLog from "@/components/activity/ActivityLog";
import GoogleMapEmbed, { googleMapsEmbedApiKey } from "@/components/maps/GoogleMapEmbed";
import {
  FalconEmptyState,
  FalconErrorState,
  FalconLoadingState,
  FalconSkeleton,
} from "@/components/state";
import OperationalInputsReadOnly from "@/features/orders/operational-inputs/OperationalInputsReadOnly";
import useOrderOperationalInputs from "@/features/orders/operational-inputs/useOrderOperationalInputs";
import {
  falconInteractionClassNames,
  falconInteractionStyles,
} from "@/lib/ui/falconInteractions";
import { formatPhoneForDisplay } from "@/lib/utils/phoneFormat";

const drawerInteractionStyle = falconInteractionStyles();

/** Pull from the normalized v4 view (no legacy fallback). */
async function fetchViewRow(orderId) {
  const { data, error } = await supabase
    .from("v_orders_frontend_v4")
    .select(
      `
        id,
        order_no:order_number,
        order_number,
        status,
        client_name,
        appraiser_name,
        reviewer_name,
        client_id,
        appraiser_id,
        reviewer_id,
        address,
        city,
        state,
        zip,
        property_type,
        report_type,
        fee_amount,
        base_fee,
        appraiser_fee,
        review_due_at,
        final_due_at,
        due_date,
        created_at,
        property_contact_name,
        property_contact_phone,
        access_notes,
        site_visit_at
      `
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

/** Fetch the base orders row with ALL columns so we don't guess names. */
async function fetchOrdersRow(orderId) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

/** Helpers to resolve contact fields from whatever columns exist on orders. */
function firstTruthy(obj, keys) {
  for (const k of keys) {
    if (obj && k in obj && obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
  }
  return null;
}

function findByKeyIncludes(obj, includeAny = [], excludeAny = []) {
  const entries = Object.entries(obj || {});
  const inc = includeAny.map((s) => String(s).toLowerCase());
  const exc = excludeAny.map((s) => String(s).toLowerCase());

  for (const [k, v] of entries) {
    const lk = String(k).toLowerCase();
    if (inc.some((s) => lk.includes(s)) && !exc.some((s) => lk.includes(s))) {
      const val = v == null ? "" : String(v).trim();
      if (val !== "") return v;
    }
  }
  return null;
}

function findByKeyIncludesAll(obj, mustInclude = [], mustNotInclude = []) {
  const entries = Object.entries(obj || {});
  const inc = mustInclude.map((s) => String(s).toLowerCase());
  const exc = mustNotInclude.map((s) => String(s).toLowerCase());

  for (const [k, v] of entries) {
    const lk = String(k).toLowerCase();
    const val = v == null ? "" : String(v).trim();
    if (!val) continue;

    const hasAll = inc.every((s) => lk.includes(s));
    const hasAnyBlocked = exc.some((s) => lk.includes(s));
    if (hasAll && !hasAnyBlocked) return v;
  }
  return null;
}

function addressLineOf(row) {
  return row?.address_line1 || row?.property_address || row?.address || "";
}

function cityLineOf(row) {
  const city = row?.city || "";
  const state = row?.state || "";
  const zip = row?.postal_code || row?.zip || "";
  return [[city, state].filter(Boolean).join(", "), zip].filter(Boolean).join(" ");
}

function mapsHrefFor(row) {
  const parts = [
    addressLineOf(row),
    row?.city || "",
    row?.state || "",
    row?.postal_code || row?.zip || "",
  ].filter(Boolean);
  const query = parts.join(", ");
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

function compactLine(value) {
  return value == null || String(value).trim() === "" ? null : String(value).trim();
}

function LocationPlaceholder({ addressLine, cityLine, mapsHref }) {
  return (
    <div className="relative min-h-[240px] overflow-hidden rounded-lg border border-dashed border-slate-200 bg-white">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:22px_22px]" aria-hidden="true" />
      <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-slate-50 shadow-sm" aria-hidden="true" />
      <div className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-500 shadow-sm" aria-hidden="true" />
      <div className="absolute inset-x-3 bottom-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-sm">
        <div className="truncate text-xs font-semibold text-slate-800">{addressLine || "Address not set"}</div>
        <div className="mt-1 truncate text-xs text-slate-500">{cityLine || "City not set"}</div>
        {mapsHref && (
          <a
            className={falconInteractionClassNames("quietSecondaryAction", {
              className: "mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold shadow-none",
            })}
            href={mapsHref}
            rel="noreferrer"
            style={drawerInteractionStyle}
            target="_blank"
          >
            Open in Maps
          </a>
        )}
      </div>
    </div>
  );
}

export default function OrderDrawerContent({ orderId, order: rowFromTable }) {
  const id = orderId ?? rowFromTable?.id ?? null;

  const [row, setRow] = useState(rowFromTable || null);
  const [loading, setLoading] = useState(!rowFromTable);
  const [err, setErr] = useState("");
  const {
    inputs: operationalInputs,
    loading: operationalInputsLoading,
    error: operationalInputsError,
  } = useOrderOperationalInputs(id);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!id) return;
      try {
        setLoading(true);
        setErr("");

        const [viewRow, ordersRow] = await Promise.all([
          fetchViewRow(id),
          fetchOrdersRow(id),
        ]);

        if (!mounted) return;

        // Merge: view (pretty) then raw orders (so native fields win)
        setRow({ ...(viewRow || {}), ...(ordersRow || {}) });
      } catch (e) {
        if (mounted) setErr(e?.message || "Failed to load order");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id, rowFromTable]);

  if (!id) {
    return (
      <FalconEmptyState
        className="rounded-xl px-4 py-6 shadow-none"
        title="No order selected."
        description="Expand an order row to review supporting context."
      />
    );
  }
  if (loading) {
    return (
      <FalconLoadingState
        className="rounded-xl border-slate-200 bg-white p-4 shadow-none"
        title="Loading order details"
        description="Loading order details..."
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <FalconSkeleton height="0.75rem" width="6rem" />
            <FalconSkeleton height="1.25rem" width="12rem" />
          </div>
          <FalconSkeleton height="2rem" shape="pill" width="7rem" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FalconSkeleton height="8rem" />
          <FalconSkeleton height="8rem" />
        </div>
      </FalconLoadingState>
    );
  }
  if (err) {
    return (
      <FalconErrorState
        className="rounded-xl px-4 py-3 shadow-none"
        title="Order details could not load."
        description={err}
      />
    );
  }

  // Client contact selection is intentionally best-effort until Falcon has a dedicated client/order POC model.
  const clientContactName =
    firstTruthy(row, [
      "client_contact_name",
      "client_contact",
      "loan_officer_name",
      "loan_officer",
      "borrower_name",
    ]) ?? row?.client_name ?? null;
  const clientContactPhone = formatPhoneForDisplay(
    firstTruthy(row, [
      "client_contact_phone",
      "client_phone",
      "loan_officer_phone",
      "borrower_phone",
    ]) ?? findByKeyIncludesAll(row, ["client", "phone"])
  );
  const clientContactEmail =
    firstTruthy(row, [
      "client_contact_email",
      "client_email",
      "loan_officer_email",
      "borrower_email",
    ]) ?? findByKeyIncludesAll(row, ["client", "email"]);
  const hasClientContact = Boolean(
    compactLine(clientContactName) || compactLine(clientContactPhone) || compactLine(clientContactEmail)
  );

  // ---- Resolve Property Contact from whatever columns exist on orders ----
  const contactName =
    firstTruthy(row, [
      "property_entry_contact",
      "entry_contact",
      "contact_name",
      "property_contact_name",
    ]) ??
    findByKeyIncludes(row, ["contact"], ["phone", "email"]) ??
    "—";

  let rawPhone =
    firstTruthy(row, [
      "contact_phone",
      "property_contact_phone",
      "phone",
      "phone_number",
      "primary_phone",
    ]) ??
    // require BOTH terms to appear in the key name
    findByKeyIncludesAll(row, ["phone", "contact"]) ??
    findByKeyIncludesAll(row, ["phone", "site"]) ??
    findByKeyIncludesAll(row, ["phone", "access"]) ??
    "";

  rawPhone = formatPhoneForDisplay(rawPhone);
  const telHref =
    rawPhone && /\d/.test(rawPhone)
      ? `tel:${rawPhone.replace(/[^\d+]/g, "")}`
      : null;

  const addressLine = addressLineOf(row);
  const cityLine = cityLineOf(row);
  const hasLocation = Boolean(addressLine || cityLine);
  const mapsHref = mapsHrefFor(row);
  const canRenderEmbeddedMap = Boolean(hasLocation && googleMapsEmbedApiKey());

  return (
    <div className="space-y-3">
      <OperationalInputsReadOnly
        inputs={operationalInputs}
        loading={operationalInputsLoading}
        error={operationalInputsError}
        compact
      />

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 xl:col-span-7">
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2.5">
              <div>
                <div className="text-sm font-semibold text-slate-900">Activity</div>
                <div className="text-xs text-slate-500">Recent timeline and notes</div>
              </div>
            </div>
            <div className="p-2.5">
              <ActivityLog orderId={id} order={row} showComposer height={340} className="text-sm" />
            </div>
          </div>
        </div>

        <div className="col-span-12 grid gap-3 md:grid-cols-2 xl:col-span-5 xl:grid-cols-1">
          <div className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <div className="mb-3">
              <div className="text-sm font-semibold text-slate-900">Order Contacts</div>
              <div className="mt-0.5 text-xs text-slate-500">Client and site contact context</div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Client Contact</div>
                {hasClientContact ? (
                  <div className="space-y-1">
                    <ContactLine label="Name" value={clientContactName} />
                    <ContactLine label="Phone" value={clientContactPhone} />
                    <ContactLine label="Email" value={clientContactEmail} />
                  </div>
                ) : (
                  <div className="text-xs font-medium text-slate-400">Not set</div>
                )}
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Property Contact</div>
                <div className="space-y-1">
                  <ContactLine label="Name" value={contactName} />
                  <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-2">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Phone</div>
                    <div className="truncate text-xs font-medium text-slate-700">
                      {telHref ? (
                        <a
                          className="underline underline-offset-2 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                          href={telHref}
                        >
                          {rawPhone}
                        </a>
                      ) : (
                        rawPhone || "—"
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {hasLocation && (
            <div className="min-w-0 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 shadow-sm">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">Location Preview</div>
                  <div className="mt-0.5 text-xs text-slate-500">Subject property context</div>
                </div>
                {mapsHref ? (
                  <a
                    className={falconInteractionClassNames("quietSecondaryAction", {
                      className: "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] shadow-none",
                    })}
                    href={mapsHref}
                    rel="noreferrer"
                    style={drawerInteractionStyle}
                    target="_blank"
                  >
                    Open in Maps
                  </a>
                ) : (
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Preview
                  </span>
                )}
              </div>
              {canRenderEmbeddedMap ? (
                <GoogleMapEmbed
                  addressLine1={addressLine}
                  city={row?.city}
                  state={row?.state}
                  zip={row?.postal_code || row?.zip}
                  height={260}
                  zoom={13}
                />
              ) : (
                <LocationPlaceholder addressLine={addressLine} cityLine={cityLine} mapsHref={mapsHref} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactLine({ label, value }) {
  const display = compactLine(value);
  return (
    <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className={`min-w-0 truncate text-xs font-medium ${display ? "text-slate-700" : "text-slate-400"}`}>
        {display || "Not set"}
      </div>
    </div>
  );
}









