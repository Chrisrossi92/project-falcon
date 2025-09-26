// src/components/clients/ClientForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import supabase from "@/lib/supabaseClient";
import { isClientNameAvailable } from "@/lib/services/clientsService";

export default function ClientForm({ initial, onSubmit, submitLabel = "Save" }) {
  const [values, setValues] = useState({
    name: "",
    status: "active",
    // schema-aligned primary contact fields (table uses *_1)
    contact_name_1: "",
    contact_email_1: "",
    contact_phone_1: "",
    // new fields we added
    category: "client",
    amc_id: null,
    notes: "",
  });

  const [checking, setChecking] = useState(false);
  const [amcs, setAmcs] = useState([]);
  const [loadingAmcs, setLoadingAmcs] = useState(true);

  // Hydrate from initial (map any older aliases into *_1)
  useEffect(() => {
    if (!initial) return;
    setValues((v) => ({
      ...v,
      name: initial.name || "",
      status: initial.status || "active",
      category: initial.category || initial.client_type || initial.kind || "client",
      amc_id: initial.amc_id ?? null,
      notes: initial.notes || "",
      contact_name_1:
        initial.contact_name_1 || initial.contact_name || initial.primary_contact || "",
      contact_email_1:
        initial.contact_email_1 || initial.contact_email || initial.email || "",
      contact_phone_1:
        initial.contact_phone_1 || initial.phone || "",
    }));
  }, [initial]);

  // Load AMC options for selector
  useEffect(() => {
    (async () => {
      setLoadingAmcs(true);
      const { data, error } = await supabase
        .from("clients")
        .select("id,name,category")
        .eq("category", "amc")
        .order("name", { ascending: true });
      if (error) {
        console.error("Load AMCs failed:", error);
        setAmcs([]);
      } else {
        setAmcs(data || []);
      }
      setLoadingAmcs(false);
    })();
  }, []);

  // If switching to AMC, clear amc_id
  useEffect(() => {
    if ((values.category || "").toLowerCase() === "amc" && values.amc_id) {
      setValues((v) => ({ ...v, amc_id: null }));
    }
  }, [values.category, values.amc_id]);

  const canSubmit = useMemo(
    () => (values.name || "").trim().length > 0,
    [values.name]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) {
      toast.error("Client name is required");
      return;
    }

    try {
      setChecking(true);
      const incoming = (values.name || "").trim().toLowerCase();
      const current = (initial?.name || "").trim().toLowerCase();

      // Only check uniqueness if the name actually changed
      if (incoming !== current) {
        const ok = await isClientNameAvailable(values.name, {
          ignoreClientId: initial?.id,
        });
        if (!ok) {
          toast.error("Client name is already in use");
          return;
        }
      }
    } finally {
      setChecking(false);
    }

    // Build payload ONLY with columns that exist in your schema:
    // - contact_* fields mapped to *_1
    // - do not send legacy aliases (contact_email, phone, etc.)
    const payload = {
      name: values.name?.trim(),
      status: values.status || "active",
      category: values.category || "client",
      amc_id: (values.category || "").toLowerCase() === "amc" ? null : (values.amc_id || null),
      notes: values.notes || null,
      contact_name_1: values.contact_name_1 || null,
      contact_email_1: values.contact_email_1 || null,
      contact_phone_1: values.contact_phone_1 || null,
    };

    await onSubmit?.(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Client Name *</label>
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            placeholder="Acme Capital, LLC"
            required
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Status</label>
          <select
            className="w-full rounded border px-3 py-2 text-sm"
            value={values.status}
            onChange={(e) => setValues((v) => ({ ...v, status: e.target.value }))}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Category</label>
          <select
            className="w-full rounded border px-3 py-2 text-sm"
            value={values.category}
            onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
          >
            <option value="client">Client</option>
            <option value="lender">Lender</option>
            <option value="amc">AMC</option>
          </select>
        </div>

        {/* Managing AMC (hidden when this row IS an AMC) */}
        {(values.category || "").toLowerCase() !== "amc" && (
          <div>
            <label className="block text-xs text-gray-600 mb-1">Managing AMC (optional)</label>
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={values.amc_id || ""}
              onChange={(e) => setValues((v) => ({ ...v, amc_id: e.target.value || null }))}
              disabled={loadingAmcs}
            >
              <option value="">— None —</option>
              {amcs.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {loadingAmcs && <div className="text-xs text-gray-500 mt-1">Loading AMCs…</div>}
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-600 mb-1">Contact Name</label>
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            value={values.contact_name_1 || ""}
            onChange={(e) => setValues((v) => ({ ...v, contact_name_1: e.target.value }))}
            placeholder="Jane Smith"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Contact Email</label>
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            type="email"
            value={values.contact_email_1 || ""}
            onChange={(e) => setValues((v) => ({ ...v, contact_email_1: e.target.value }))}
            placeholder="jane@acmecapital.com"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Phone</label>
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            value={values.contact_phone_1 || ""}
            onChange={(e) => setValues((v) => ({ ...v, contact_phone_1: e.target.value }))}
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1">Notes</label>
        <textarea
          className="w-full rounded border px-3 py-2 text-sm"
          rows={4}
          value={values.notes || ""}
          onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
          placeholder="Preferred instructions, contacts, etc."
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!canSubmit || checking}
          className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50 disabled:opacity-50"
        >
          {submitLabel}
        </button>
        {checking && <span className="text-xs text-gray-500">Checking name…</span>}
      </div>
    </form>
  );
}


