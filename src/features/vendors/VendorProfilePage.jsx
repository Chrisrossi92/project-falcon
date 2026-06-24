import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Pencil, Plus, X } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";

import { useCan } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";
import {
  createVendorContact,
  createVendorServiceArea,
  getVendorCoverage,
  getVendorProfileContacts,
  getVendorProfileDetail,
  getVendorProfileServiceAreas,
  saveVendorCoverage,
  updateVendorContact,
  updateVendorProfile,
  updateVendorServiceArea,
} from "./api";
import CoverageBuilder from "./coverage/CoverageBuilder";
import { getVendorProductTypeLabel, normalizeVendorProductType, VENDOR_PRODUCT_TYPES } from "./coverage/productTypes";
import { getVendorErrorMessage } from "./vendorErrors";
import { buildVendorDirectoryPath } from "./vendorRoutePaths";

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

const COVERAGE_PROPERTY_TYPE_OPTIONS = Object.freeze([
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" },
  { value: "retail", label: "Retail" },
  { value: "office", label: "Office" },
  { value: "multifamily", label: "Multifamily" },
  { value: "agricultural", label: "Agricultural" },
  { value: "land", label: "Land" },
  { value: "residential", label: "Residential" },
]);

const COVERAGE_ASSIGNMENT_TYPE_OPTIONS = Object.freeze([
  { value: "appraisal", label: "Appraisal" },
  { value: "review", label: "Review" },
  { value: "desktop", label: "Desktop" },
  { value: "restricted", label: "Restricted" },
  { value: "evaluation", label: "Evaluation" },
]);

const VENDOR_CAPABILITY_OPTIONS = Object.freeze([
  { slug: "commercial", label: "Commercial" },
  { slug: "industrial", label: "Industrial" },
  { slug: "multifamily", label: "Multifamily" },
  { slug: "land", label: "Land" },
  { slug: "review", label: "Review" },
  { slug: "construction_draw", label: "Construction Draw" },
  { slug: "short_term_rental", label: "Short-Term Rental" },
  { slug: "residential", label: "Residential" },
  { slug: "rush_orders", label: "Rush Orders" },
  { slug: "portfolio_work", label: "Portfolio Work" },
  { slug: "litigation_support", label: "Litigation Support" },
  { slug: "expert_witness", label: "Expert Witness" },
  { slug: "tax_appeals", label: "Tax Appeals" },
  { slug: "review_assignments", label: "Review Assignments" },
]);

const VENDOR_CAPABILITY_LABELS = new Map(
  VENDOR_CAPABILITY_OPTIONS.map((option) => [option.slug, option.label]),
);

const VENDOR_PRODUCT_TYPE_LABELS = new Map(
  VENDOR_PRODUCT_TYPES.map((option) => [option.slug, option.label]),
);

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

function labelForMetadataKey(key, labelMap) {
  const normalizedProduct = normalizeVendorProductType(key);
  if (labelMap?.has(key)) return labelMap.get(key);
  if (normalizedProduct && labelMap?.has(normalizedProduct)) return labelMap.get(normalizedProduct);
  if (normalizedProduct) return getVendorProductTypeLabel(normalizedProduct);
  return formatStatus(key);
}

function renderMetadataSummary(value, labelMap) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0) return "None listed";

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

      return `${labelForMetadataKey(key, labelMap)}: ${renderedValue}`;
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

function normalizeCoverageState(value) {
  const normalized = textOrNull(value);
  return normalized ? normalized.toUpperCase() : null;
}

function normalizeCoverageCountyName(value) {
  return textOrNull(value);
}

