import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

import {
  COMPANY_READINESS_ITEM_STATUSES,
  COMPANY_READINESS_SEVERITIES,
  resolveCompanyReadiness,
} from "../../lib/companyBootstrap/companyReadinessResolver.js";
import { useCompanySetupContext } from "../../features/company-setup/useCompanySetupContext.js";
import { updateCompanyProfile } from "../../features/company-setup/companyProfileApi.js";
import { completeOwnerSetup } from "../../features/company-setup/ownerSetupStateApi.js";
import {
  OWNER_SETUP_SECTION_STATUSES,
  mapOwnerSetupReadiness,
} from "../../features/company-setup/ownerSetupReadinessMapper.js";
import { useCan } from "../../lib/hooks/usePermissions.js";
import { PERMISSIONS } from "../../lib/permissions/constants.js";

const SAMPLE_GENERATED_AT = "2026-05-19T00:00:00.000Z";
const TEAM_ACCESS_ROUTE = "/users";

const SAMPLE_SETUP_CONTEXT = Object.freeze({
  company_id: "sample-owner-setup-company",
  company_status: "active",
  active_company_context_valid: true,
  profile_complete: true,
  owner_invariant_ok: true,
  active_owner_count: 1,
  active_member_count: 1,
  role_presets_ready: true,
  owner_role_ready: true,
  audit_readiness: Object.freeze({
    has_bootstrap_audit: true,
  }),
  dashboard_readiness: Object.freeze({
    has_any_dashboard: true,
  }),
  invitation_summary: Object.freeze({
    pending_count: 0,
  }),
});

const SAMPLE_READINESS = resolveCompanyReadiness(SAMPLE_SETUP_CONTEXT, {
  generatedAt: SAMPLE_GENERATED_AT,
});

const STATUS_STYLES = Object.freeze({
  Available: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Complete: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Ready: "border-slate-200 bg-slate-50 text-slate-700",
  "Needs attention": "border-amber-200 bg-amber-50 text-amber-800",
  "Coming later": "border-sky-200 bg-sky-50 text-sky-800",
  Optional: "border-sky-200 bg-sky-50 text-sky-800",
  "Diagnostic only": "border-indigo-200 bg-indigo-50 text-indigo-800",
  Deferred: "border-slate-200 bg-slate-100 text-slate-600",
});

const NO_GO_RULES = Object.freeze([
  "Setup progress does not grant access.",
  "Permissions, RLS policies, and guarded RPCs remain the runtime authority.",
  "Only the Company Profile card has a narrow guarded save path.",
  "Product-mode and module metadata cannot authorize visibility or security.",
  "Vendor and Client live shells are not opened from setup guidance.",
]);

const TIMEZONE_OPTIONS = Object.freeze([
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
]);

function safeCompanyProfileError(error) {
  const message = String(error?.message || "");
  if (message.includes("company_name_required")) return "Enter a company name.";
  if (message.includes("company_name_too_long")) return "Use a company name under 160 characters.";
  if (message.includes("company_timezone_required") || message.includes("invalid_company_timezone")) {
    return "Choose a supported timezone.";
  }
  if (message.includes("company_locale_required") || message.includes("invalid_company_locale")) {
    return "Choose a supported locale.";
  }
  if (
    message.includes("company_update_profile_permission_required")
    || message.includes("current_company_membership_required")
    || message.includes("company_inactive")
    || error?.code === "42501"
  ) {
    return "Falcon could not update this company profile with your current permissions.";
  }
  return "Falcon could not update this company profile.";
}

function safeCompleteSetupError(error) {
  const message = String(error?.message || "");
  if (message.includes("owner_setup_minimum_readiness_required")) {
    return "Falcon could not complete setup because required setup is still missing. Review the required sections and try again.";
  }
  if (
    message.includes("owner_setup_manage_permission_required")
    || message.includes("current_company_membership_required")
    || message.includes("company_inactive")
    || error?.code === "42501"
  ) {
    return "Falcon could not complete setup with your current permissions.";
  }
  return "Falcon could not complete setup.";
}

