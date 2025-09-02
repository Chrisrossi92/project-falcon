// src/components/clients/ClientForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { isClientNameAvailable } from "@/lib/services/clientsService";

export default function ClientForm({ initial, onSubmit, submitLabel = "Save" }) {
  const [values, setValues] = useState({
    name: "",
    contact_name: "",
    contact_email: "",
    phone: "",
    status: "active",
    notes: "",
  });
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (initial) {
      setValues((v) => ({
        ...v,
        ...initial,
        status: initial.status || "active",
      }));
    }
  }, [initial]);

  const canSubmit = useMemo(() => {
    return (values.name || "").trim().length > 0;
  }, [values.name]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) {
      toast.error("Client name is required");
      return;
    }
    // Optional name availability check
    try {
      setChecking(true);
      const ok = await isClientNameAvailable(values.name, {
        ignoreClientId: initial?.id,
      });
      if (!ok) {
        toast.error("Client name is already in use");
        return;
      }
    } finally {
      setChecking(false);
    }

    await onSubmit?.({
      name: values.name?.trim(),
      contact_name: values.contact_name || null,
      contact_email: values.contact_email || null,
      phone: values.phone || null,
      status: values.status || "active",
      notes: values.notes || null,
    });
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
        <div>
          <label className="block text-xs text-gray-600 mb-1">Contact Name</label>
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            value={values.contact_name || ""}
            onChange={(e) => setValues((v) => ({ ...v, contact_name: e.target.value }))}
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Contact Email</label>
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            type="email"
            value={values.contact_email || ""}
            onChange={(e) => setValues((v) => ({ ...v, contact_email: e.target.value }))}
            placeholder="jane@acmecapital.com"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Phone</label>
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            value={values.phone || ""}
            onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
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