function normalizeVendorCoverage(value = {}) {
  const states = [
    ...new Set(
      (Array.isArray(value.states) ? value.states : [])
        .map(normalizeCoverageState)
        .filter(Boolean),
    ),
  ].sort();

  const countyKeys = new Set();
  const counties = [];
  for (const county of Array.isArray(value.counties) ? value.counties : []) {
    if (!county || typeof county !== "object") continue;
    const stateCode = normalizeCoverageState(county.state_code || county.stateCode);
    const countyName = normalizeCoverageCountyName(county.county_name || county.countyName);
    if (!stateCode || !countyName) continue;
    const key = `${stateCode}:${countyName.toLowerCase()}`;
    if (countyKeys.has(key)) continue;
    countyKeys.add(key);
    counties.push({ state_code: stateCode, county_name: countyName });
  }
  counties.sort((a, b) => `${a.state_code} ${a.county_name}`.localeCompare(`${b.state_code} ${b.county_name}`));

  const propertyTypeValues = new Set(COVERAGE_PROPERTY_TYPE_OPTIONS.map((option) => option.value));
  const assignmentTypeValues = new Set(COVERAGE_ASSIGNMENT_TYPE_OPTIONS.map((option) => option.value));

  return {
    states,
    counties,
    propertyTypes: [
      ...new Set(
        (Array.isArray(value.propertyTypes) ? value.propertyTypes : [])
          .map((entry) => String(entry || "").trim().toLowerCase())
          .filter((entry) => propertyTypeValues.has(entry)),
      ),
    ].sort(),
    assignmentTypes: [
      ...new Set(
        (Array.isArray(value.assignmentTypes) ? value.assignmentTypes : [])
          .map((entry) => String(entry || "").trim().toLowerCase())
          .filter((entry) => assignmentTypeValues.has(entry)),
      ),
    ].sort(),
  };
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

function metadataObjectToSelection(value = {}, options = [], { normalizeProductAliases = false } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const allowed = new Set(options.map((option) => option.slug));
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entryValue]) => {
        const normalizedKey = allowed.has(key) || !normalizeProductAliases ? key : normalizeVendorProductType(key);
        return [normalizedKey, entryValue];
      })
      .filter(([key, entryValue]) => allowed.has(key) && entryValue !== null && entryValue !== undefined && entryValue !== false && entryValue !== "")
      .map(([key]) => [key, true]),
  );
}

