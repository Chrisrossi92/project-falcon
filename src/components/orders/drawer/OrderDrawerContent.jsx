// src/components/orders/view/OrderDrawerContent.jsx
import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import ActivityLog from "@/components/activity/ActivityLog";
import OrderDatesPanel from "@/components/orders/view/OrderDatesPanel";
import AppraiserDrawerSummary from "@/components/orders/view/AppraiserDrawerSummary";

/** Pull from the normalized v3 view (no legacy fallback). */
async function fetchViewRow(orderId) {
  const { data, error } = await supabase
    .from("v_orders_frontend_v3")
    .select(
      `
        id,
        order_no:order_number,
        order_number,
        status,
        client_name,
        appraiser_name,
        client_id,
        appraiser_id,
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

// Helpers to resolve contact fields from whatever the table actually has
function firstTruthy(obj, keys) {
  for (const k of keys) {
    if (k in obj && obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
  }
  return null;
}

function findByPattern(obj, patterns) {
  const entries = Object.entries(obj || {});
  for (const [k, v] of entries) {
    const lk = k.toLowerCase();
    if (patterns.some((re) => re.test(lk))) {
      const val = v == null ? "" : String(v).trim();
      if (val !== "") return v;
    }
  }
  return null;
}

export default function OrderDrawerContent({ orderId, order: rowFromTable }) {
  const id = orderId ?? rowFromTable?.id ?? null;

  const [row, setRow] = useState(rowFromTable || null);
  const [loading, setLoading] = useState(!rowFromTable);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) return;
      try {
        setLoading(true);
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

  async function handleSetAppointment(iso) {
    if (!id) return;
    const { error } = await supabase
      .from("orders")
      .update({ site_visit_at: iso })
      .eq("id", id);
    if (error) {
      console.error(error);
      return;
    }
    setRow((r) => ({ ...(r || {}), site_visit_at: iso })); // instant UI
  }

  if (!id) return <div className="p-3 text-sm text-muted-foreground">No order selected.</div>;
  if (loading) return <div className="p-3 text-sm text-muted-foreground">Loading…</div>;
  if (err) return <div className="p-3 text-sm text-rose-700 bg-rose-50 border rounded">{err}</div>;

  const orderNumber =
    row?.order_no || row?.order_number || (row?.id ? row.id.slice(0, 8) : "");

// ---- Resolve Property Contact from whatever columns exist on orders ----
function firstTruthy(obj, keys) {
  for (const k of keys) {
    if (k in obj && obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
  }
  return null;
}

function findByKeyIncludes(obj, includeAny = [], excludeAny = []) {
  const entries = Object.entries(obj || {});
  const inc = includeAny.map((s) => s.toLowerCase());
  const exc = excludeAny.map((s) => s.toLowerCase());

  for (const [k, v] of entries) {
    const lk = k.toLowerCase();
    if (inc.some((s) => lk.includes(s)) && !exc.some((s) => lk.includes(s))) {
      const val = v == null ? "" : String(v).trim();
      if (val !== "") return v;
    }
  }
  return null;
}

// Prefer explicit/known keys; otherwise scan keys by includes()
// Prefer explicit/known keys; otherwise scan keys by includes()
const contactName = (
  firstTruthy(row, [
    "property_entry_contact",
    "entry_contact",
    "contact_name",
    "property_contact_name",
  ]) ??
  findByKeyIncludes(row, ["contact"], ["phone", "email"])
) || "â€”";

let rawPhone = (
  firstTruthy(row, [
    "contact_phone",
    "property_contact_phone",
    "phone",
    "phone_number",
    "primary_phone",
  ]) ??
  // now require BOTH terms to appear in the key name
  findByKeyIncludesAll(row, ["phone", "contact"]) ??
  findByKeyIncludesAll(row, ["phone", "site"]) ??
  findByKeyIncludesAll(row, ["phone", "access"])
) || "";

rawPhone = rawPhone == null ? "" : String(rawPhone).trim();
const telHref =
  rawPhone && /\d/.test(rawPhone)
    ? `tel:${rawPhone.replace(/[^\d+]/g, "")}`
    : null;


    function findByKeyIncludesAll(obj, mustInclude = [], mustNotInclude = []) {
  const entries = Object.entries(obj || {});
  const inc = mustInclude.map((s) => s.toLowerCase());
  const exc = mustNotInclude.map((s) => s.toLowerCase());

  for (const [k, v] of entries) {
    const lk = k.toLowerCase();
    const val = v == null ? "" : String(v).trim();
    if (!val) continue;

    const hasAll = inc.every((s) => lk.includes(s));
    const hasAnyBlocked = exc.some((s) => lk.includes(s));
    if (hasAll && !hasAnyBlocked) return v;
  }
  return null;
}



  return (
    <div className="grid grid-cols-12 gap-3">
      {/* LEFT: Activity */}
      <div className="col-span-12 lg:col-span-8 space-y-3">
        <div className="rounded border bg-white flex flex-col">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="text-sm font-medium">Order {orderNumber || "—"}</div>
          </div>
          <div className="p-3 min-h-[700px] flex-1 flex flex-col">
            <ActivityLog orderId={id} showComposer fill className="h-full flex-1" />
          </div>
        </div>
      </div>

      {/* RIGHT: Property Contact, Dates, Map */}
      <div className="col-span-12 lg:col-span-4 space-y-3">
        {/* Property Contact */}
        <div className="rounded border bg-white">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="text-sm font-medium">Property Contact</div>
          </div>
          <div className="p-3 text-sm">
            <div className="text-xs text-muted-foreground">Name</div>
            <div>{contactName || "â€”"}</div>

            <div className="mt-2 text-xs text-muted-foreground">Phone</div>
            <div>
              {telHref ? (
                <a className="underline underline-offset-2" href={telHref}>
                  {rawPhone}
                </a>
              ) : (
                rawPhone || "â€”"
              )}
            </div>
          </div>
        </div>

        {/* Dates (inline editable site visit) */}
        <div className="rounded border bg-white">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="text-sm font-medium">Dates</div>
          </div>
          <div className="p-3">
            <OrderDatesPanel
              order={row}     // includes site_visit_at from orders
              hideTitle
              editable
              onSetAppointment={handleSetAppointment}
            />
          </div>
        </div>

        {/* Map */}
        <div className="rounded border bg-white">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="text-sm font-medium">Map</div>
          </div>
          <div className="p-3">
            <AppraiserDrawerSummary order={row} height={260} />
          </div>
        </div>
      </div>
    </div>
  );
}



































