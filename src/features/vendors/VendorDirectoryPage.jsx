import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";

import { listVendorDirectory } from "./api";

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
    .map(([key]) => formatStatus(key));

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

function ErrorState({ onRetry }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 shadow-sm">
      <div className="font-semibold">Vendor Directory could not load.</div>
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
            <span>{vendor.relationship_status ? formatStatus(vendor.relationship_status) : "Staged"}</span>
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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-4 px-3 py-4 sm:px-4">
      <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Vendor Network</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Vendor Directory</h1>
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
        <ErrorState onRetry={loadVendors} />
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
    </main>
  );
}
