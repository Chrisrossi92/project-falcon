import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import supabase from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BasicInfoFields from "./BasicInfoFields";
import PropertyMap from "@/components/maps/PropertyMap";
import AssignmentFields from "./AssignmentFields";
import ReviewModal from "@/components/review/ReviewModal";

const DEFAULT_ORDER = {
  id: null,
  order_number: "",
  status: "New",
  primary_role: "appraiser",
  client_id: null,
  appraiser_id: null,
  second_appraiser_id: null,
  manual_client: "",
  manual_appraiser: "",
  property_address: "",
  city: "",
  state: "",
  postal_code: "",
  site_visit_at: null,
  review_due_at: null,
  final_due_at: null,
  fee_total: null,
  primary_split_pct: null,
  secondary_split_pct: null,
  inspector_fee: null,
  location: null,
  reviewers: [], // UI only; persisted via pivot RPC
};

function toInputDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
function fromInputDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  return d.toISOString();
}
function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
function buildSavePayload(f) {
  return {
    order_number: f?.order_number || null,
    status: f?.status ?? "New",
    primary_role: f?.primary_role || "appraiser",
    client_id: f?.client_id || null,
    appraiser_id: f?.appraiser_id || null,
    second_appraiser_id: f?.second_appraiser_id || null,
    manual_client: f?.manual_client || null,
    manual_appraiser: f?.manual_appraiser || null,
    property_address: f?.property_address ?? "",
    city: f?.city ?? "",
    state: f?.state ?? "",
    postal_code: f?.postal_code ?? "",
    site_visit_at: f?.site_visit_at ?? null,
    review_due_at: f?.review_due_at ?? null,
    final_due_at: f?.final_due_at ?? null,
    fee_total: f?.fee_total ?? null,
    primary_split_pct: f?.primary_split_pct ?? null,
    secondary_split_pct: f?.secondary_split_pct ?? null,
    inspector_fee: f?.inspector_fee ?? null,
  };
}

