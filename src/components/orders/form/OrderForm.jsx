// src/components/orders/form/OrderForm.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import supabase from "@/lib/supabaseClient";
import AddressAutocomplete from "@/components/inputs/AddressAutocomplete";
import OrderNumberField from "@/components/inputs/OrderNumberField";
import { useRole } from "@/lib/hooks/useRole";
import { ORDER_STATUS } from "@/lib/constants/orderStatus"; // <-- NEW

// Simple enums
export const PROPERTY_TYPES = [
  "Industrial", "Office", "Retail", "Multifamily", "Land", "Mixed-Use", "Special Purpose", "Other"
];
export const REPORT_TYPES = ["Narrative", "Form", "Restricted", "Review", "Other"];

// helpers
const roundCents = (n) => Math.round(Number(n || 0) * 100) / 100;
const nz = (v) => (v === "" || v === undefined ? null : v);
const statusLabel = (s) => s ? s.toLowerCase().replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()) : "";

function Label({ children }) {
  return <label className="block text-xs font-medium text-gray-600 mb-1">{children}</label>;
}
function TextInput(props) { return <input {...props} className={"w-full border rounded px-2 py-1 text-sm " + (props.className || "")} />; }
function MoneyInput(props) { return <TextInput type="number" step="0.01" min="0" {...props} />; }
function PercentInput(props) { return <TextInput type="number" step="0.01" min="0" max="100" {...props} />; }

