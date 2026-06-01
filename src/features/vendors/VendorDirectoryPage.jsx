import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, Search, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useCan } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { createVendorProfile, listVendorDirectory } from "./api";
import CoverageBuilder from "./coverage/CoverageBuilder";
import { getVendorProductTypeLabel } from "./coverage/productTypes";
import { getVendorErrorMessage } from "./vendorErrors";

const VENDOR_STATUS_OPTIONS = Object.freeze([
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "preferred", label: "Preferred" },
  { value: "pending", label: "Pending" },
  { value: "probation", label: "Probation" },
  { value: "inactive", label: "Inactive" },
  { value: "do_not_use", label: "Do not use" },
]);

function formatDateTime(value) {
  if (!value) return "Not updated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not updated";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatStatus(value) {
  if (!value) return "Unknown";
  return String(value)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function summarizeServiceAreas(summary = {}) {
  if (!summary || typeof summary !== "object") return "No active coverage";

  const activeCount = Number(summary.active_count ?? 0);
  const states = Array.isArray(summary.states) ? summary.states.filter(Boolean) : [];
  const counties = Array.isArray(summary.counties) ? summary.counties.filter(Boolean) : [];
  const markets = Array.isArray(summary.markets) ? summary.markets.filter(Boolean) : [];

  const locationParts = [
    states.slice(0, 3).join(", "),
    counties.slice(0, 2).join(", "),
    markets.slice(0, 2).join(", "),
  ].filter(Boolean);

  if (!activeCount && locationParts.length === 0) return "No active coverage";
  return [activeCount ? `${activeCount} active` : null, ...locationParts].filter(Boolean).join(" · ");
}

function summarizeProductEligibility(productEligibility = {}) {
  if (!productEligibility || typeof productEligibility !== "object" || Object.keys(productEligibility).length === 0) {
    return "No product summary";
  }

  const enabledKeys = Object.entries(productEligibility)
    .filter(([, value]) => value === true || value === "true" || value === "eligible")
    .map(([key]) => getVendorProductTypeLabel(key) || formatStatus(key));

  if (enabledKeys.length > 0) return enabledKeys.slice(0, 4).join(", ");
  return "Product eligibility noted";
}

function LoadingState() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
      Loading vendors...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
      No vendors found.
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 shadow-sm">
      <div className="font-semibold">Vendor Directory could not load.</div>
      <div className="mt-1">
        {getVendorErrorMessage(error, {
          fallback: "Vendor Directory could not load. Please try again.",
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
  );
}

const EMPTY_VENDOR_FORM = Object.freeze({
  vendorCompanyName: "",
  website: "",
  publicPhone: "",
  vendorStatus: "active",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  contactRoleLabel: "",
  tags: "",
  defaultAssignmentInstructions: "",
  internalNotes: "",
});

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

function assignIfPresent(target, key, value) {
  if (value !== null && value !== undefined && value !== "") {
    target[key] = value;
  }
}

function AddVendorModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_VENDOR_FORM);
  const [formError, setFormError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [coverageRows, setCoverageRows] = useState([]);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_VENDOR_FORM);
    setFormError("");
    setSubmitError("");
    setCoverageRows([]);
  }, [open]);

  if (!open) return null;

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setFormError("");
    setSubmitError("");

    const vendorCompanyName = textOrNull(form.vendorCompanyName);
    if (!vendorCompanyName) {
      setFormError("Vendor company name is required.");
      return;
    }

    const hasContactDetail = [
      form.contactName,
      form.contactEmail,
      form.contactPhone,
      form.contactRoleLabel,
    ].some((value) => textOrNull(value));
    const contactName = textOrNull(form.contactName);
    if (hasContactDetail && !contactName) {
      setFormError("Primary contact name is required when contact details are entered.");
      return;
    }

    const tags = tagsFromText(form.tags);

    const payload = {
      vendor_company: {
        name: vendorCompanyName,
      },
      create_relationship: true,
      vendor_status: form.vendorStatus || "active",
    };
    assignIfPresent(payload, "website", textOrNull(form.website));
    assignIfPresent(payload, "public_phone", textOrNull(form.publicPhone));
    assignIfPresent(
      payload,
      "default_assignment_instructions",
      textOrNull(form.defaultAssignmentInstructions),
    );
    assignIfPresent(payload, "internal_notes", textOrNull(form.internalNotes));
    if (tags.length > 0) {
      payload.tags = tags;
    }

    if (hasContactDetail) {
      const primaryContact = {
        name: contactName,
      };
      assignIfPresent(primaryContact, "email", textOrNull(form.contactEmail));
      assignIfPresent(primaryContact, "phone", textOrNull(form.contactPhone));
      assignIfPresent(primaryContact, "role_label", textOrNull(form.contactRoleLabel));
      payload.primary_contact = primaryContact;
    }

    if (coverageRows.length > 0) {
      payload.service_areas = coverageRows.map((row) => ({
        state: row.state || null,
        county: row.county || null,
        zip: row.zip || null,
        market: row.market || null,
        radius_miles: row.radius_miles ?? null,
        product_type: row.product_type || null,
        status: "active",
      }));
    }

    setSubmitting(true);
    try {
      const created = await createVendorProfile(payload);
      await onCreated?.(created);
      setForm(EMPTY_VENDOR_FORM);
      setCoverageRows([]);
    } catch (error) {
      console.debug("Vendor create failed", {
        code: error?.code,
        message: error?.message,
      });
      setSubmitError(getVendorErrorMessage(error, {
        selfVendorMessage: true,
        permissionMessage: "You do not have permission to add vendors.",
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose?.();
      }}
    >
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-vendor-title"
        className="w-full max-w-4xl rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Vendor Network</div>
            <h2 id="add-vendor-title" className="mt-1 text-xl font-semibold text-slate-950">Add Vendor</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            aria-label="Close Add Vendor"
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

          <section className="grid gap-3" aria-labelledby="vendor-company-section-title">
            <h3 id="vendor-company-section-title" className="text-sm font-semibold text-slate-950">Vendor company</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Vendor company name</span>
                <input
                  value={form.vendorCompanyName}
                  onChange={updateField("vendorCompanyName")}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Vendor status</span>
                <select
                  value={form.vendorStatus}
                  onChange={updateField("vendorStatus")}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                >
                  {VENDOR_STATUS_OPTIONS.filter((option) => option.value).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Website</span>
                <input
                  value={form.website}
                  onChange={updateField("website")}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Public phone</span>
                <input
                  value={form.publicPhone}
                  onChange={updateField("publicPhone")}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                />
              </label>
            </div>
          </section>

          <section className="grid gap-3" aria-labelledby="primary-contact-section-title">
            <h3 id="primary-contact-section-title" className="text-sm font-semibold text-slate-950">Primary contact</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Contact name</span>
                <input value={form.contactName} onChange={updateField("contactName")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Contact email</span>
                <input value={form.contactEmail} onChange={updateField("contactEmail")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Contact phone</span>
                <input value={form.contactPhone} onChange={updateField("contactPhone")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Role label</span>
                <input value={form.contactRoleLabel} onChange={updateField("contactRoleLabel")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
              </label>
            </div>
          </section>

          <section className="grid gap-3" aria-labelledby="coverage-section-title">
            <h3 id="coverage-section-title" className="text-sm font-semibold text-slate-950">Coverage</h3>
            <p className="text-sm text-slate-500">
              Coverage is used for directory visibility and future vendor matching. It does not assign work automatically.
            </p>
            <CoverageBuilder onRowsChange={setCoverageRows} />
          </section>

          <section className="grid gap-3">
            <h3 id="internal-notes-section-title" className="text-sm font-semibold text-slate-950">Internal notes</h3>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Tags</span>
              <input
                value={form.tags}
                onChange={updateField("tags")}
                placeholder="preferred, commercial"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Default coordination instructions</span>
              <textarea value={form.defaultAssignmentInstructions} onChange={updateField("defaultAssignmentInstructions")} rows={3} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Internal notes</span>
              <textarea value={form.internalNotes} onChange={updateField("internalNotes")} rows={3} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
            </label>
          </section>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? "Adding..." : "Add Vendor"}
          </button>
        </div>
      </form>
    </div>
  );
}

function VendorDirectoryRow({ vendor }) {
  const tags = Array.isArray(vendor.tags) ? vendor.tags.filter(Boolean) : [];
  const contact = [
    vendor.primary_contact_name,
    vendor.primary_contact_email,
    vendor.primary_contact_phone,
  ].filter(Boolean).join(" · ");

  const detailPath = vendor.vendor_profile_id ? `/vendors/${vendor.vendor_profile_id}` : null;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-slate-950">
            {detailPath ? (
              <Link to={detailPath} className="hover:text-slate-700 hover:underline">
                {vendor.vendor_company_name || "Unnamed vendor"}
              </Link>
            ) : (
              vendor.vendor_company_name || "Unnamed vendor"
            )}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
              {formatStatus(vendor.vendor_status)}
            </span>
            <span>Network: {vendor.relationship_status ? formatStatus(vendor.relationship_status) : "Staged"}</span>
          </div>
        </div>
        <div className="text-xs text-slate-400">Updated {formatDateTime(vendor.updated_at)}</div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Contact</div>
          <div className="mt-1">{contact || "No primary contact"}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Coverage</div>
          <div className="mt-1">{summarizeServiceAreas(vendor.service_area_summary)}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Products</div>
          <div className="mt-1">{summarizeProductEligibility(vendor.product_eligibility)}</div>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.slice(0, 8).map((tag) => (
            <span key={tag} className="rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export default function VendorDirectoryPage() {
  const navigate = useNavigate();
  const canCreateVendor = useCan(PERMISSIONS.VENDORS_CREATE);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const filters = useMemo(() => ({ status: status || null, query: query || null }), [query, status]);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listVendorDirectory(filters);
      setVendors(Array.isArray(rows) ? rows : []);
    } catch (loadError) {
      console.debug("Vendor Directory load failed", {
        code: loadError?.code,
        message: loadError?.message,
      });
      setVendors([]);
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const handleVendorCreated = async (created) => {
    setAddVendorOpen(false);
    await loadVendors();
    if (created?.vendor_profile_id) {
      navigate(`/vendors/${created.vendor_profile_id}`);
    }
  };

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-4 px-3 py-4 sm:px-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Vendor Network</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Vendor Directory</h1>
        </div>
        {canCreateVendor.allowed && (
          <button
            type="button"
            onClick={() => setAddVendorOpen(true)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Vendor
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <label className="relative min-w-[240px] flex-1">
          <span className="sr-only">Search vendors</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search vendors"
            className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 shadow-sm outline-none focus:border-slate-400"
          />
        </label>
        <label>
          <span className="sr-only">Vendor status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400"
          >
            {VENDOR_STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={loadVendors} />
      ) : vendors.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="grid gap-3" aria-label="Vendor Directory results">
          {vendors.map((vendor, index) => (
            <VendorDirectoryRow
              key={vendor.vendor_profile_id || `${vendor.vendor_company_id || "vendor"}-${index}`}
              vendor={vendor}
            />
          ))}
        </section>
      )}

      <AddVendorModal
        open={addVendorOpen}
        onClose={() => setAddVendorOpen(false)}
        onCreated={handleVendorCreated}
      />
    </main>
  );
}
