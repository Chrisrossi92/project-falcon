// src/components/orders/OrderForm.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import supabase from "@/lib/supabaseClient";
import { useRole } from "@/lib/hooks/useRole";
import AddressAutocomplete from "@/components/inputs/AddressAutocomplete";
import OrderNumberField from "@/components/inputs/OrderNumberField";
import { PROPERTY_TYPES, REPORT_TYPES } from "@/components/orders/form/OrderEnums";

function Label({ children }) {
  return <label className="block text-xs font-medium text-gray-600 mb-1">{children}</label>;
}
function TextInput(props) { return <input {...props} className={"w-full border rounded px-2 py-1 text-sm " + (props.className || "")} />; }
function MoneyInput(props) { return <TextInput type="number" step="0.01" min="0" {...props} />; }
function PercentInput(props) { return <TextInput type="number" step="0.01" min="0" max="100" {...props} />; }
const roundCents = (n) => Math.round(Number(n || 0) * 100) / 100;

export default function OrderForm({ onSaved }) {
  const { isAdmin } = useRole() || {};

  // ------- form state -------
  // Parties
  const [managingAmcId, setManagingAmcId] = useState(""); // AMC (if applicable)
  const [clientId, setClientId] = useState("");            // Lender / direct client
  const [manualClient, setManualClient] = useState("");

  // Assignment / fees
  const [appraiserId, setAppraiserId] = useState("");
  const [splitPct, setSplitPct] = useState("");   // editable; defaults from appraiser
  const [baseFee, setBaseFee] = useState("");
  const [appraiserFee, setAppraiserFee] = useState("");

  // Order number
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
  const [clients, setClients] = useState([]); // all clients
  const [amcs, setAmcs] = useState([]);       // subset where kind='amc'
  const [appraisers, setAppraisers] = useState([]);
  const [amcLenderIds, setAmcLenderIds] = useState([]); // lenders allowed for selected AMC

  // UX
  const [submitting, setSubmitting] = useState(false);
  const disableSubmit = submitting || !isAdmin;

  // ---------- helpers ----------
  // Prefill next order number (suggestion) on mount
  useEffect(() => {
    generateOrderNo(); // suggest immediately
  }, []);

  // Load clients (all), AMCs, and active appraisers
  useEffect(() => {
    (async () => {
      const [{ data: cl }, { data: amcRows }, { data: aps }] = await Promise.all([
        supabase.from("clients").select("id,name,kind").order("name", { ascending: true }),
        supabase.from("clients").select("id,name").eq("kind", "amc").order("name", { ascending: true }),
        supabase.from("users").select("id, full_name, role, status").order("full_name", { ascending: true }),
      ]);
      setClients(cl ?? []);
      setAmcs(amcRows ?? []);
      setAppraisers(
        (aps || []).filter(
          (u) => String(u.role || "").toLowerCase() === "appraiser" && String(u.status || "active") === "active"
        )
      );
    })();
  }, []);

  // If AMC selected, fetch its permitted lenders and narrow Client dropdown
  useEffect(() => {
    if (!managingAmcId) { setAmcLenderIds([]); return; }
    (async () => {
      const { data, error } = await supabase
        .from("amc_lenders")
        .select("lender_id")
        .eq("amc_id", Number(managingAmcId));
      if (!error) setAmcLenderIds((data || []).map((r) => r.lender_id));
    })();
  }, [managingAmcId]);

  // Filtered Clients dropdown options
  const filteredClients = useMemo(() => {
    const nonAmc = (clients || []).filter((c) => String(c.kind || "").toLowerCase() !== "amc");
    if (!managingAmcId) return nonAmc;
    if (!amcLenderIds.length) return [];
    const setIds = new Set(amcLenderIds);
    return nonAmc.filter((c) => setIds.has(c.id));
  }, [clients, managingAmcId, amcLenderIds]);

  // Address returned from autocomplete
  const onAddressResolved = (parsed) => {
    setAddress(parsed.property_address || "");
    setCity(parsed.city || "");
    setState((parsed.state || "").toUpperCase());
    setZip(parsed.postal_code || "");
  };

  // Generate order # in format YYYY### (e.g., 2025103) by looking up the most recent for the current year
  async function generateOrderNo() {
    const year = String(new Date().getFullYear());
    // 1) Try server RPC if you add one (optional)
    try {
      const { data, error } = await supabase.rpc("rpc_next_order_no").select().maybeSingle();
      if (!error && data?.order_no) {
        const s = String(data.order_no);
        // Ensure it's in the right format; if not, fall through to client logic
        if (/^\d{7}$/.test(s) && s.startsWith(year)) { setOrderNo(s); return; }
      }
    } catch {} // ignore RPC 404

    // 2) Client-side: fetch latest order_number for this year, increment sequence
    const { data: rows, error: e2 } = await supabase
      .from("orders")
      .select("order_number")
      .ilike("order_number", `${year}%`)
      .order("order_number", { ascending: false })
      .limit(1);

    let seq = 1;
    if (!e2 && rows?.length) {
      const last = String(rows[0].order_number || "");
      const m = last.match(/^(\d{4})(\d{3})$/);
      if (m && m[1] === year) seq = Number(m[2]) + 1;
    }
    const suggestion = `${year}${String(seq).padStart(3, "0")}`;
    setOrderNo(suggestion);
  }

  // When appraiser changes, preload their split (user_roles → users.fee_split|split|split_pct)
  useEffect(() => {
    if (!appraiserId) return;
    (async () => {
      // Prefer a role-specific override if you use one
      let pct = null;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("split_pct, role")
        .eq("user_id", appraiserId)
        .eq("role", "appraiser")
        .limit(1);
      if (roles?.length && roles[0]?.split_pct != null) pct = roles[0].split_pct;

      if (pct == null) {
        const { data: u } = await supabase
          .from("users")
          .select("fee_split, split, split_pct")
          .eq("id", appraiserId)
          .maybeSingle();
        if (u) pct = u.fee_split ?? u.split ?? u.split_pct ?? null;
      }
      if (pct != null) setSplitPct(String(pct));
    })();
  }, [appraiserId]);

  // Auto-calc appraiser fee when baseFee or splitPct change (still editable)
  const lastCalcRef = useRef(null);
  useEffect(() => {
    const base = Number(baseFee || 0);
    const pct = Number(splitPct || 0);
    const calc = roundCents(base * (pct / 100));
    // Only update if user hasn't typed a manual override since last calc
    if (appraiserFee === "" || appraiserFee === String(lastCalcRef.current)) {
      setAppraiserFee(String(calc));
      lastCalcRef.current = calc;
    }
  }, [baseFee, splitPct]);

  // Clear manual client text if a real client is chosen
  useEffect(() => { if (clientId) setManualClient(""); }, [clientId]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!isAdmin) return;

    setSubmitting(true);
    try {
      const payload = {
        // Parties
        managing_amc_id: managingAmcId ? Number(managingAmcId) : null,
        client_id: clientId ? Number(clientId) : null,
        manual_client_name: clientId ? null : (manualClient || null),

        // Assignment & billing
        appraiser_id: appraiserId || null,
        split_pct: splitPct ? Number(splitPct) : null,
        base_fee: baseFee ? Number(baseFee) : null,
        appraiser_fee: appraiserFee ? Number(appraiserFee) : null,

        // Metadata
        order_number: orderNo || null,

        // Property info
        property_type: propertyType || null,
        report_type: reportType === "Other"
          ? (reportTypeCustom || "Other")
          : (reportType || null),

        // Address
        address: address || null,
        city: city || null,
        state: state || null,
        postal_code: zip || null,

        // Dates
        site_visit_at: siteVisitAt || null,  // datetime-local
        review_due_at: reviewDueAt || null,  // date-only
        final_due_at: finalDueAt || null,    // date-only

        // Notes
        notes: notes || null,
        status: "NEW",
      };

      const { data, error } = await supabase.from("orders").insert([payload]).select("id").maybeSingle();
      if (error) throw error;
      if (data?.id) onSaved?.(data.id);
    } catch (err) {
      alert(`Failed to create order: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-[1100px] mx-auto">
      <div className="grid grid-cols-12 gap-4">

        {/* Client group — AMC first (if applicable), then Client filtered by AMC */}
        <div className="col-span-12 md:col-span-6">
          <div className="rounded-md bg-white/60 p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Client</div>

            <Label>AMC (if applicable)</Label>
            <select
              value={managingAmcId}
              onChange={(e) => { setManagingAmcId(e.target.value); setClientId(""); }}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="">— None / Direct —</option>
              {amcs.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            <div className="mt-3">
              <Label>Client</Label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              >
                <option value="">Select client…</option>
                {filteredClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="mt-2 text-[11px] text-gray-500">Or enter a manual client:</div>
            <TextInput
              placeholder="Manual client name"
              value={manualClient}
              onChange={(e) => setManualClient(e.target.value)}
              disabled={!!clientId}
            />
          </div>
        </div>

        {/* Appraiser group */}
        <div className="col-span-12 md:col-span-6">
          <div className="rounded-md bg-white/60 p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Appraiser</div>

            <Label>Appraiser</Label>
            <select
              value={appraiserId}
              onChange={(e) => setAppraiserId(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="">Select appraiser…</option>
              {appraisers.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>

            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <Label>Split %</Label>
                <PercentInput placeholder="50" value={splitPct} onChange={(e) => setSplitPct(e.target.value)} />
              </div>
              <div>
                <Label>Base Fee</Label>
                <MoneyInput placeholder="0.00" value={baseFee} onChange={(e) => setBaseFee(e.target.value)} />
              </div>
              <div>
                <Label>Appraiser Fee</Label>
                <MoneyInput placeholder="0.00" value={appraiserFee} onChange={(e) => setAppraiserFee(e.target.value)} />
              </div>
            </div>

            <div className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <OrderNumberField value={orderNo} onChange={(e) => setOrderNo(e.target.value)} />
              </div>
              <button type="button" onClick={generateOrderNo} className="border rounded px-2 py-1 text-sm">
                Generate
              </button>
            </div>
          </div>
        </div>

        {/* Property (L) */}
        <div className="col-span-12 md:col-span-7">
          <div className="rounded-md bg-white/60 p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Property</div>

            <Label>Address</Label>
            <AddressAutocomplete
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onResolved={onAddressResolved}
              placeholder="123 Main St"
            />

            <div className="mt-3 grid grid-cols-6 gap-3">
              <div className="col-span-3">
                <Label>City</Label>
                <TextInput value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="col-span-1">
                <Label>State</Label>
                <TextInput value={state} onChange={(e) => setState((e.target.value || "").toUpperCase())} maxLength={2} />
              </div>
              <div className="col-span-2">
                <Label>Zip</Label>
                <TextInput value={zip} onChange={(e) => setZip(e.target.value)} />
              </div>
            </div>

            {/* New: types */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <Label>Property Type</Label>
                <select
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                >
                  <option value="">Select type…</option>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Report Type</Label>
                <select
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <option value="">Select report…</option>
                  {REPORT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                {reportType === "Other" && (
                  <div className="mt-2">
                    <Label>Report Type (custom)</Label>
                    <TextInput
                      placeholder="Describe report type"
                      value={reportTypeCustom}
                      onChange={(e) => setReportTypeCustom(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dates (R) */}
        <div className="col-span-12 md:col-span-5">
          <div className="rounded-md bg-white/60 p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Dates</div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3">
                <Label>Site Visit</Label>
                <TextInput type="datetime-local" step="900" value={siteVisitAt} onChange={(e) => setSiteVisitAt(e.target.value)} />
              </div>
              <div className="col-span-3">
                <Label>Reviewer Due</Label>
                <TextInput type="date" value={reviewDueAt} onChange={(e) => setReviewDueAt(e.target.value)} />
              </div>
              <div className="col-span-3">
                <Label>Final Due</Label>
                <TextInput type="date" value={finalDueAt} onChange={(e) => setFinalDueAt(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="col-span-12">
          <Label>Notes</Label>
          <textarea rows={5} className="w-full border rounded px-2 py-2 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {/* Submit */}
        <div className="col-span-12">
          <button
            type="submit"
            disabled={disableSubmit}
            className={"rounded bg-black text-white px-3 py-2 text-sm " + (disableSubmit ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-900")}
          >
            {submitting ? "Creating…" : "Create Order"}
          </button>
          {!isAdmin && <span className="ml-3 text-xs text-red-600">Admins only can create orders.</span>}
        </div>
      </div>
    </form>
  );
}






















