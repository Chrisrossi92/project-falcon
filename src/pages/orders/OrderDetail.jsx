import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import supabase from "@/lib/supabaseClient";

/* ---------- helpers ---------- */
function isUuid(v) {
  return typeof v === "string" &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);
}
function isOrderNo(v) {
  // Accept YYYY### (e.g., 2025103) and legacy formats like T-1001
  return typeof v === "string" && (/^\d{7}$/.test(v) || /^[A-Za-z]-?\d+$/i.test(v));
}
const fmtDate = (s) => (s ? new Date(s).toLocaleDateString() : "—");
const fmtDateTime = (s) => (s ? new Date(s).toLocaleString() : "—");
const money = (n) => (n == null ? "—" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD" }));

export default function OrderDetail() {
  const nav = useNavigate();
  // Accept either :id or :ref (or :orderId) safely
  const params = useParams();
  let ref = (params.ref ?? params.id ?? params.orderId ?? "").trim().replace(/=+$/, "");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [order, setOrder] = useState(null);
  const [clientName, setClientName] = useState("—");
  const [appraiserName, setAppraiserName] = useState("—");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        if (!ref) throw new Error("Missing order reference.");

        // 1) fetch order by id or order_number
        let query = supabase
          .from("orders")
          .select(
            [
              "id",
              "order_number",
              "status",
              "base_fee",
              "appraiser_fee",
              "split_pct",
              "property_type",
              "report_type",
              "address",
              "property_address",
              "city",
              "state",
              "postal_code",
              "client_id",
              "appraiser_id",
              "site_visit_at",
              "review_due_at",
              "final_due_at",
              "notes",
              "created_at",
              "updated_at",
            ].join(",")
          )
          .limit(1);

        if (isUuid(ref)) query = query.eq("id", ref);
        else if (isOrderNo(ref)) query = query.eq("order_number", ref);
        else throw new Error(`Invalid order reference: ${ref}`);

        const { data: rows, error } = await query;
        if (error) throw error;
        const row = rows?.[0] || null;
        if (!row) throw new Error("Order not found.");
        if (!active) return;

        setOrder(row);

        // 2) resolve names
        if (row.client_id) {
          const { data: c } = await supabase
            .from("clients")
            .select("name")
            .eq("id", row.client_id)
            .maybeSingle();
          if (active && c?.name) setClientName(c.name);
        }
        if (row.appraiser_id) {
          const { data: u } = await supabase
            .from("users")
            .select("full_name, display_name, name")
            .eq("id", row.appraiser_id)
            .maybeSingle();
          if (active && u) setAppraiserName(u.full_name || u.display_name || u.name || "—");
        }
      } catch (e) {
        if (active) {
          setErr(e?.message || String(e));
          setOrder(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [ref]);

  /* ---------- UI ---------- */
  if (loading) return null;

  if (err) {
    return (
      <div className="p-4 text-sm text-red-600 space-y-3">
        <div>Failed to load order: {err}</div>
        <button className="px-3 py-1.5 border rounded text-sm" onClick={() => nav("/orders")}>
          ← Back to Orders
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4 text-sm text-amber-700 space-y-3">
        <div>Order not found.</div>
        <button className="px-3 py-1.5 border rounded text-sm" onClick={() => nav("/orders")}>
          ← Back to Orders
        </button>
      </div>
    );
  }

  const titleNo = order.order_number || String(order.id).slice(0, 8);
  const addr = order.property_address || order.address || "—";
  const cityLine =
    [order.city, order.state].filter(Boolean).join(", ") +
    (order.postal_code ? ` ${order.postal_code}` : "");

  function copyNo() {
    navigator.clipboard?.writeText(titleNo).catch(() => {});
  }

  return (
    <div className="p-4 space-y-4">
      {/* HEADER (matches New Order spacing) */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold flex items-center gap-2">
              Order {titleNo}
              <button
                type="button"
                onClick={copyNo}
                title="Copy order number"
                className="text-xs rounded border px-1.5 py-0.5 text-gray-500 hover:bg-gray-50"
              >
                Copy
              </button>
            </div>
            <div className="text-xs text-gray-500">
              Status: <span className="font-medium text-gray-700">{order.status || "—"}</span> • Created{" "}
              {fmtDateTime(order.created_at)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/orders" className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">← Back</Link>
            <Link to={`/orders/${order.id}/edit`} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">Edit</Link>
          </div>
        </div>
      </div>

      {/* GRID — replicate New Order structure */}
      <div className="grid grid-cols-12 gap-4">

        {/* CLIENT (col-6) */}
        <div className="col-span-12 md:col-span-6">
          <div className="rounded-md bg-white p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Client</div>
            <div className="text-sm text-gray-800">{clientName}</div>
          </div>
        </div>

        {/* APPRAISER (col-6) with fees like the form */}
        <div className="col-span-12 md:col-span-6">
          <div className="rounded-md bg-white p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Appraiser</div>
            <div className="text-sm text-gray-800 mb-2">{appraiserName}</div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-500 mb-1">Split %</div>
                <div className="text-gray-800">{order.split_pct != null ? `${order.split_pct}` : "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Base Fee</div>
                <div className="text-gray-800">{money(order.base_fee)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Appraiser Fee</div>
                <div className="text-gray-800">{money(order.appraiser_fee)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* PROPERTY (col-7) */}
        <div className="col-span-12 md:col-span-7">
          <div className="rounded-md bg-white p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Property</div>
            <div className="mb-2">
              <div className="text-xs text-gray-500">Address</div>
              <div className="text-sm text-gray-800">{addr}</div>
              <div className="text-xs text-gray-500">{cityLine || "—"}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Property Type</div>
                <div className="text-sm text-gray-800">{order.property_type || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Report Type</div>
                <div className="text-sm text-gray-800">{order.report_type || "—"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* DATES (col-5) */}
        <div className="col-span-12 md:col-span-5">
          <div className="rounded-md bg-white p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Dates</div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between">
                <div className="text-gray-500">Site Visit</div>
                <div className="text-gray-800">{fmtDateTime(order.site_visit_at)}</div>
              </div>
              <div className="flex justify-between">
                <div className="text-gray-500">Review Due</div>
                <div className="text-gray-800">{fmtDate(order.review_due_at)}</div>
              </div>
              <div className="flex justify-between">
                <div className="text-gray-500">Final Due</div>
                <div className="text-gray-800">{fmtDate(order.final_due_at)}</div>
              </div>
              <div className="flex justify-between">
                <div className="text-gray-500">Updated</div>
                <div className="text-gray-800">{fmtDateTime(order.updated_at)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* NOTES (full width) */}
        <div className="col-span-12">
          <div className="rounded-md bg-white p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Notes</div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap">{order.notes || "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}






