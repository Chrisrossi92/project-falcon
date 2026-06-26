import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchVendorWorkspaceProfile } from "@/features/vendorWorkspace/api.js";

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function firstPresent(...values) {
  return values.find((value) => value !== null && value !== undefined && String(value).trim() !== "");
}

function formatDate(value) {
  if (!value) return "Not configured";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function fieldFrom(source = {}, keys = []) {
  if (!source || typeof source !== "object") return undefined;
  for (const key of keys) {
    const value = source[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") return value;
  }
  return undefined;
}

function sectionStatus(hasData) {
  return hasData ? "Available" : "Not configured";
}

function StatusPill({ children, tone = "slate" }) {
  const tones = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

function Section({ title, status, children, description }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        {status ? <StatusPill tone={status === "Available" ? "green" : "slate"}>{status}</StatusPill> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DetailGrid({ rows }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</dt>
          <dd className="mt-1 break-words text-sm font-medium text-slate-800">{value || "Not configured"}</dd>
        </div>
      ))}
    </dl>
  );
}

function EmptyState({ children }) {
  return (
    <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm leading-6 text-slate-500">
      {children}
    </p>
  );
}

function normalizeCredentialModel(profile = {}) {
  const company = profile.company || {};
  const compliance = profile.compliance || {};
  const primaryContact = profile.primary_contact || null;
  const contacts = asArray(profile.contacts);
  const credentialSource = profile.credentials || profile.credential_summary || {};
  const licenseSource = profile.license || profile.appraiser_license || credentialSource.license || {};
  const licenses = asArray(profile.licenses || credentialSource.licenses);
  const eoSource = profile.eo_insurance || profile.e_and_o || profile.insurance || credentialSource.eo_insurance || {};
  const documents = asArray(profile.documents || profile.credential_documents || credentialSource.documents);
  const resumeDocuments = documents.filter((document) => {
    const category = String(document?.category || document?.document_type || document?.type || "").toLowerCase();
    return category.includes("resume") || category.includes("résumé") || category.includes("qualification");
  });
  const signers = asArray(
    profile.authorized_report_signers ||
      profile.report_signers ||
      credentialSource.authorized_report_signers ||
      credentialSource.report_signers,
  );
  const fallbackSigner = !signers.length && primaryContact
    ? [{
      name: primaryContact.name,
      email: primaryContact.email,
      phone: primaryContact.phone,
      role_label: primaryContact.role_label || "Primary vendor contact",
      source_note: "Current primary contact shown until structured signer tracking is configured.",
    }]
    : [];
  const visibleSigners = signers.length ? signers : fallbackSigner;
  const licenseNumber = firstPresent(
    fieldFrom(licenseSource, ["license_number", "number", "licenseNumber"]),
    licenses[0]?.license_number,
    licenses[0]?.number,
  );
  const licenseState = firstPresent(
    fieldFrom(licenseSource, ["state", "license_state", "licenseState"]),
    licenses[0]?.state,
    licenses[0]?.license_state,
  );
  const licenseExpiresAt = firstPresent(
    fieldFrom(licenseSource, ["expires_at", "expiration_date", "license_expires_at", "license_expiration"]),
    licenses[0]?.expires_at,
    licenses[0]?.expiration_date,
  );
  const eoCarrier = firstPresent(fieldFrom(eoSource, ["carrier", "provider", "insurance_carrier", "eo_carrier"]));
  const eoPolicyNumber = firstPresent(fieldFrom(eoSource, ["policy_number", "policyNumber", "eo_policy_number"]));
  const eoExpiresAt = firstPresent(fieldFrom(eoSource, ["expires_at", "expiration_date", "eo_expires_at", "eo_expiration"]));

  return {
    company,
    compliance,
    contacts,
    primaryContact,
    license: {
      hasData: Boolean(licenseNumber || licenseState || licenseExpiresAt || compliance.license_status),
      number: licenseNumber,
      state: licenseState,
      expiresAt: licenseExpiresAt,
      status: compliance.license_status,
    },
    insurance: {
      hasData: Boolean(eoCarrier || eoPolicyNumber || eoExpiresAt || compliance.insurance_status),
      carrier: eoCarrier,
      policyNumber: eoPolicyNumber,
      expiresAt: eoExpiresAt,
      status: compliance.insurance_status,
    },
    resumeDocuments,
    signers: visibleSigners,
    hasStructuredSigners: signers.length > 0,
    documentCount: Number.isFinite(Number(compliance.document_count)) ? Number(compliance.document_count) : documents.length,
    lastUpdatedAt: firstPresent(compliance.last_updated_at, profile.last_updated_at),
  };
}

export default function VendorCredentialsPage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async ({ cancelled } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchVendorWorkspaceProfile();
      if (cancelled?.()) return;
      if (result.ok && result.profile) {
        setProfile(result.profile);
      } else {
        setProfile(null);
        setError(new Error("Vendor credentials unavailable"));
      }
    } catch (err) {
      if (!cancelled?.()) setError(err);
    } finally {
      if (!cancelled?.()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    loadProfile({ cancelled: () => isCancelled });
    return () => {
      isCancelled = true;
    };
  }, [loadProfile]);

  const credentials = useMemo(() => normalizeCredentialModel(profile || {}), [profile]);
  const missingItems = [
    credentials.license.hasData ? null : "License tracking is not configured yet.",
    credentials.insurance.hasData ? null : "E&O tracking is not configured yet.",
    credentials.resumeDocuments.length ? null : "Credential uploads will be available in a later release.",
    credentials.hasStructuredSigners ? null : "Authorized report signer tracking is not configured yet.",
  ].filter(Boolean);

  if (loading) {
    return (
      <div
        aria-label="Loading vendor credentials"
        className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm"
        role="status"
      >
        Loading vendor credentials...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
        <div>Vendor credentials unavailable. Confirm your vendor profile is active or contact the AMC coordinator.</div>
        <button
          className="mt-4 rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          type="button"
          onClick={() => loadProfile()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Vendor Workspace
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Credentials</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Review credential status, signer information, and future expiration tracking for this vendor profile.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="blue">Read-only for now</StatusPill>
            <StatusPill>Reminders planned</StatusPill>
          </div>
        </div>
      </header>

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
        This page is read-only for now. Expiration reminders are planned but not active yet.
      </div>

      <Section title="Credential Overview" status="Available">
        <DetailGrid
          rows={[
            ["Vendor company", credentials.company.name],
            ["Primary contact", credentials.primaryContact?.name],
            ["Compliance status", credentials.compliance.status],
            ["License status", credentials.compliance.license_status],
            ["E&O status", credentials.compliance.insurance_status],
            ["Credential documents", credentials.documentCount ? String(credentials.documentCount) : "Not configured"],
            ["Last updated", formatDate(credentials.lastUpdatedAt)],
          ]}
        />
      </Section>

      <Section
        title="License Status"
        status={sectionStatus(credentials.license.hasData)}
        description="License tracking will support report signers and expiration review when structured data is available."
      >
        {credentials.license.hasData ? (
          <DetailGrid
            rows={[
              ["License number", credentials.license.number],
              ["State", credentials.license.state],
              ["Expiration", formatDate(credentials.license.expiresAt)],
              ["Status", credentials.license.status],
            ]}
          />
        ) : (
          <EmptyState>License tracking is not configured yet.</EmptyState>
        )}
      </Section>

      <Section
        title="E&O Insurance"
        status={sectionStatus(credentials.insurance.hasData)}
        description="E&O tracking will support expiration reminders when structured policy data is available."
      >
        {credentials.insurance.hasData ? (
          <DetailGrid
            rows={[
              ["Carrier", credentials.insurance.carrier],
              ["Policy number", credentials.insurance.policyNumber],
              ["Expiration", formatDate(credentials.insurance.expiresAt)],
              ["Status", credentials.insurance.status],
            ]}
          />
        ) : (
          <EmptyState>E&O tracking is not configured yet.</EmptyState>
        )}
      </Section>

      <Section title="Résumé / Qualifications" status={credentials.resumeDocuments.length ? "Available" : "Not configured"}>
        {credentials.resumeDocuments.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {credentials.resumeDocuments.map((document, index) => (
              <div key={document.document_key || document.id || `${document.file_name || "credential"}-${index}`} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-sm font-semibold text-slate-800">{document.title || document.file_name || "Credential document"}</div>
                <div className="mt-1 text-xs text-slate-500">{document.category || document.document_type || "Credential document"}</div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Credential uploads will be available in a later release.</EmptyState>
        )}
      </Section>

      <Section
        title="Authorized Report Signers"
        status={credentials.hasStructuredSigners ? "Available" : "Not configured"}
        description="Falcon only needs to track report signers/signatures, not every appraiser at the vendor company."
      >
        {credentials.signers.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {credentials.signers.map((signer, index) => (
              <div key={`${signer.name || "signer"}-${signer.email || index}`} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-sm font-semibold text-slate-800">{signer.name || "Report signer"}</div>
                <div className="mt-1 text-xs text-slate-500">{signer.role_label || signer.title || "Report signer"}</div>
                <div className="mt-1 text-sm text-slate-600">{[signer.email, signer.phone].filter(Boolean).join(" · ") || "No contact details listed"}</div>
                {signer.source_note ? <div className="mt-2 text-xs text-slate-500">{signer.source_note}</div> : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Authorized report signer tracking is not configured yet.</EmptyState>
        )}
      </Section>

      <Section
        title="Expiration Reminders"
        status="Not configured"
        description="Preview only. Reminder automation is planned but not active yet."
      >
        <DetailGrid
          rows={[
            ["License expiration", formatDate(credentials.license.expiresAt)],
            ["E&O expiration", formatDate(credentials.insurance.expiresAt)],
            ["Reminder status", "Expiration reminders are planned but not active yet."],
          ]}
        />
      </Section>

      <Section title="Missing Information" status={missingItems.length ? "Not configured" : "Available"}>
        {missingItems.length ? (
          <ul className="grid gap-2">
            {missingItems.map((item) => (
              <li key={item} className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>No obvious credential gaps were found in the current vendor profile data.</EmptyState>
        )}
      </Section>
    </div>
  );
}
