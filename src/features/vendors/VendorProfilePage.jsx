import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getVendorProfileContacts,
  getVendorProfileDetail,
  getVendorProfileServiceAreas,
} from "./api";

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

function DetailCard({ title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 text-sm text-slate-600">{children}</div>
    </section>
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

function ContactsList({ contacts }) {
  const safeContacts = Array.isArray(contacts) ? contacts : [];
  if (safeContacts.length === 0) return <div>No contacts listed.</div>;

  return (
    <div className="grid gap-3">
      {safeContacts.map((contact) => (
        <div key={contact.vendor_contact_id || contact.id} className="rounded-md border border-slate-100 bg-slate-50 p-3">
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
      ))}
    </div>
  );
}

function ServiceAreasList({ serviceAreas }) {
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function VendorProfilePage() {
  const { vendorProfileId } = useParams();
  const [profile, setProfile] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [serviceAreas, setServiceAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          <div className="text-xs text-slate-400">Updated {formatDate(profile.updated_at)}</div>
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
            <ContactsList contacts={contacts} />
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
            <ServiceAreasList serviceAreas={serviceAreas} />
          </DetailCard>
        </div>
      </div>
    </main>
  );
}
