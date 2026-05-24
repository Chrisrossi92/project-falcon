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
  Ready: "border-slate-200 bg-slate-50 text-slate-700",
  "Needs attention": "border-amber-200 bg-amber-50 text-amber-800",
  "Coming later": "border-sky-200 bg-sky-50 text-sky-800",
  "Diagnostic only": "border-indigo-200 bg-indigo-50 text-indigo-800",
  Deferred: "border-slate-200 bg-slate-100 text-slate-600",
});

const SETUP_CARD_GROUPS = Object.freeze([
  {
    title: "Company Setup",
    description: "Confirm company identity and first-owner basics without changing authority.",
    cards: Object.freeze([
      {
        title: "Company Profile",
        description: "Update the company name, timezone, and locale used by this workspace.",
        status: "Available",
        profileCard: true,
      },
      {
        title: "Owner Profile",
        description: "Review owner identity for attribution and future setup audit context.",
        status: "Coming later",
        readinessKeys: Object.freeze(["owner_presence", "owner_active_membership"]),
        readyStatus: "Ready",
        attentionStatus: "Needs attention",
      },
      {
        title: "Workspace Defaults",
        description:
          "Workspace defaults remain deferred until narrow guarded settings contracts exist.",
        status: "Deferred",
        deferredReason:
          "Planned later after narrow settings storage and security boundaries are defined.",
      },
    ]),
  },
  {
    title: "Operational Setup",
    description: "Review operational assumptions while backend workflow authority remains separate.",
    cards: Object.freeze([
      {
        title: "Order Numbering",
        description:
          "Company-safe order numbering is backend-controlled. Configuration remains deferred.",
        status: "Deferred",
        deferredReason:
          "Planned later after company-safe numbering configuration is ready for owners.",
      },
      {
        title: "Workflow Settings",
        description: "Review lifecycle assumptions without changing workflow authority.",
        status: "Diagnostic only",
      },
      {
        title: "Team Access",
        description:
          "Open Team Access to manage company members and invitations through the existing guarded team workflow.",
        status: "Coming later",
        readinessKeys: Object.freeze(["invitation_pipeline", "staff_readiness"]),
        readyStatus: "Ready",
        attentionStatus: "Coming later",
        teamAccessBridge: true,
      },
      {
        title: "Role Review",
        description: "Review role presets and responsibilities without exposing raw permissions.",
        status: "Diagnostic only",
        readinessKeys: Object.freeze(["role_presets", "owner_role_assignment"]),
        readyStatus: "Ready",
        attentionStatus: "Needs attention",
      },
    ]),
  },
  {
    title: "Company Communication & Branding",
    description: "Keep communication defaults and branding behind future company-safe contracts.",
    cards: Object.freeze([
      {
        title: "Company Notification Settings",
        description:
          "Personal notification preferences are separate; company defaults remain deferred.",
        status: "Deferred",
        deferredReason:
          "Planned later after company notification-default storage and policy rules exist.",
      },
      {
        title: "Branding",
        description:
          "Branding metadata and logo uploads require guarded storage design before configuration.",
        status: "Deferred",
        deferredReason:
          "Planned later after branding storage, upload, and security rules are designed.",
      },
    ]),
  },
  {
    title: "Operational Readiness",
    description: "Use setup diagnostics for orientation only; runtime guards remain authoritative.",
    cards: Object.freeze([
      {
        title: "Operational Readiness Checklist",
        description:
          "Review live setup guidance. Permissions and RPC/RLS checks remain the source of truth.",
        status: "Diagnostic only",
      },
    ]),
  },
]);

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

const formatSeverityCounts = (counts = {}) =>
  Object.entries(counts)
    .map(([severity, count]) => `${severity}: ${count}`)
    .join(", ");

const getReadinessStatusLabel = (readiness) =>
  readiness?.blockingItems?.length || readiness?.warningItems?.length ? "Needs attention" : "Ready";

const isReadinessItemPass = (item) => item?.status === COMPANY_READINESS_ITEM_STATUSES.PASS;

