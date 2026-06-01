import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Pencil, Plus, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { useCan } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";
import {
  createVendorContact,
  createVendorServiceArea,
  getVendorProfileContacts,
  getVendorProfileDetail,
  getVendorProfileServiceAreas,
  updateVendorContact,
  updateVendorProfile,
  updateVendorServiceArea,
} from "./api";

const VENDOR_STATUS_OPTIONS = Object.freeze([
  { value: "active", label: "Active" },
  { value: "preferred", label: "Preferred" },
  { value: "pending", label: "Pending" },
  { value: "probation", label: "Probation" },
  { value: "inactive", label: "Inactive" },
  { value: "do_not_use", label: "Do not use" },
]);

const SERVICE_AREA_STATUS_OPTIONS = Object.freeze([
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
]);

function formatStatus(value) {
  if (!value) return "Unknown";
  return String(value)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function renderJsonSummary(value) {
  if (!value || typeof value !== "object" || Object.keys(value).length === 0) return "None listed";

  const entries = Object.entries(value)
    .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined && entryValue !== false && entryValue !== "")
    .slice(0, 8);

  if (entries.length === 0) return "None listed";

  return entries
    .map(([key, entryValue]) => {
      const renderedValue =
        typeof entryValue === "boolean"
          ? "Yes"
          : typeof entryValue === "object"
            ? JSON.stringify(entryValue)
            : String(entryValue);

      return `${formatStatus(key)}: ${renderedValue}`;
    })
    .join(" · ");
}

function formatAddress(address = {}) {
  if (!address || Object.keys(address).length === 0) return "No address listed";
  return [
    address.line1 || address.street || address.address1,
    address.line2 || address.address2,
    [address.city, address.state].filter(Boolean).join(", "),
    address.zip || address.postal_code,
  ].filter(Boolean).join(" · ") || "No address listed";
}

function textOrNull(value) {
  const nextValue = String(value || "").trim();
  return nextValue || null;
}

function tagsFromText(value) {
  return [...new Set(
    String(value || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  )];
}

function compactObject(value = {}) {
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entryValue]) => [key, textOrNull(entryValue)])
      .filter(([, entryValue]) => entryValue !== null),
  );
}

function stableJson(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "{}";
  return JSON.stringify(value, null, 2);
}