const formatSeverityCounts = (counts = {}) =>
  Object.entries(counts)
    .map(([severity, count]) => `${severity}: ${count}`)
    .join(", ");

const getReadinessStatusLabel = (readiness) =>
  readiness?.blockingItems?.length || readiness?.warningItems?.length ? "Needs attention" : "Ready";

const OWNER_SETUP_STATUS_LABELS = Object.freeze({
  [OWNER_SETUP_SECTION_STATUSES.COMPLETE]: "Complete",
  [OWNER_SETUP_SECTION_STATUSES.NEEDS_ATTENTION]: "Needs attention",
  [OWNER_SETUP_SECTION_STATUSES.OPTIONAL]: "Optional",
  [OWNER_SETUP_SECTION_STATUSES.DEFERRED]: "Deferred",
  [OWNER_SETUP_SECTION_STATUSES.DIAGNOSTIC_ONLY]: "Diagnostic only",
});

const getOwnerSetupStatusLabel = (status) => OWNER_SETUP_STATUS_LABELS[status] || "Optional";

function StatusBadge({ status }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] || STATUS_STYLES.Deferred
      }`}
    >
      {status}
    </span>
  );
}

function SetupProgressSummary({
  setupCompleted,
  setupReadiness,
  completingSetup,
  completionError,
  onCompleteSetup,
}) {
  const minimumStatus = setupCompleted
    ? "Setup complete"
    : setupReadiness.minimumReady
      ? "Minimum ready"
      : "Needs setup";
  const incompleteRequiredSections = setupReadiness.sections.filter(
    (section) => section.requiredForMinimumReadiness && !section.completed,
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Company Setup
          </div>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            What needs to be done before Falcon is operational?
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Complete the required company setup sections first. Optional and deferred sections can
            be reviewed later when the related governed settings are ready.
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-left lg:min-w-48">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Minimum readiness
          </div>
          <div className="mt-1 text-lg font-semibold text-slate-950">{minimumStatus}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <ReadinessMetric
          label="Progress"
          value={`${setupReadiness.percentComplete}%`}
          helper="Required company setup sections complete."
        />
        <ReadinessMetric
          label="Required Complete"
          value={setupReadiness.completedRequiredSections}
          helper="Required sections completed."
        />
        <ReadinessMetric
          label="Required Sections"
          value={setupReadiness.requiredSections}
          helper="Needed for minimum readiness."
        />
        <ReadinessMetric
          label="Next Step"
          value={setupReadiness.minimumReady ? "Ready" : "Review"}
          helper={setupReadiness.nextRecommendedAction}
        />
      </div>

      <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
        {setupCompleted ? (
          <div>
            <div className="text-sm font-semibold text-slate-950">Setup complete</div>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Setup is complete. Dashboard setup guidance will no longer appear for this company.
            </p>
          </div>
        ) : setupReadiness.minimumReady ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-950">
                Required setup is ready.
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Complete setup records launch readiness without changing permissions, routes, or
                dashboard banner behavior.
              </p>
            </div>
            <button
              type="button"
              onClick={onCompleteSetup}
              disabled={completingSetup}
              className="inline-flex rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {completingSetup ? "Completing..." : "Complete setup"}
            </button>
          </div>
        ) : (
          <div>
            <div className="text-sm font-semibold text-slate-950">
              Complete the required sections first.
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {setupReadiness.nextRecommendedAction}
            </p>
            {incompleteRequiredSections.length ? (
              <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                {incompleteRequiredSections.map((section) => (
                  <li key={section.id}>{section.title}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
        {completionError ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {completionError}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function OwnerSetupSectionCard({ section, setupContextState, canOpenTeamAccess = false }) {
  const statusLabel = getOwnerSetupStatusLabel(section.status);

  if (section.id === "company_profile") {
    return (
      <CompanyProfileCard
        setupContextState={setupContextState}
        section={section}
        statusLabel={statusLabel}
      />
    );
  }

  return (
    <article
      className="rounded-lg border border-slate-200 bg-white p-4"
      aria-label={`${section.title} setup section`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{section.title}</h3>
          {section.requiredForMinimumReadiness ? (
            <p className="mt-1 text-xs font-medium text-slate-500">Required for minimum readiness</p>
          ) : (
            <p className="mt-1 text-xs font-medium text-slate-500">Not required for launch</p>
          )}
        </div>
        <StatusBadge status={statusLabel} />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{section.description}</p>
      {section.missingItems.length ? (
        <ul className="mt-3 space-y-1 text-sm leading-6 text-slate-600">
          {section.missingItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {section.id === "team_access" && canOpenTeamAccess ? (
        <div className="mt-4">
          <Link
            to={TEAM_ACCESS_ROUTE}
            className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Open Team Access
          </Link>
        </div>
      ) : null}
      {section.status === OWNER_SETUP_SECTION_STATUSES.DEFERRED ? (
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
          <span className="font-medium text-slate-800">Planned later:</span>{" "}
          This section is intentionally waiting on a governed backend, storage, or settings model.
        </p>
      ) : null}
    </article>
  );
}

function OwnerSetupSections({ setupReadiness, setupContextState, canOpenTeamAccess }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-950">Company Setup Sections</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Required sections are the minimum practical setup needed before Falcon can be treated as
          operational. Optional and deferred sections are visible for planning but do not block
          minimum readiness.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {setupReadiness.sections.map((section) => (
          <OwnerSetupSectionCard
            key={section.id}
            section={section}
            setupContextState={setupContextState}
            canOpenTeamAccess={canOpenTeamAccess}
          />
        ))}
      </div>
    </section>
  );
}

const getUnknownItems = (readiness) =>
  readiness.checklistItems.filter(
    (item) => item.severity === COMPANY_READINESS_SEVERITIES.UNKNOWN,
  );

const getDeferredItems = (readiness) =>
  readiness.checklistItems.filter(
    (item) => item.severity === COMPANY_READINESS_SEVERITIES.DEFERRED,
  );

const getWarningItems = (readiness) =>
  readiness.checklistItems.filter(
    (item) =>
      item.severity === COMPANY_READINESS_SEVERITIES.WARNING
      && item.status !== COMPANY_READINESS_ITEM_STATUSES.PASS,
  );

function ReadinessMetric({ label, value, helper }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-xs leading-5 text-slate-600">{helper}</div>
    </div>
  );
}

function ReadinessSummary({ readiness, heading, label, description, emptyBlockingLabel }) {
  const unknownItems = getUnknownItems(readiness);
  const deferredItems = getDeferredItems(readiness);
  const warningItems = getWarningItems(readiness);
  const unresolvedCount = unknownItems.length + deferredItems.length;

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </div>
          {label.toLowerCase().includes("readiness") ? (
            <StatusBadge status="Diagnostic only" />
          ) : null}
        </div>
        <h2 className="mt-1 text-base font-semibold text-slate-950">{heading}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <div className="grid gap-4 px-5 py-4 md:grid-cols-3">
        <ReadinessMetric
          label="Blockers"
          value={readiness.blockingItems.length}
          helper={
            readiness.blockingItems.length
              ? "Review before relying on operational setup guidance."
              : "No blocker reported by this diagnostic."
          }
        />
        <ReadinessMetric
          label="Warnings"
          value={warningItems.length}
          helper={
            warningItems.length
              ? "Non-blocking setup items need review."
              : "No warning reported by this diagnostic."
          }
        />
        <ReadinessMetric
          label="Unknown / Deferred"
          value={unresolvedCount}
          helper="Items intentionally waiting on future models."
        />
      </div>
      <div className="grid gap-4 border-t border-slate-200 px-5 py-4 md:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Diagnostic Status
          </div>
          <div className="mt-1 text-lg font-semibold text-slate-950">{readiness.status}</div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Severity Counts
          </div>
          <div className="mt-1 text-sm text-slate-700">
            {formatSeverityCounts(readiness.severityCounts)}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Blocker Keys
          </div>
          <div className="mt-1 text-sm text-slate-700">
            {readiness.blockingItems.length
              ? readiness.blockingItems.join(", ")
              : emptyBlockingLabel}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Unknown Keys
          </div>
          <div className="mt-1 text-sm text-slate-700">
            {unknownItems.map((item) => item.key).join(", ")}
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200 px-5 py-4 text-sm text-slate-600">
        <span className="font-medium text-slate-800">Next diagnostic action:</span>{" "}
        {readiness.nextRecommendedAction}
      </div>
    </section>
  );
}

function CompanyProfileCard({ setupContextState, section, statusLabel }) {
  const liveContext = setupContextState.data;
  const [values, setValues] = useState({
    name: "",
    timezone: "America/New_York",
    locale: "en-US",
  });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!liveContext) return;

    setValues({
      name: liveContext.company_name || "",
      timezone: liveContext.timezone || "America/New_York",
      locale: liveContext.locale || "en-US",
    });
    setErrorMessage("");
  }, [liveContext]);

  const canSubmit = useMemo(
    () => Boolean(liveContext) && values.name.trim().length > 0 && !saving,
    [liveContext, saving, values.name],
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    if (!liveContext) {
      const message = "Live setup context is required before saving the company profile.";
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    if (!values.name.trim()) {
      const message = "Enter a company name.";
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    const patch = {
      name: values.name.trim(),
      timezone: values.timezone,
      locale: values.locale,
    };

    try {
      setSaving(true);
      await updateCompanyProfile(patch);
      await setupContextState.refetch?.();
      toast.success("Company profile updated.");
    } catch (error) {
      const message = safeCompanyProfileError(error);
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white"
      aria-label="Company Profile setup section"
    >
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Company Profile
            </div>
            <h2 className="mt-1 text-base font-semibold text-slate-950">
              Current Company Identity
            </h2>
          </div>
          <StatusBadge status={statusLabel || "Needs attention"} />
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          This card saves only company name, timezone, and locale through the guarded profile
          update path. Saving profile details does not finish onboarding, grant access, turn on
          modules, or change runtime authority.
        </p>
        {section?.missingItems?.length ? (
          <ul className="mt-3 space-y-1 text-sm leading-6 text-slate-600">
            {section.missingItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <form className="grid gap-4 px-5 py-4 md:grid-cols-3" onSubmit={handleSubmit}>
        <label className="text-sm md:col-span-3">
          <span className="mb-1 block text-xs font-medium text-slate-600">Company Name</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={values.name}
            maxLength={160}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            placeholder="Company display name"
            disabled={!liveContext || saving}
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-600">Timezone</span>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={values.timezone}
            onChange={(event) =>
              setValues((current) => ({ ...current, timezone: event.target.value }))
            }
            disabled={!liveContext || saving}
          >
            {TIMEZONE_OPTIONS.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-600">Locale</span>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={values.locale}
            onChange={(event) => setValues((current) => ({ ...current, locale: event.target.value }))}
            disabled={!liveContext || saving}
          >
            <option value="en-US">en-US</option>
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>

        {!liveContext ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 md:col-span-3">
            Live setup context is unavailable. The static sample fallback remains visible below, but
            profile edits are disabled until live current-company context loads.
          </p>
        ) : null}

        {errorMessage ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 md:col-span-3">
            {errorMessage}
          </p>
        ) : null}
      </form>
    </section>
  );
}

export default function OwnerSetup() {
  const setupContextState = useCompanySetupContext();
  const canReadUsers = useCan(PERMISSIONS.USERS_READ);
  const ownerSetupReadiness = mapOwnerSetupReadiness(setupContextState.data);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [completingSetup, setCompletingSetup] = useState(false);
  const [completionError, setCompletionError] = useState("");
  const liveReadiness = setupContextState.data
    ? resolveCompanyReadiness(setupContextState.data)
    : null;
  const liveSetupStatusMessage = setupContextState.loading
    ? "Loading guarded operational setup context..."
    : setupContextState.permissionDenied
      ? "Operational setup context is unavailable for this current-company user. Static sample fallback remains available below."
      : setupContextState.error
        ? "Falcon could not load live operational setup context. Static sample fallback remains available below."
        : liveReadiness
          ? "Live operational setup context loaded through the guarded read-only RPC."
          : "No live operational setup context is available. Static sample fallback remains below.";

  async function handleCompleteSetup() {
    if (!ownerSetupReadiness.minimumReady || completingSetup) return;

    setCompletionError("");

    try {
      setCompletingSetup(true);
      await completeOwnerSetup();
      setSetupCompleted(true);
      await setupContextState.refetch?.();
      toast.success("Setup complete.");
    } catch (error) {
      const message = safeCompleteSetupError(error);
      setCompletionError(message);
      toast.error(message);
    } finally {
      setCompletingSetup(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-6">
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
        <div className="text-xs font-semibold uppercase tracking-wide">Company Setup</div>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Owner Setup</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6">
          This page shows what the owner needs to review before Falcon is operational. Only the
          Company Profile card has a narrow guarded save path; setup progress does not change
          permissions, routes, workflow authority, assignments, product modes, or module access.
        </p>
      </section>

      <section aria-label="Company setup experience" className="space-y-6">
        <SetupProgressSummary
          setupCompleted={setupCompleted}
          setupReadiness={ownerSetupReadiness}
          completingSetup={completingSetup}
          completionError={completionError}
          onCompleteSetup={handleCompleteSetup}
        />

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <OwnerSetupSections
            setupReadiness={ownerSetupReadiness}
            setupContextState={setupContextState}
            canOpenTeamAccess={canReadUsers.allowed}
          />

          <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-950">Authority Boundary</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              {NO_GO_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </aside>
        </section>
      </section>

      <section aria-label="Internal Diagnostics" className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Internal Diagnostics
            </div>
            <StatusBadge status="Diagnostic only" />
          </div>
          <h2 className="mt-1 text-base font-semibold text-slate-950">
            Operational Setup Context
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{liveSetupStatusMessage}</p>
          {liveReadiness ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Live readiness
              </span>
              <StatusBadge status={getReadinessStatusLabel(liveReadiness)} />
            </div>
          ) : null}
          {setupContextState.error ? (
            <p className="mt-1 text-xs text-slate-500">
              Error: {setupContextState.error.message || "Unknown setup context error"}
            </p>
          ) : null}
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Operational readiness on this page is diagnostic guidance only. It does not grant
            access, deny access, bypass permissions/RLS/RPCs, turn on product modes/modules, or
            expose Vendor/Client live shells.
          </p>
        </section>

        {liveReadiness ? (
          <ReadinessSummary
            readiness={liveReadiness}
            label="Live operational readiness diagnostic"
            heading="Live Operational Readiness Guidance"
            description="This uses guarded current-company setup context with the pure readiness resolver. It is not onboarding state and not permission authority."
            emptyBlockingLabel="No blocking items in the live read-only setup context."
          />
        ) : null}

        <ReadinessSummary
          readiness={SAMPLE_READINESS}
          label="Static sample fallback"
          heading="Sample Operational Readiness Checklist"
          description="This uses a local fixture with the pure readiness resolver. It is not live operational setup context, not onboarding state, and not permission authority."
          emptyBlockingLabel="None in this sample fixture"
        />
      </section>
    </div>
  );
}