export default function OrderForm({ initialOrder, mode = "edit", onSaved }) {
  const base = useMemo(
    () => ({ ...DEFAULT_ORDER, ...(initialOrder || {}) }),
    [initialOrder]
  );

  const [form, setForm] = useState(base);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [appraisers, setAppraisers] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const [reviewersOpen, setReviewersOpen] = useState(false);

  useEffect(() => setForm(base), [base]);

  const isCreate = mode === "create" || !form?.id;

  // Auto-generate order number once on create
  useEffect(() => {
    if (!isCreate || form.order_number) return;
    (async () => {
      const year = new Date().getFullYear();
      const { data } = await supabase.rpc("next_order_number", { p_year: year });
      if (data) setForm((s) => ({ ...s, order_number: data }));
    })();
  }, [isCreate, form.order_number]);

  // Load dropdown data
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [c, a, i] = await Promise.all([
        supabase.from("clients").select("id, name").order("name"),
        supabase.from("users").select("id, name, role").eq("role", "appraiser").order("name"),
        supabase.from("users").select("id, name, role").eq("role", "inspector").order("name"),
      ]);
      if (!mounted) return;
      if (!c.error) setClients(c.data || []);
      if (!a.error) setAppraisers(a.data || []);
      if (!i.error) setInspectors(i.data || []);
    })();
    return () => { mounted = false; };
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };
  const onChangeSelect = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value || null }));
  };
  const onBulkChange = (patch) => {
    const next = { ...patch };
    if (typeof next.state === "string") next.state = next.state.toUpperCase();
    setForm((s) => ({ ...s, ...(next || {}) }));
    if (patch?.location?.lat && patch?.location?.lng) setShowMap(true);
  };
  const onChangeDate = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: fromInputDateTime(value) }));
  };

  const setQuickDates = (reviewInDays, finalInDays) => {
    setForm((s) => ({
      ...s,
      review_due_at: addDays(reviewInDays),
      final_due_at: addDays(finalInDays),
    }));
  };

  async function saveViaRPC() {
    if (isCreate) {
      const { data, error } = await supabase.rpc("create_order", { p_order: buildSavePayload(form) });
      if (error) throw error;
      return data;
    } else {
      const { error } = await supabase.rpc("update_order", { p_id: form.id, p_changes: buildSavePayload(form) });
      if (error) throw error;
      return { id: form.id };
    }
  }
  async function saveDirectFallback() {
    if (isCreate) {
      const { data, error } = await supabase.from("orders").insert(buildSavePayload(form)).select("id").single();
      if (error) throw error;
      return data;
    } else {
      const { error } = await supabase.from("orders").update(buildSavePayload(form)).eq("id", form.id);
      if (error) throw error;
      return { id: form.id };
    }
  }

  const persistReviewers = async (orderId) => {
    if (!Array.isArray(form.reviewers)) return;
    const payload = form.reviewers.map((r, idx) => ({
      reviewer_id: r.reviewer_id,
      position: r.position ?? idx + 1,
      required: r.required ?? true,
    }));
    const { error } = await supabase.rpc("set_order_reviewers", {
      p_order_id: orderId,
      p_reviewers: payload,
    });
    if (error) throw error;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let res;
      try {
        res = await saveViaRPC();
      } catch (rpcErr) {
        const msg = (rpcErr?.message || "").toLowerCase();
        if (msg.includes("create_order") || msg.includes("update_order") || rpcErr?.code === "42883") {
          res = await saveDirectFallback();
        } else {
          throw rpcErr;
        }
      }
      const orderId = res?.id ?? form.id ?? null;
      if (orderId) {
        try {
          await persistReviewers(orderId);
        } catch (e) {
          // Not fatal to order creation
          console.warn("set_order_reviewers failed:", e?.message);
        }
      }
      toast.success(isCreate ? "Order created" : "Order updated");
      onSaved?.(orderId);
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <section className="rounded-2xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium">Basic Info</h2>
            {form.location && (
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline"
                onClick={() => setShowMap((s) => !s)}
              >
                {showMap ? "Hide map" : "Show map"}
              </button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-5">
              <BasicInfoFields
                order={form}
                statuses={["New", "In Progress", "Review", "Final", "Delivered"]}
                onChange={onChange}
                onChangeSelect={onChangeSelect}
                onBulkChange={onBulkChange}
              />
            </div>
            <div className={`${showMap ? "block" : "hidden"} md:block`}>
              <PropertyMap location={form.location} />
            </div>
          </div>
        </section>

        {/* Assignment (role, people, fees, reviewers) */}
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="mb-3 text-lg font-medium">Assignment</h2>
          <AssignmentFields
            form={form}
            appraisers={appraisers}
            inspectors={inspectors}
            onChange={onChange}
            onChangeSelect={onChangeSelect}
            onBulkChange={onBulkChange}
            onOpenReviewers={() => setReviewersOpen(true)}
          />
        </section>

        {/* Dates */}
        <section className="rounded-2xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium">Dates</h2>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setQuickDates(7, 14)}>+7 / +14</Button>
              <Button type="button" variant="outline" onClick={() => setQuickDates(5, 10)}>+5 / +10</Button>
              <Button type="button" variant="outline" onClick={() => setQuickDates(3, 7)}>+3 / +7</Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-500">Site Visit</label>
              <input
                type="datetime-local"
                name="site_visit_at"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={toInputDateTime(form.site_visit_at)}
                onChange={onChangeDate}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Review Due</label>
              <input
                type="datetime-local"
                name="review_due_at"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={toInputDateTime(form.review_due_at)}
                onChange={onChangeDate}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Final Due</label>
              <input
                type="datetime-local"
                name="final_due_at"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={toInputDateTime(form.final_due_at)}
                onChange={onChangeDate}
              />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isCreate ? "Create Order" : "Save Changes"}
          </Button>
        </div>
      </form>

      {/* Reviewers modal */}
      <ReviewModal
        open={reviewersOpen}
        onOpenChange={setReviewersOpen}
        value={form.reviewers}
        onSave={(sel) => setForm((s) => ({ ...s, reviewers: sel }))}
      />
    </>
  );
}