function selectionToMetadataObject(selection = {}) {
  return Object.fromEntries(
    Object.entries(selection)
      .filter(([, selected]) => selected === true)
      .map(([key]) => [key, true]),
  );
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
    capabilities: metadataObjectToSelection(profile.capabilities, VENDOR_CAPABILITY_OPTIONS),
    productEligibility: metadataObjectToSelection(profile.product_eligibility, VENDOR_PRODUCT_TYPES, {
      normalizeProductAliases: true,
    }),
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

function SummaryCard({ label, value, detail }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="mt-1.5 text-lg font-semibold text-slate-950">{value}</div>
      {detail ? <div className="mt-1 text-xs text-slate-500">{detail}</div> : null}
    </div>
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

  const title = mode === "edit" ? "Edit Vendor Contact" : "Add Vendor Contact";
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
      setFormError("Vendor contact name is required.");
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
      setSubmitError(getVendorErrorMessage(error));
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
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Vendor Manager Contacts</div>
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
                aria-label="Primary vendor manager / signing appraiser"
              />
              <span>
                <span className="block font-medium text-slate-700">Primary vendor manager / signing appraiser</span>
                <span className="block text-slate-500">Routes Falcon-facing vendor work to this contact.</span>
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
            {saving ? "Saving..." : mode === "edit" ? "Save Vendor Contact" : "Add Vendor Contact"}
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
    productType: normalizeVendorProductType(area.product_type),
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

  const title = mode === "edit" ? "Edit coverage row" : "Add single coverage row";
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
      setSubmitError(getVendorErrorMessage(error));
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
              <select value={form.productType} onChange={updateField("productType")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100">
                <option value="">Select product type</option>
                {VENDOR_PRODUCT_TYPES.map((productType) => (
                  <option key={productType.slug} value={productType.slug}>
                    {productType.label}
                  </option>
                ))}
              </select>
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
            {saving ? "Saving..." : mode === "edit" ? "Save coverage row" : "Add coverage row"}
          </button>
        </div>
      </form>
    </div>
  );
}

function BulkCoverageModal({ open, vendorProfileId, onClose, onSaved }) {
  const [coverageRows, setCoverageRows] = useState([]);
  const [formError, setFormError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCoverageRows([]);
    setFormError("");
    setSubmitError("");
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    setFormError("");
    setSubmitError("");

    if (coverageRows.length === 0) {
      setFormError("Add at least one coverage selection before saving.");
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        coverageRows.map((row) =>
          createVendorServiceArea(vendorProfileId, {
            state: row.state || null,
            county: row.county || null,
            zip: row.zip || null,
            market: row.market || null,
            radius_miles: row.radius_miles ?? null,
            product_type: row.product_type || null,
            status: "active",
          }),
        ),
      );
      await onSaved?.();
    } catch (error) {
      console.debug("Vendor bulk coverage save failed", {
        code: error?.code,
        message: error?.message,
      });
      setSubmitError(getVendorErrorMessage(error));
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
        aria-labelledby="vendor-bulk-coverage-modal-title"
        className="w-full max-w-4xl rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Vendor Coverage</div>
            <h2 id="vendor-bulk-coverage-modal-title" className="mt-1 text-xl font-semibold text-slate-950">Add Coverage</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            aria-label="Close Add Coverage"
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

          <p className="text-sm text-slate-500">
            Add coverage for directory visibility and future vendor matching. This does not assign work automatically.
          </p>
          <CoverageBuilder onRowsChange={setCoverageRows} />
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="inline-flex h-9 items-center justify-center rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
            {saving ? "Saving..." : "Save Coverage"}
          </button>
        </div>
      </form>
    </div>
  );
}

function NormalizedCoverageSummary({ coverage }) {
  const normalized = normalizeVendorCoverage(coverage);

  return (
    <div className="grid gap-3" aria-label="Normalized vendor coverage">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">States</div>
        <div className="mt-1">{normalized.states.length ? normalized.states.join(", ") : "No states listed"}</div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Counties</div>
        <div className="mt-1">
          {normalized.counties.length
            ? normalized.counties.map((county) => `${county.state_code} ${county.county_name}`).join(", ")
            : "No counties listed"}
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Property types</div>
        <div className="mt-1">
          {normalized.propertyTypes.length
            ? normalized.propertyTypes.map(formatStatus).join(", ")
            : "No property types listed"}
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Assignment types</div>
        <div className="mt-1">
          {normalized.assignmentTypes.length
            ? normalized.assignmentTypes.map(formatStatus).join(", ")
            : "No assignment types listed"}
        </div>
      </div>
    </div>
  );
}

function NormalizedCoverageModal({ coverage, open, onClose, onSaved }) {
  const [draft, setDraft] = useState(() => normalizeVendorCoverage(coverage));
  const [stateInput, setStateInput] = useState("");
  const [countyStateInput, setCountyStateInput] = useState("");
  const [countyNameInput, setCountyNameInput] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(normalizeVendorCoverage(coverage));
    setStateInput("");
    setCountyStateInput("");
    setCountyNameInput("");
    setSubmitError("");
  }, [coverage, open]);

  if (!open) return null;

  const addState = () => {
    const stateCode = normalizeCoverageState(stateInput);
    if (!stateCode) return;
    setDraft((current) => normalizeVendorCoverage({
      ...current,
      states: [...current.states, stateCode],
    }));
    setStateInput("");
  };

  const removeState = (stateCode) => {
    setDraft((current) => normalizeVendorCoverage({
      ...current,
      states: current.states.filter((entry) => entry !== stateCode),
    }));
  };

  const addCounty = () => {
    const stateCode = normalizeCoverageState(countyStateInput);
    const countyName = normalizeCoverageCountyName(countyNameInput);
    if (!stateCode || !countyName) return;
    setDraft((current) => normalizeVendorCoverage({
      ...current,
      counties: [...current.counties, { state_code: stateCode, county_name: countyName }],
    }));
    setCountyStateInput("");
    setCountyNameInput("");
  };

  const removeCounty = (stateCode, countyName) => {
    setDraft((current) => normalizeVendorCoverage({
      ...current,
      counties: current.counties.filter(
        (county) => !(county.state_code === stateCode && county.county_name === countyName),
      ),
    }));
  };

  const toggleValue = (field, value) => (event) => {
    setDraft((current) => normalizeVendorCoverage({
      ...current,
      [field]: event.target.checked
        ? [...current[field], value]
        : current[field].filter((entry) => entry !== value),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    setSubmitError("");
    setSaving(true);
    try {
      await onSaved?.(normalizeVendorCoverage(draft));
    } catch (error) {
      setSubmitError(getVendorErrorMessage(error));
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
        aria-labelledby="normalized-coverage-title"
        className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Vendor Coverage Engine</div>
            <h2 id="normalized-coverage-title" className="mt-1 text-xl font-semibold text-slate-950">Edit Normalized Coverage</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            aria-label="Close Edit Normalized Coverage"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-5 px-5 py-5">
          {submitError ? (
            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>{submitError}</div>
            </div>
          ) : null}

          <section className="grid gap-2" aria-label="Coverage states editor">
            <h3 className="text-sm font-semibold text-slate-950">States</h3>
            <div className="flex flex-wrap gap-2">
              {draft.states.map((stateCode) => (
                <button key={stateCode} type="button" onClick={() => removeState(stateCode)} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  {stateCode} <span className="sr-only">remove</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="coverage-state-code">State code</label>
              <input id="coverage-state-code" value={stateInput} onChange={(event) => setStateInput(event.target.value)} placeholder="State code" className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm" />
              <button type="button" onClick={addState} className="rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Add state</button>
            </div>
          </section>

          <section className="grid gap-2" aria-label="Coverage counties editor">
            <h3 className="text-sm font-semibold text-slate-950">Counties</h3>
            <div className="flex flex-wrap gap-2">
              {draft.counties.map((county) => (
                <button key={`${county.state_code}-${county.county_name}`} type="button" onClick={() => removeCounty(county.state_code, county.county_name)} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  {county.state_code} {county.county_name} <span className="sr-only">remove</span>
                </button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-[0.5fr_1fr_auto]">
              <label className="sr-only" htmlFor="coverage-county-state-code">County state code</label>
              <input id="coverage-county-state-code" value={countyStateInput} onChange={(event) => setCountyStateInput(event.target.value)} placeholder="State code" className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
              <label className="sr-only" htmlFor="coverage-county-name">County name</label>
              <input id="coverage-county-name" value={countyNameInput} onChange={(event) => setCountyNameInput(event.target.value)} placeholder="County name" className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
              <button type="button" onClick={addCounty} className="rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Add county</button>
            </div>
          </section>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-slate-950">Property types</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {COVERAGE_PROPERTY_TYPE_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 rounded-md border border-slate-100 px-3 py-2 text-sm">
                  <input type="checkbox" checked={draft.propertyTypes.includes(option.value)} onChange={toggleValue("propertyTypes", option.value)} />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-slate-950">Assignment types</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {COVERAGE_ASSIGNMENT_TYPE_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 rounded-md border border-slate-100 px-3 py-2 text-sm">
                  <input type="checkbox" checked={draft.assignmentTypes.includes(option.value)} onChange={toggleValue("assignmentTypes", option.value)} />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="inline-flex h-9 items-center justify-center rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
            {saving ? "Saving..." : "Save Normalized Coverage"}
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

  const toggleSelection = (field, key) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: {
        ...current[field],
        [key]: event.target.checked,
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    setFormError("");
    setSubmitError("");

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
      capabilities: selectionToMetadataObject(form.capabilities),
      product_eligibility: selectionToMetadataObject(form.productEligibility),
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
      setSubmitError(getVendorErrorMessage(error));
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
            <h3 id="readiness-section-title" className="text-sm font-semibold text-slate-950">Operational notes</h3>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Default coordination instructions</span>
              <textarea value={form.defaultAssignmentInstructions} onChange={updateField("defaultAssignmentInstructions")} rows={3} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <fieldset className="grid gap-2 rounded-md border border-slate-200 p-3">
                <legend className="px-1 text-sm font-medium text-slate-700">Capabilities</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {VENDOR_CAPABILITY_OPTIONS.map((option) => (
                    <label key={option.slug} className="flex min-h-8 items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.capabilities?.[option.slug] === true}
                        onChange={toggleSelection("capabilities", option.slug)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="grid gap-2 rounded-md border border-slate-200 p-3">
                <legend className="px-1 text-sm font-medium text-slate-700">Product eligibility</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {VENDOR_PRODUCT_TYPES.map((option) => (
                    <label key={option.slug} className="flex min-h-8 items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.productEligibility?.[option.slug] === true}
                        onChange={toggleSelection("productEligibility", option.slug)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
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

function ErrorState({ error, onRetry }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4">
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 shadow-sm">
        <div className="font-semibold">Vendor profile could not load.</div>
        <div className="mt-1">
          {getVendorErrorMessage(error, {
            fallback: "The profile may be unavailable or not authorized for this workspace.",
          })}
        </div>
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
  if (safeContacts.length === 0) return <div>No vendor manager or contacts listed.</div>;

  return (
    <div className="grid gap-3">
      {safeContacts.map((contact) => (
        <div key={contact.vendor_contact_id || contact.id} className="rounded-md border border-slate-100 bg-slate-50 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-slate-900">{contact.name || "Unnamed vendor contact"}</div>
                {contact.is_primary && (
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600">Primary vendor manager</span>
                )}
              </div>
              <div className="mt-1 text-slate-600">
                {[contact.role_label, contact.email, contact.phone].filter(Boolean).join(" · ") || "No contact details"}
              </div>
              {contact.linked_user_display_name && (
                <div className="mt-1 text-xs text-slate-500">Linked Falcon account: {contact.linked_user_display_name}</div>
              )}
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => onEditContact?.(contact)}
                className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Edit Vendor Contact
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function coverageGeographyType(area = {}) {
  if (area.county) return "county";
  if (area.zip) return "zip";
  if (
    area.market ||
    (area.radius_miles !== null && area.radius_miles !== undefined && area.radius_miles !== "")
  ) {
    return "market_radius";
  }
  return "statewide";
}

function coverageGroupKey(area = {}) {
  const state = area.state || "Any";
  const type = coverageGeographyType(area);
  if (type === "market_radius") {
    return [state, type, area.market || "", area.radius_miles ?? ""].join("|");
  }
  return [state, type].join("|");
}

function formatProductSummary(products) {
  const labels = [...products].filter(Boolean).map((product) => getVendorProductTypeLabel(product));
  if (labels.length === 0) return "Any product";
  if (labels.length === 1) return labels[0];
  return `${labels.length} products`;
}

function summarizeCoverageGroup(rows = []) {
  const first = rows[0] || {};
  const state = first.state || "Any";
  const type = coverageGeographyType(first);
  const products = new Set(rows.map((area) => area.product_type).filter(Boolean));
  const productSummary = formatProductSummary(products);

  if (type === "county") {
    const counties = new Set(rows.map((area) => area.county).filter(Boolean));
    const count = counties.size;
    return `${state} · ${count} ${count === 1 ? "county" : "counties"} · ${productSummary}`;
  }

  if (type === "zip") {
    const zips = new Set(rows.map((area) => area.zip).filter(Boolean));
    const count = zips.size;
    return `${state} · ZIP coverage · ${count} ${count === 1 ? "ZIP" : "ZIPs"} · ${productSummary}`;
  }

  if (type === "market_radius") {
    const market = first.market || "Market coverage";
    const radius = first.radius_miles !== null && first.radius_miles !== undefined && first.radius_miles !== ""
      ? `${first.radius_miles} mi`
      : null;
    return [state, market, radius, productSummary].filter(Boolean).join(" · ");
  }

  return `${state} · Statewide · ${productSummary}`;
}

function groupCoverageAreas(serviceAreas = []) {
  const groupsByKey = new Map();

  serviceAreas.forEach((area) => {
    const key = coverageGroupKey(area);
    const existing = groupsByKey.get(key);
    if (existing) {
      existing.rows.push(area);
    } else {
      groupsByKey.set(key, {
        key,
        rows: [area],
      });
    }
  });

  return [...groupsByKey.values()].map((group) => ({
    ...group,
    summary: summarizeCoverageGroup(group.rows),
  }));
}

function buildVendorProfileSummary(profile, contacts = [], serviceAreas = []) {
  const safeContacts = Array.isArray(contacts) ? contacts : [];
  const safeServiceAreas = Array.isArray(serviceAreas) ? serviceAreas : [];
  const coverageGroups = groupCoverageAreas(safeServiceAreas);
  const products = new Set(safeServiceAreas.map((area) => area.product_type).filter(Boolean));
  const primaryContact = safeContacts.find((contact) => contact?.is_primary === true);

  return {
    status: formatStatus(profile?.vendor_status),
    contacts: {
      value: String(safeContacts.length),
      detail: primaryContact ? "Vendor manager listed" : "No vendor manager",
    },
    coverage: {
      value: `${coverageGroups.length} ${coverageGroups.length === 1 ? "Region" : "Regions"}`,
      detail: safeServiceAreas.length === 0 ? "No coverage listed" : `${safeServiceAreas.length} coverage ${safeServiceAreas.length === 1 ? "entry" : "entries"}`,
    },
    products: {
      value: `${products.size} ${products.size === 1 ? "Product" : "Products"}`,
      detail: products.size === 0 ? "No products listed" : "From coverage",
    },
    network: profile?.relationship_status ? formatStatus(profile.relationship_status) : "Staged",
  };
}

function ServiceAreasList({ serviceAreas, canManage = false, onEditServiceArea }) {
  const safeServiceAreas = Array.isArray(serviceAreas) ? serviceAreas : [];
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());
  if (safeServiceAreas.length === 0) return <div>No coverage listed.</div>;

  const coverageGroups = groupCoverageAreas(safeServiceAreas);
  const toggleGroup = (key) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="grid gap-3">
      {coverageGroups.map((group) => {
        const expanded = expandedGroups.has(group.key);
        return (
          <div key={group.key} className="rounded-md border border-slate-100 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium text-slate-900">{group.summary}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {group.rows.length} coverage {group.rows.length === 1 ? "entry" : "entries"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                aria-expanded={expanded}
              >
                {expanded ? "Hide rows" : "View rows"}
              </button>
            </div>

            {expanded ? (
              <div className="mt-3 max-h-72 overflow-auto rounded-md border border-slate-200 bg-white">
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
                    {group.rows.map((area) => (
                      <tr key={area.vendor_service_area_id || area.id}>
                        <td className="px-2 py-2">{formatStatus(area.status)}</td>
                        <td className="px-2 py-2">{area.state || "Any"}</td>
                        <td className="px-2 py-2">{area.county || "Any"}</td>
                        <td className="px-2 py-2">{area.zip || "Any"}</td>
                        <td className="px-2 py-2">{area.market || "Any"}</td>
                        <td className="px-2 py-2">{area.product_type ? getVendorProductTypeLabel(area.product_type) : "Any"}</td>
                        <td className="px-2 py-2">{area.radius_miles ? `${area.radius_miles} mi` : "Not set"}</td>
                        {canManage && (
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => onEditServiceArea?.(area)}
                              className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Edit coverage row
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function VendorProfilePage() {
  const { vendorProfileId } = useParams();
  const { pathname } = useLocation();
  const canUpdateVendor = useCan(PERMISSIONS.VENDORS_UPDATE);
  const canManageContacts = useCan(PERMISSIONS.VENDORS_CONTACTS_MANAGE);
  const canManageServiceAreas = useCan(PERMISSIONS.VENDORS_SERVICE_AREAS_MANAGE);
  const [profile, setProfile] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [serviceAreas, setServiceAreas] = useState([]);
  const [coverage, setCoverage] = useState(() => normalizeVendorCoverage());
  const [coverageMessage, setCoverageMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [contactModalMode, setContactModalMode] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [serviceAreaModalMode, setServiceAreaModalMode] = useState(null);
  const [editingServiceArea, setEditingServiceArea] = useState(null);
  const [bulkCoverageOpen, setBulkCoverageOpen] = useState(false);
  const [normalizedCoverageOpen, setNormalizedCoverageOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!vendorProfileId) {
      setProfile(null);
      setContacts([]);
      setServiceAreas([]);
      setCoverage(normalizeVendorCoverage());
      setLoading(false);
      return;
    }

    try {
      const [detail, contactRows, serviceAreaRows, normalizedCoverage] = await Promise.all([
        getVendorProfileDetail(vendorProfileId),
        getVendorProfileContacts(vendorProfileId),
        getVendorProfileServiceAreas(vendorProfileId),
        getVendorCoverage(vendorProfileId),
      ]);
      setProfile(detail);
      setContacts(Array.isArray(contactRows) ? contactRows : []);
      setServiceAreas(Array.isArray(serviceAreaRows) ? serviceAreaRows : []);
      setCoverage(normalizeVendorCoverage(normalizedCoverage));
    } catch (loadError) {
      console.debug("Vendor profile load failed", {
        code: loadError?.code,
        message: loadError?.message,
      });
      setProfile(null);
      setContacts([]);
      setServiceAreas([]);
      setCoverage(normalizeVendorCoverage());
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [vendorProfileId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const tags = useMemo(() => (Array.isArray(profile?.tags) ? profile.tags.filter(Boolean) : []), [profile]);
  const profileSummary = useMemo(
    () => buildVendorProfileSummary(profile, contacts, serviceAreas),
    [profile, contacts, serviceAreas],
  );

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

  const handleSaveNormalizedCoverage = async (nextCoverage) => {
    const savedCoverage = await saveVendorCoverage(vendorProfileId, normalizeVendorCoverage(nextCoverage));
    setCoverage(normalizeVendorCoverage(savedCoverage));
    setCoverageMessage("Normalized coverage saved.");
    setNormalizedCoverageOpen(false);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={loadProfile} />;
  if (!profile) return <EmptyState />;

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-4 px-3 py-4 sm:px-4">
      <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <Link
          to={buildVendorDirectoryPath(pathname)}
          className="text-sm font-medium text-slate-500 hover:text-slate-800 hover:underline"
        >
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
              <span>Network: {profile.relationship_status ? formatStatus(profile.relationship_status) : "Staged"}</span>
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

      <section aria-label="Vendor summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Status" value={profileSummary.status} />
        <SummaryCard label="Contacts" value={profileSummary.contacts.value} detail={profileSummary.contacts.detail} />
        <SummaryCard label="Coverage" value={profileSummary.coverage.value} detail={profileSummary.coverage.detail} />
        <SummaryCard label="Products" value={profileSummary.products.value} detail={profileSummary.products.detail} />
        <SummaryCard label="Network" value={profileSummary.network} />
      </section>

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

          <DetailCard title="Vendor Manager & Contacts">
            {canManageContacts.allowed && (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={openAddContact}
                  className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add Vendor Contact
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
          <DetailCard title="Coverage">
            <section className="mb-5 rounded-md border border-slate-100 bg-slate-50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">Normalized Coverage</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Structured coverage for future eligibility matching. This does not assign work or request bids.
                  </p>
                  {coverageMessage ? (
                    <div className="mt-2 text-xs font-medium text-emerald-700">{coverageMessage}</div>
                  ) : null}
                </div>
                {canManageServiceAreas.allowed && (
                  <button
                    type="button"
                    onClick={() => {
                      setCoverageMessage("");
                      setNormalizedCoverageOpen(true);
                    }}
                    className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit Normalized Coverage
                  </button>
                )}
              </div>
              <div className="mt-3">
                <NormalizedCoverageSummary coverage={coverage} />
              </div>
            </section>

            {canManageServiceAreas.allowed && (
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setBulkCoverageOpen(true)}
                  className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-slate-950 bg-slate-950 px-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add Coverage
                </button>
                <button
                  type="button"
                  onClick={openAddServiceArea}
                  className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add single coverage row
                </button>
              </div>
            )}
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Legacy service-area rows
            </div>
            <ServiceAreasList
              serviceAreas={serviceAreas}
              canManage={canManageServiceAreas.allowed}
              onEditServiceArea={openEditServiceArea}
            />
          </DetailCard>

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

          <DetailCard title="Operational Notes">
            <div className="grid gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Default coordination instructions</div>
                <div className="mt-1 whitespace-pre-wrap">{profile.default_assignment_instructions || "No default instructions listed."}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Capabilities</div>
                <div className="mt-1">{renderMetadataSummary(profile.capabilities, VENDOR_CAPABILITY_LABELS)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Product eligibility</div>
                <div className="mt-1">{renderMetadataSummary(profile.product_eligibility, VENDOR_PRODUCT_TYPE_LABELS)}</div>
              </div>
            </div>
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
      <BulkCoverageModal
        open={bulkCoverageOpen}
        vendorProfileId={vendorProfileId}
        onClose={() => setBulkCoverageOpen(false)}
        onSaved={async () => {
          await loadProfile();
          setBulkCoverageOpen(false);
        }}
      />
      <NormalizedCoverageModal
        open={normalizedCoverageOpen}
        coverage={coverage}
        onClose={() => setNormalizedCoverageOpen(false)}
        onSaved={handleSaveNormalizedCoverage}
      />
    </main>
  );
}