export default function OrderForm({ order = null, onSaved }) {
  const { isAdmin } = useRole() || {};

  // ------- form state -------
  // Parties
  const [managingAmcId, setManagingAmcId] = useState("");
  const [clientId, setClientId] = useState("");
  const [manualClient, setManualClient] = useState("");
  const [entryContactName,  setEntryContactName]  = useState("");
  const [entryContactPhone, setEntryContactPhone] = useState("");


  // Assignment / fees
  const [appraiserId, setAppraiserId] = useState("");
  const [splitPct, setSplitPct] = useState("");
  const [baseFee, setBaseFee] = useState("");
  const [appraiserFee, setAppraiserFee] = useState("");

  // Meta
  const [status, setStatus] = useState("NEW");     // <-- NEW
  const [orderNo, setOrderNo] = useState("");

  // Property
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  // Property & report types
  const [propertyType, setPropertyType] = useState("");
  const [reportType, setReportType] = useState("");
  const [reportTypeCustom, setReportTypeCustom] = useState("");

  // Dates
  const [siteVisitAt, setSiteVisitAt] = useState("");
  const [reviewDueAt, setReviewDueAt] = useState("");
  const [finalDueAt, setFinalDueAt] = useState("");

  // Notes
  const [notes, setNotes] = useState("");

  // ------- lookups -------
  const [clients, setClients] = useState([]);
  const [amcs, setAmcs] = useState([]);
  const [appraisers, setAppraisers] = useState([]);

  // UX
  const [submitting, setSubmitting] = useState(false);
  const disableSubmit = submitting || !isAdmin;

  const isEdit = !!(order && (order.id || order?.order_id));
  const orderId = order?.id || order?.order_id || null;

  // ---------------- Hydrate from "order" when present (Edit mode) ----------------
  useEffect(() => {
    if (!order) return;
    // party / meta
    setManagingAmcId(order.managing_amc_id ?? order.managingAmcId ?? "");
    setClientId(order.client_id ?? order.clientId ?? "");
    setManualClient(order.manual_client_name ?? order.manualClientName ?? "");

    setAppraiserId(order.appraiser_id ?? order.appraiserId ?? "");
    setSplitPct(nz(order.split_pct ?? order.splitPct ?? ""));
    setBaseFee(nz(order.base_fee ?? order.baseFee ?? ""));
    setAppraiserFee(nz(order.appraiser_fee ?? order.appraiserFee ?? ""));

    setStatus(order.status ?? "NEW"); // <-- NEW
    setOrderNo(order.order_number ?? order.orderNo ?? "");

    // property
    setAddress(order.property_address ?? order.address ?? "");
    setCity(order.city ?? "");
    setState((order.state ?? "").toUpperCase());
    setZip(order.postal_code ?? order.zip ?? "");

    setPropertyType(order.property_type ?? order.propertyType ?? "");
    const rt = order.report_type ?? order.reportType ?? "";
    if (rt && !REPORT_TYPES.includes(rt)) { setReportType("Other"); setReportTypeCustom(rt); } else { setReportType(rt); setReportTypeCustom(""); }

    // dates
    setSiteVisitAt(order.site_visit_at ?? order.siteVisitAt ?? "");
    setReviewDueAt(order.review_due_at ?? order.reviewDueAt ?? "");
    setFinalDueAt(order.final_due_at ?? order.finalDueAt ?? "");

    setNotes(order.notes ?? "");
  }, [order]);

  // ---------------- lookups ----------------
  useEffect(() => {
    (async () => {
      const [{ data: cl }, { data: amcRows }, { data: aps }] = await Promise.all([
        supabase.from("clients").select("id,name,category,amc_id,is_merged,status").neq("is_merged", true).order("name"),
        supabase.from("clients").select("id,name").eq("category", "amc").order("name"),
        supabase.from("users").select("id,full_name,role,status").order("full_name"),
      ]);
      setClients(cl ?? []);
      setAmcs(amcRows ?? []);
      setAppraisers((aps || []).filter((u) => String(u.role || "").toLowerCase() === "appraiser" && String(u.status || "active") === "active"));
    })();
  }, []);

  // AMC-aware client filtering
  const filteredClients = useMemo(() => {
    const nonAmc = (clients || []).filter((c) => String(c.category || "").toLowerCase() !== "amc");
    const amcIdNum = managingAmcId ? Number(managingAmcId) : null;
    if (!amcIdNum) return nonAmc;
    return nonAmc.filter((c) => Number(c.amc_id) === amcIdNum);
  }, [clients, managingAmcId]);

  // Suggest an order number on create
  useEffect(() => { if (!isEdit) generateOrderNo(); }, [isEdit]);

  async function generateOrderNo() {
    const year = String(new Date().getFullYear());
    try {
      const { data, error } = await supabase.rpc("rpc_next_order_no").select().maybeSingle();
      if (!error && data?.order_no) {
        const s = String(data.order_no);
        if (/^\d{7}$/.test(s) && s.startsWith(year)) { setOrderNo(s); return; }
      }
    } catch {}
    const { data: rows } = await supabase.from("orders").select("order_number").ilike("order_number", `${year}%`).order("order_number", { ascending: false }).limit(1);
    let seq = 1;
    if (rows?.length) {
      const last = String(rows[0].order_number || "");
      const m = last.match(/^(\d{4})(\d{3})$/);
      if (m && m[1] === year) seq = Number(m[2]) + 1;
    }
    setOrderNo(`${year}${String(seq).padStart(3, "0")}`);
  }

  // Prefill split% (only when empty)
  useEffect(() => {
    if (!appraiserId) return;
    (async () => {
      if (splitPct !== "" && splitPct != null) return;
      let pct = null;
      const { data: roles } = await supabase.from("user_roles").select("split_pct, role").eq("user_id", appraiserId).eq("role", "appraiser").limit(1);
      if (roles?.length && roles[0]?.split_pct != null) pct = roles[0].split_pct;
      if (pct == null) {
        const { data: u } = await supabase.from("users").select("fee_split, split, split_pct").eq("id", appraiserId).maybeSingle();
        if (u) pct = u.fee_split ?? u.split ?? u.split_pct ?? null;
      }
      if (pct != null) setSplitPct(String(pct));
    })();
  }, [appraiserId]); // eslint-disable-line

  // Auto-calc appraiser fee
  const lastCalcRef = useRef(null);
  useEffect(() => {
    const base = Number(baseFee || 0);
    const pct = Number(splitPct || 0);
    const calc = roundCents(base * (pct / 100));
    if (appraiserFee === "" || appraiserFee === String(lastCalcRef.current)) {
      setAppraiserFee(String(calc));
      lastCalcRef.current = calc;
    }
  }, [baseFee, splitPct]); // eslint-disable-line

  // Clear manual client if we pick an actual client
  useEffect(() => { if (clientId) setManualClient(""); }, [clientId]);

  // Address autocomplete
  const onAddressResolved = (parsed) => {
    setAddress(parsed.property_address || "");
    setCity(parsed.city || "");
    setState((parsed.state || "").toUpperCase());
    setZip(parsed.postal_code || "");
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (!isAdmin) return;

    setSubmitting(true);
    try {
      const payload = {
        // Parties
        managing_amc_id: managingAmcId ? Number(managingAmcId) : null,
        client_id: clientId ? Number(clientId) : null,
        manual_client_name: clientId ? null : nz(manualClient),
        entry_contact_name:  nz(entryContactName),
        entry_contact_phone: nz(entryContactPhone),

        // Assignment & billing
        appraiser_id: nz(appraiserId),
        split_pct: nz(Number(splitPct)),
        base_fee: nz(Number(baseFee)),
        appraiser_fee: nz(Number(appraiserFee)),

        // Meta
        status: status || "NEW",              // <-- NEW
        order_number: nz(orderNo),

        // Property info
        property_type: nz(propertyType),
        report_type: reportType === "Other" ? nz(reportTypeCustom || "Other") : nz(reportType),

        // Address
        address: nz(address),
        city: nz(city),
        state: nz(state),
        postal_code: nz(zip),

        // Dates
        site_visit_at: nz(siteVisitAt),
        review_due_at: nz(reviewDueAt),
        final_due_at: nz(finalDueAt),

        // Notes
        notes: nz(notes),
      };

      let savedId = orderId;
      if (isEdit) {
        const { data, error } = await supabase.from("orders").update(payload).eq("id", orderId).select("id").maybeSingle();
        if (error) throw error;
        savedId = data?.id ?? orderId;
      } else {
        const { data, error } = await supabase.from("orders").insert([payload]).select("id").maybeSingle();
        if (error) throw error;
        savedId = data?.id;
      }

      onSaved?.(savedId);
    } catch (err) {
      alert(`Failed to save order: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-[1100px] mx-auto">
      <div className="grid grid-cols-12 gap-4">

        {/* Client group — AMC + Client */}
        <div className="col-span-12 md:col-span-6">
          <div className="rounded-md bg-white/60 p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Client</div>

            <Label>AMC (if applicable)</Label>
            <select
              value={managingAmcId ?? ""}
              onChange={(e) => { setManagingAmcId(e.target.value); setClientId(""); }}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="">— None / Direct —</option>
              {amcs.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
            </select>

            <div className="mt-3">
              <Label>Client</Label>
              <select
                value={clientId ?? ""}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              >
                <option value="">{managingAmcId ? "Select client tied to this AMC…" : "Select client…"}</option>
                {filteredClients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>

            <div className="mt-2 text-[11px] text-gray-500">Or enter a manual client:</div>
            <TextInput
              placeholder="Manual client name"
              value={manualClient || ""}
              onChange={(e) => setManualClient(e.target.value)}
              disabled={!!clientId}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
  <div>
    <Label>Property Entry Contact</Label>
    <TextInput
      placeholder="Contact name"
      value={entryContactName}
      onChange={(e) => setEntryContactName(e.target.value)}
    />
  </div>
  <div>
    <Label>Contact Phone</Label>
    <TextInput
      placeholder="(555) 123-4567"
      value={entryContactPhone}
      onChange={(e) => setEntryContactPhone(e.target.value)}
    />
  </div>
</div>

          </div>
        </div>

        {/* Appraiser + Status */}
        <div className="col-span-12 md:col-span-6">
          <div className="rounded-md bg-white/60 p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Meta & Assignment</div>

            {/* NEW: Status selector (admin only editable) */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3 md:col-span-1">
                <Label>Status</Label>
                <select
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={!isAdmin}
                >
                  {Object.values(ORDER_STATUS).map((s) => (
                    <option key={s} value={s}>{statusLabel(s)}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-3 md:col-span-2">
                <Label>Appraiser</Label>
                <select
                  value={appraiserId ?? ""}
                  onChange={(e) => setAppraiserId(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  <option value="">Select appraiser…</option>
                  {appraisers.map((u) => (<option key={u.id} value={u.id}>{u.full_name}</option>))}
                </select>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <Label>Split %</Label>
                <PercentInput placeholder="50" value={splitPct || ""} onChange={(e) => setSplitPct(e.target.value)} />
              </div>
              <div>
                <Label>Base Fee</Label>
                <MoneyInput placeholder="0.00" value={baseFee || ""} onChange={(e) => setBaseFee(e.target.value)} />
              </div>
              <div>
                <Label>Appraiser Fee</Label>
                <MoneyInput placeholder="0.00" value={appraiserFee || ""} onChange={(e) => setAppraiserFee(e.target.value)} />
              </div>
            </div>

            <div className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <OrderNumberField value={orderNo || ""} onChange={(e) => setOrderNo(e.target.value)} />
              </div>
              {!isEdit && (
                <button type="button" onClick={generateOrderNo} className="border rounded px-2 py-1 text-sm">
                  Generate
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Property */}
        <div className="col-span-12 md:col-span-7">
          <div className="rounded-md bg-white/60 p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Property</div>

            <Label>Address</Label>
            <AddressAutocomplete value={address || ""} onChange={(e) => setAddress(e.target.value)} onResolved={onAddressResolved} placeholder="123 Main St" />

            <div className="mt-3 grid grid-cols-6 gap-3">
              <div className="col-span-3">
                <Label>City</Label>
                <TextInput value={city || ""} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="col-span-1">
                <Label>State</Label>
                <TextInput value={state || ""} onChange={(e) => setState((e.target.value || "").toUpperCase())} maxLength={2} />
              </div>
              <div className="col-span-2">
                <Label>Zip</Label>
                <TextInput value={zip || ""} onChange={(e) => setZip(e.target.value)} />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <Label>Property Type</Label>
                <select className="w-full border rounded px-2 py-1 text-sm" value={propertyType || ""} onChange={(e) => setPropertyType(e.target.value)}>
                  <option value="">Select type…</option>
                  {PROPERTY_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
              <div>
                <Label>Report Type</Label>
                <select className="w-full border rounded px-2 py-1 text-sm" value={reportType || ""} onChange={(e) => setReportType(e.target.value)}>
                  <option value="">Select report…</option>
                  {REPORT_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>

                {reportType === "Other" && (
                  <div className="mt-2">
                    <Label>Report Type (custom)</Label>
                    <TextInput placeholder="Describe report type" value={reportTypeCustom || ""} onChange={(e) => setReportTypeCustom(e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="col-span-12 md:col-span-5">
          <div className="rounded-md bg-white/60 p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Dates</div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3">
                <Label>Site Visit</Label>
                <TextInput type="datetime-local" step="900" value={siteVisitAt || ""} onChange={(e) => setSiteVisitAt(e.target.value)} />
              </div>
              <div className="col-span-3">
                <Label>Reviewer Due</Label>
                <TextInput type="date" value={reviewDueAt || ""} onChange={(e) => setReviewDueAt(e.target.value)} />
              </div>
              <div className="col-span-3">
                <Label>Final Due</Label>
                <TextInput type="date" value={finalDueAt || ""} onChange={(e) => setFinalDueAt(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="col-span-12">
          <Label>Notes</Label>
          <textarea rows={5} className="w-full border rounded px-2 py-2 text-sm" value={notes || ""} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {/* Submit */}
        <div className="col-span-12">
          <button
            type="submit"
            disabled={disableSubmit}
            className={"rounded bg-black text-white px-3 py-2 text-sm " + (disableSubmit ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-900")}
          >
            {submitting ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save Changes" : "Create Order")}
          </button>
          {!isAdmin && <span className="ml-3 text-xs text-red-600">Admins only can save orders.</span>}
        </div>
      </div>
    </form>
  );
}