function parseJsonObject(value, label) {
  const nextValue = textOrNull(value);
  if (!nextValue) return {};

  try {
    const parsed = JSON.parse(nextValue);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${label} must be a JSON object.`);
    }
    return parsed;
  } catch (error) {
    if (error.message === `${label} must be a JSON object.`) throw error;
    throw new Error(`${label} must be valid JSON.`);
  }
}

function editProfileErrorMessage(error) {
  const code = String(error?.message || error?.code || "").toLowerCase();
  if (code.includes("vendor_update_permission_required") || code.includes("permission") || code.includes("42501")) {
    return "You do not have permission to update this vendor profile.";
  }
  if (code.includes("vendor_status_invalid")) {
    return "Choose a supported vendor status.";
  }
  if (code.includes("vendor_patch_contains_forbidden_fields")) {
    return "Only vendor profile metadata can be updated here.";
  }
  return "Vendor profile could not be updated. Review the details and try again.";
}

function contactMutationErrorMessage(error) {
  const code = String(error?.message || error?.code || "").toLowerCase();
  if (code.includes("vendor_contacts_manage_permission_required") || code.includes("permission") || code.includes("42501")) {
    return "You do not have permission to manage vendor contacts.";
  }
  if (code.includes("vendor_profile_not_found_or_not_authorized") || code.includes("vendor_contact_not_found_or_not_authorized")) {
    return "This contact could not be found or is not available in this workspace.";
  }
  if (code.includes("contact name is required") || code.includes("vendor_payload_invalid")) {
    return "Contact name is required.";
  }
  return "Vendor contact could not be saved. Review the details and try again.";
}

function serviceAreaMutationErrorMessage(error) {
  const code = String(error?.message || error?.code || "").toLowerCase();
  if (code.includes("vendor_service_areas_manage_permission_required") || code.includes("permission") || code.includes("42501")) {
    return "You do not have permission to manage vendor service areas.";
  }
  if (code.includes("vendor_profile_not_found_or_not_authorized") || code.includes("vendor_service_area_not_found_or_not_authorized")) {
    return "This service area could not be found or is not available in this workspace.";
  }
  if (code.includes("vendor_service_area_status_invalid")) {
    return "Choose a supported service-area status.";
  }
  if (code.includes("vendor_payload_invalid")) {
    return "Add at least one coverage or product field.";
  }
  return "Vendor service area could not be saved. Review the details and try again.";
}

function profileToEditForm(profile = {}) {
  const address = profile.primary_address || {};
  return {
    vendorStatus: profile.vendor_status || "active",
    website: profile.website || "",
    publicPhone: profile.public_phone || "",
    addressLine1: address.line1 || address.street || address.address1 || "",
    addressLine2: address.line2 || address.address2 || "",
    addressCity: address.city || "",
    addressState: address.state || "",
    addressZip: address.zip || address.postal_code || "",
    defaultAssignmentInstructions: profile.default_assignment_instructions || "",
    capabilities: stableJson(profile.capabilities),
    productEligibility: stableJson(profile.product_eligibility),
    tags: Array.isArray(profile.tags) ? profile.tags.join(", ") : "",
    internalNotes: profile.internal_notes || "",
  };
}

function DetailCard({ title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 text-sm text-slate-600">{children}</div>
    </section>
  );
}

const EMPTY_CONTACT_FORM = Object.freeze({
  name: "",
  email: "",
  phone: "",
  roleLabel: "",
  isPrimary: false,
  receivesAssignmentNotifications: false,
  notes: "",
});

function contactToForm(contact = {}) {
  return {
    name: contact.name || "",
    email: contact.email || "",
    phone: contact.phone || "",
    roleLabel: contact.role_label || "",
    isPrimary: contact.is_primary === true,
    receivesAssignmentNotifications: contact.receives_assignment_notifications === true,
    notes: contact.notes || "",
  };
}

function buildContactPayload(form) {
  const payload = {
    name: textOrNull(form.name),
    is_primary: form.isPrimary === true,
    receives_assignment_notifications: form.receivesAssignmentNotifications === true,
  };

  const email = textOrNull(form.email);
  const phone = textOrNull(form.phone);
  const roleLabel = textOrNull(form.roleLabel);
  const notes = textOrNull(form.notes);

  if (email) payload.email = email;
  if (phone) payload.phone = phone;
  if (roleLabel) payload.role_label = roleLabel;
  if (notes) payload.notes = notes;

  return payload;
}

function ContactModal({ contact, mode, open, vendorProfileId, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_CONTACT_FORM);
  const [formError, setFormError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(mode === "edit" ? contactToForm(contact) : EMPTY_CONTACT_FORM);
    setFormError("");
    setSubmitError("");
  }, [contact, mode, open]);

  if (!open) return null;

  const title = mode === "edit" ? "Edit Contact" : "Add Contact";
  const updateField = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    setFormError("");
    setSubmitError("");

    if (!textOrNull(form.name)) {
      setFormError("Contact name is required.");
      return;
    }

    const payload = buildContactPayload(form);

    setSaving(true);
    try {
      if (mode === "edit") {
        await updateVendorContact(contact.vendor_contact_id || contact.id, payload);
      } else {
        await createVendorContact(vendorProfileId, payload);
      }
      await onSaved?.();
    } catch (error) {
      console.debug("Vendor contact save failed", {
        code: error?.code,
        message: error?.message,
      });
      setSubmitError(contactMutationErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose?.();
      }}
    >
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-contact-modal-title"
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Vendor Contacts</div>
            <h2 id="vendor-contact-modal-title" className="mt-1 text-xl font-semibold text-slate-950">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            aria-label={`Close ${title}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-5">
          {(formError || submitError) && (
            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>{formError || submitError}</div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Name</span>
              <input value={form.name} onChange={updateField("name")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Role label</span>
              <input value={form.roleLabel} onChange={updateField("roleLabel")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Email</span>
              <input value={form.email} onChange={updateField("email")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Phone</span>
              <input value={form.phone} onChange={updateField("phone")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
            </label>
          </div>

          <div className="grid gap-3">
            <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <input
                type="checkbox"
                checked={form.isPrimary}
                onChange={updateField("isPrimary")}
                className="mt-1"
                aria-label="Primary contact"
              />
              <span>
                <span className="block font-medium text-slate-700">Primary contact</span>
                <span className="block text-slate-500">Marks this contact as the main vendor contact.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <input
                type="checkbox"
                checked={form.receivesAssignmentNotifications}
                onChange={updateField("receivesAssignmentNotifications")}
                className="mt-1"
                aria-label="Assignment notifications noted for future use"
              />
              <span>
                <span className="block font-medium text-slate-700">Assignment notifications noted for future use</span>
                <span className="block text-slate-500">Informational only in this slice; no assignment notification routing is enabled.</span>
              </span>
            </label>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Notes</span>
            <textarea value={form.notes} onChange={updateField("notes")} rows={3} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="inline-flex h-9 items-center justify-center rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
            {saving ? "Saving..." : mode === "edit" ? "Save Contact" : "Add Contact"}
          </button>
        </div>
      </form>
    </div>
  );
}

const EMPTY_SERVICE_AREA_FORM = Object.freeze({
  state: "",
  county: "",
  zip: "",
  market: "",
  radiusMiles: "",
  productType: "",
  status: "active",
});

function serviceAreaToForm(area = {}) {
  return {
    state: area.state || "",
    county: area.county || "",
    zip: area.zip || "",
    market: area.market || "",
    radiusMiles: area.radius_miles === null || area.radius_miles === undefined ? "" : String(area.radius_miles),
    productType: area.product_type || "",
    status: area.status === "inactive" ? "inactive" : "active",
  };
}

function buildServiceAreaPayload(form) {
  const payload = {
    status: form.status === "inactive" ? "inactive" : "active",
  };

  const state = textOrNull(form.state);
  const county = textOrNull(form.county);
  const zip = textOrNull(form.zip);
  const market = textOrNull(form.market);
  const radiusMiles = textOrNull(form.radiusMiles);
  const productType = textOrNull(form.productType);

  if (state) payload.state = state.toUpperCase();
  if (county) payload.county = county;
  if (zip) payload.zip = zip;
  if (market) payload.market = market;
  if (radiusMiles) payload.radius_miles = radiusMiles;
  if (productType) payload.product_type = productType;

  return payload;
}

function serviceAreaHasMeaningfulField(payload) {
  return ["state", "county", "zip", "market", "radius_miles", "product_type"].some((key) => Boolean(payload[key]));
}

function ServiceAreaModal({ area, mode, open, vendorProfileId, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_SERVICE_AREA_FORM);
  const [formError, setFormError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(mode === "edit" ? serviceAreaToForm(area) : EMPTY_SERVICE_AREA_FORM);
    setFormError("");
    setSubmitError("");
  }, [area, mode, open]);

  if (!open) return null;

  const title = mode === "edit" ? "Edit Service Area" : "Add Service Area";
  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    setFormError("");
    setSubmitError("");

    const payload = buildServiceAreaPayload(form);
    if (!serviceAreaHasMeaningfulField(payload)) {
      setFormError("Add at least one coverage or product field.");
      return;
    }

    setSaving(true);
    try {
      if (mode === "edit") {
        await updateVendorServiceArea(area.vendor_service_area_id || area.id, payload);
      } else {
        await createVendorServiceArea(vendorProfileId, payload);
      }
      await onSaved?.();
    } catch (error) {
      console.debug("Vendor service area save failed", {
        code: error?.code,
        message: error?.message,
      });
      setSubmitError(serviceAreaMutationErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose?.();
      }}
    >
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-service-area-modal-title"
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Vendor Coverage</div>
            <h2 id="vendor-service-area-modal-title" className="mt-1 text-xl font-semibold text-slate-950">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            aria-label={`Close ${title}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-5">
          {(formError || submitError) && (
            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>{formError || submitError}</div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">State</span>
              <input value={form.state} onChange={updateField("state")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">County</span>
              <input value={form.county} onChange={updateField("county")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">ZIP</span>
              <input value={form.zip} onChange={updateField("zip")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Market</span>
              <input value={form.market} onChange={updateField("market")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Radius miles</span>
              <input value={form.radiusMiles} onChange={updateField("radiusMiles")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Product type</span>
              <input value={form.productType} onChange={updateField("productType")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Status</span>
              <select value={form.status} onChange={updateField("status")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100">
                {SERVICE_AREA_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="inline-flex h-9 items-center justify-center rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
            {saving ? "Saving..." : mode === "edit" ? "Save Service Area" : "Add Service Area"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditProfileModal({ open, profile, onClose, onSaved }) {
  const [form, setForm] = useState(() => profileToEditForm(profile));
  const [formError, setFormError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(profileToEditForm(profile));
    setFormError("");
    setSubmitError("");
  }, [open, profile]);

  if (!open) return null;

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    setFormError("");
    setSubmitError("");

    let capabilities;
    let productEligibility;
    try {
      capabilities = parseJsonObject(form.capabilities, "Capabilities");
      productEligibility = parseJsonObject(form.productEligibility, "Product eligibility");
    } catch (error) {
      setFormError(error.message);
      return;
    }

    const primaryAddress = compactObject({
      line1: form.addressLine1,
      line2: form.addressLine2,
      city: form.addressCity,
      state: form.addressState,
      zip: form.addressZip,
    });

    const patch = {
      vendor_status: form.vendorStatus || "active",
      website: textOrNull(form.website),
      public_phone: textOrNull(form.publicPhone),
      primary_address: primaryAddress,
      default_assignment_instructions: textOrNull(form.defaultAssignmentInstructions),
      capabilities,
      product_eligibility: productEligibility,
      internal_notes: textOrNull(form.internalNotes),
      tags: tagsFromText(form.tags),
    };

    setSaving(true);
    try {
      await updateVendorProfile(profile.vendor_profile_id, patch);
      await onSaved?.();
    } catch (error) {
      console.debug("Vendor profile update failed", {
        code: error?.code,
        message: error?.message,
      });
      setSubmitError(editProfileErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose?.();
      }}
    >
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-vendor-profile-title"
        className="w-full max-w-4xl rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Vendor Profile</div>
            <h2 id="edit-vendor-profile-title" className="mt-1 text-xl font-semibold text-slate-950">Edit Profile</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            aria-label="Close Edit Profile"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-5 px-5 py-5">
          {(formError || submitError) && (
            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>{formError || submitError}</div>
            </div>
          )}

          <section className="grid gap-3" aria-labelledby="profile-basics-section-title">
            <h3 id="profile-basics-section-title" className="text-sm font-semibold text-slate-950">Profile</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Status</span>
                <select value={form.vendorStatus} onChange={updateField("vendorStatus")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100">
                  {VENDOR_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Website</span>
                <input value={form.website} onChange={updateField("website")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Public phone</span>
                <input value={form.publicPhone} onChange={updateField("publicPhone")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Tags</span>
                <input value={form.tags} onChange={updateField("tags")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
              </label>
            </div>
          </section>

          <section className="grid gap-3" aria-labelledby="address-section-title">
            <h3 id="address-section-title" className="text-sm font-semibold text-slate-950">Address</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Address line 1</span>
                <input value={form.addressLine1} onChange={updateField("addressLine1")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Address line 2</span>
                <input value={form.addressLine2} onChange={updateField("addressLine2")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">City</span>
                <input value={form.addressCity} onChange={updateField("addressCity")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-700">State</span>
                  <input value={form.addressState} onChange={updateField("addressState")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-700">ZIP</span>
                  <input value={form.addressZip} onChange={updateField("addressZip")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
                </label>
              </div>
            </div>
          </section>

          <section className="grid gap-3" aria-labelledby="readiness-section-title">
            <h3 id="readiness-section-title" className="text-sm font-semibold text-slate-950">Readiness</h3>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Default assignment instructions</span>
              <textarea value={form.defaultAssignmentInstructions} onChange={updateField("defaultAssignmentInstructions")} rows={3} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Capabilities</span>
                <textarea value={form.capabilities} onChange={updateField("capabilities")} rows={6} className="font-mono rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Product eligibility</span>
                <textarea value={form.productEligibility} onChange={updateField("productEligibility")} rows={6} className="font-mono rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Internal notes</span>
              <textarea value={form.internalNotes} onChange={updateField("internalNotes")} rows={3} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
            </label>
          </section>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="inline-flex h-9 items-center justify-center rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

function LoadingState() {
  return (
    <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4">
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Loading vendor profile...
      </div>
    </main>
  );
}

function ErrorState({ onRetry }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4">
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 shadow-sm">
        <div className="font-semibold">Vendor profile could not load.</div>
        <div className="mt-1">The profile may be unavailable or not authorized for this workspace.</div>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex h-8 items-center rounded-md border border-rose-200 bg-white px-3 text-sm font-medium text-rose-800 hover:bg-rose-100"
        >
          Retry
        </button>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4">
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Vendor profile not found.
      </div>
    </main>
  );
}

function ContactsList({ contacts, canManage = false, onEditContact }) {
  const safeContacts = Array.isArray(contacts) ? contacts : [];
  if (safeContacts.length === 0) return <div>No contacts listed.</div>;

  return (
    <div className="grid gap-3">
      {safeContacts.map((contact) => (
        <div key={contact.vendor_contact_id || contact.id} className="rounded-md border border-slate-100 bg-slate-50 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-slate-900">{contact.name || "Unnamed contact"}</div>
                {contact.is_primary && (
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600">Primary</span>
                )}
              </div>
              <div className="mt-1 text-slate-600">
                {[contact.role_label, contact.email, contact.phone].filter(Boolean).join(" · ") || "No contact details"}
              </div>
              {contact.linked_user_display_name && (
                <div className="mt-1 text-xs text-slate-500">Linked user: {contact.linked_user_display_name}</div>
              )}
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => onEditContact?.(contact)}
                className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Edit Contact
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ServiceAreasList({ serviceAreas, canManage = false, onEditServiceArea }) {
  const safeServiceAreas = Array.isArray(serviceAreas) ? serviceAreas : [];
  if (safeServiceAreas.length === 0) return <div>No service areas listed.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.12em] text-slate-400">
          <tr>
            <th className="px-2 py-2 font-semibold">Status</th>
            <th className="px-2 py-2 font-semibold">State</th>
            <th className="px-2 py-2 font-semibold">County</th>
            <th className="px-2 py-2 font-semibold">ZIP</th>
            <th className="px-2 py-2 font-semibold">Market</th>
            <th className="px-2 py-2 font-semibold">Product</th>
            <th className="px-2 py-2 font-semibold">Radius</th>
            {canManage && <th className="px-2 py-2 font-semibold">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {safeServiceAreas.map((area) => (
            <tr key={area.vendor_service_area_id || area.id}>
              <td className="px-2 py-2">{formatStatus(area.status)}</td>
              <td className="px-2 py-2">{area.state || "Any"}</td>
              <td className="px-2 py-2">{area.county || "Any"}</td>
              <td className="px-2 py-2">{area.zip || "Any"}</td>
              <td className="px-2 py-2">{area.market || "Any"}</td>
              <td className="px-2 py-2">{area.product_type ? formatStatus(area.product_type) : "Any"}</td>
              <td className="px-2 py-2">{area.radius_miles ? `${area.radius_miles} mi` : "Not set"}</td>
              {canManage && (
                <td className="px-2 py-2">
                  <button
                    type="button"
                    onClick={() => onEditServiceArea?.(area)}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Edit Service Area
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function VendorProfilePage() {
  const { vendorProfileId } = useParams();
  const canUpdateVendor = useCan(PERMISSIONS.VENDORS_UPDATE);
  const canManageContacts = useCan(PERMISSIONS.VENDORS_CONTACTS_MANAGE);
  const canManageServiceAreas = useCan(PERMISSIONS.VENDORS_SERVICE_AREAS_MANAGE);
  const [profile, setProfile] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [serviceAreas, setServiceAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [contactModalMode, setContactModalMode] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [serviceAreaModalMode, setServiceAreaModalMode] = useState(null);
  const [editingServiceArea, setEditingServiceArea] = useState(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!vendorProfileId) {
      setProfile(null);
      setContacts([]);
      setServiceAreas([]);
      setLoading(false);
      return;
    }

    try {
      const [detail, contactRows, serviceAreaRows] = await Promise.all([
        getVendorProfileDetail(vendorProfileId),
        getVendorProfileContacts(vendorProfileId),
        getVendorProfileServiceAreas(vendorProfileId),
      ]);
      setProfile(detail);
      setContacts(Array.isArray(contactRows) ? contactRows : []);
      setServiceAreas(Array.isArray(serviceAreaRows) ? serviceAreaRows : []);
    } catch (loadError) {
      console.debug("Vendor profile load failed", {
        code: loadError?.code,
        message: loadError?.message,
      });
      setProfile(null);
      setContacts([]);
      setServiceAreas([]);
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [vendorProfileId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const tags = useMemo(() => (Array.isArray(profile?.tags) ? profile.tags.filter(Boolean) : []), [profile]);

  const openAddContact = () => {
    setEditingContact(null);
    setContactModalMode("add");
  };

  const openEditContact = (contact) => {
    setEditingContact(contact);
    setContactModalMode("edit");
  };

  const closeContactModal = () => {
    setContactModalMode(null);
    setEditingContact(null);
  };

  const openAddServiceArea = () => {
    setEditingServiceArea(null);
    setServiceAreaModalMode("add");
  };

  const openEditServiceArea = (area) => {
    setEditingServiceArea(area);
    setServiceAreaModalMode("edit");
  };

  const closeServiceAreaModal = () => {
    setServiceAreaModalMode(null);
    setEditingServiceArea(null);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={loadProfile} />;
  if (!profile) return <EmptyState />;

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-4 px-3 py-4 sm:px-4">
      <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <Link to="/vendors" className="text-sm font-medium text-slate-500 hover:text-slate-800 hover:underline">
          Vendor Directory
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-950">
              {profile.vendor_company_name || "Unnamed vendor"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                {formatStatus(profile.vendor_status)}
              </span>
              <span>{profile.relationship_status ? formatStatus(profile.relationship_status) : "Staged"}</span>
              {profile.relationship_type && <span>{formatStatus(profile.relationship_type)}</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs text-slate-400">Updated {formatDate(profile.updated_at)}</div>
            {canUpdateVendor.allowed && (
              <button
                type="button"
                onClick={() => setEditProfileOpen(true)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4">
          <DetailCard title="Profile">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Website</dt>
                <dd className="mt-1">{profile.website || "No website listed"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Public phone</dt>
                <dd className="mt-1">{profile.public_phone || "No phone listed"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Address</dt>
                <dd className="mt-1">{formatAddress(profile.primary_address)}</dd>
              </div>
            </dl>
          </DetailCard>

          <DetailCard title="Assignment Readiness">
            <div className="grid gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Default instructions</div>
                <div className="mt-1 whitespace-pre-wrap">{profile.default_assignment_instructions || "No default instructions listed."}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Capabilities</div>
                <div className="mt-1">{renderJsonSummary(profile.capabilities)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Product eligibility</div>
                <div className="mt-1">{renderJsonSummary(profile.product_eligibility)}</div>
              </div>
            </div>
          </DetailCard>

          <DetailCard title="Contacts">
            {canManageContacts.allowed && (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={openAddContact}
                  className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add Contact
                </button>
              </div>
            )}
            <ContactsList
              contacts={contacts}
              canManage={canManageContacts.allowed}
              onEditContact={openEditContact}
            />
          </DetailCard>
        </div>

        <div className="grid gap-4 content-start">
          <DetailCard title="Tags and Notes">
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500">
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <div>No tags listed.</div>
            )}
            <div className="mt-4 whitespace-pre-wrap">{profile.internal_notes || "No internal notes listed."}</div>
          </DetailCard>

          <DetailCard title="Service Areas">
            {canManageServiceAreas.allowed && (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={openAddServiceArea}
                  className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add Service Area
                </button>
              </div>
            )}
            <ServiceAreasList
              serviceAreas={serviceAreas}
              canManage={canManageServiceAreas.allowed}
              onEditServiceArea={openEditServiceArea}
            />
          </DetailCard>
        </div>
      </div>

      <EditProfileModal
        open={editProfileOpen}
        profile={profile}
        onClose={() => setEditProfileOpen(false)}
        onSaved={async () => {
          await loadProfile();
          setEditProfileOpen(false);
        }}
      />
      <ContactModal
        open={Boolean(contactModalMode)}
        mode={contactModalMode || "add"}
        contact={editingContact}
        vendorProfileId={vendorProfileId}
        onClose={closeContactModal}
        onSaved={async () => {
          await loadProfile();
          closeContactModal();
        }}
      />
      <ServiceAreaModal
        open={Boolean(serviceAreaModalMode)}
        mode={serviceAreaModalMode || "add"}
        area={editingServiceArea}
        vendorProfileId={vendorProfileId}
        onClose={closeServiceAreaModal}
        onSaved={async () => {
          await loadProfile();
          closeServiceAreaModal();
        }}
      />
    </main>
  );
}