function getReadinessItemsByKey(readiness, keys = []) {
  if (!readiness || keys.length === 0) return [];

  return keys
    .map((key) => readiness.checklistItems.find((item) => item.key === key))
    .filter(Boolean);
}

function getCardStatus(card, readiness) {
  if (!card.readinessKeys) return card.status;

  const items = getReadinessItemsByKey(readiness, card.readinessKeys);
  if (items.length !== card.readinessKeys.length) return card.status;
  if (items.every(isReadinessItemPass)) return card.readyStatus || card.status;
  if (items.some((item) => item.blocking || item.severity === COMPANY_READINESS_SEVERITIES.CRITICAL)) {
    return card.attentionStatus || "Needs attention";
  }

  return card.status;
}

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

function SetupCard({ card, readiness, canOpenTeamAccess = false }) {
  const status = getCardStatus(card, readiness);

  return (
    <article
      className="rounded-lg border border-slate-200 bg-white p-4"
      aria-label={`${card.title} setup card`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-950">{card.title}</h3>
        <StatusBadge status={status} />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
      {card.teamAccessBridge && canOpenTeamAccess ? (
        <div className="mt-4">
          <Link
            to={TEAM_ACCESS_ROUTE}
            className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Open Team Access
          </Link>
        </div>
      ) : null}
      {status === "Deferred" ? (
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
          <span className="font-medium text-slate-800">Planned later:</span>{" "}
          {card.deferredReason ||
            "This card is intentionally waiting on a governed backend, storage, or security model."}
        </p>
      ) : null}
    </article>
  );
}

function SetupCardGroup({ group, setupContextState, readiness, canOpenTeamAccess }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-950">{group.title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{group.description}</p>
      </div>
      <div className="grid gap-3">
        {group.cards.map((card) =>
          card.profileCard ? (
            <CompanyProfileCard key={card.title} setupContextState={setupContextState} />
          ) : (
            <SetupCard
              key={card.title}
              card={card}
              readiness={readiness}
              canOpenTeamAccess={canOpenTeamAccess}
            />
          ),
        )}
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

function CompanyProfileCard({ setupContextState }) {
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
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Company Profile
          </div>
          <StatusBadge status="Available" />
        </div>
        <h2 className="mt-1 text-base font-semibold text-slate-950">
          Current Company Identity
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          This card saves only company name, timezone, and locale through the guarded profile
          update path. Saving profile details does not finish onboarding, grant access, turn on
          modules, or change runtime authority.
        </p>
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

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-6">
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
        <div className="text-xs font-semibold uppercase tracking-wide">Owner Setup Guidance</div>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Owner Setup</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6">
          This page helps orient company setup and operational readiness. Live setup context is
          read-only guidance, and only the Company Profile card has a narrow guarded save path. The
          page does not run bootstrap, persist onboarding, save broad settings, or change route,
          permission, RLS, workflow, assignment, product-mode, or module behavior.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Live operational setup context
        </div>
        <h2 className="mt-1 text-base font-semibold text-slate-950">Operational Setup Context</h2>
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
          Operational readiness on this page is diagnostic guidance only. It does not grant access,
          deny access, bypass permissions/RLS/RPCs, turn on product modes/modules, or expose
          Vendor/Client live shells.
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

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-6">
          {SETUP_CARD_GROUPS.map((group) => (
            <SetupCardGroup
              key={group.title}
              group={group}
              setupContextState={setupContextState}
              readiness={liveReadiness}
              canOpenTeamAccess={canReadUsers.allowed}
            />
          ))}
        </div>

        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-950">Authority Boundary</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            {NO_GO_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </aside>
      </section>

      <ReadinessSummary
        readiness={SAMPLE_READINESS}
        label="Static sample fallback"
        heading="Sample Operational Readiness Checklist"
        description="This uses a local fixture with the pure readiness resolver. It is not live operational setup context, not onboarding state, and not permission authority."
        emptyBlockingLabel="None in this sample fixture"
      />
    </div>
  );
}
