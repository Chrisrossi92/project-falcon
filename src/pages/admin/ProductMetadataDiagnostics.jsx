import { useMemo, useState } from "react";

import { useCompanySetupContext } from "../../features/company-setup/useCompanySetupContext.js";
import {
  COMPANY_READINESS_SEVERITIES,
  resolveCompanyReadiness,
} from "../../lib/companyBootstrap/companyReadinessResolver.js";
import { getCommandPaletteParityDiagnostics } from "../../lib/commandPalette/commandPaletteParityDiagnostics.js";
import { getShadowCommandPaletteComposition } from "../../lib/commandPalette/commandPaletteComposition.js";
import { getDashboardParityDiagnostics } from "../../lib/dashboard/dashboardParityDiagnostics.js";
import { getShadowDashboardComposition } from "../../lib/dashboard/dashboardComposition.js";
import { getShadowEmptyStateComposition } from "../../lib/emptyStates/emptyStateComposition.js";
import {
  describeProductModeComposition,
  getHiddenModulesForProductMode,
  getModulesForProductMode,
  getOptionalModulesForProductMode,
} from "../../lib/modules/moduleHelpers.js";
import { MODULE_CATEGORY_LABELS } from "../../lib/modules/moduleCategories.js";
import { MODULE_REGISTRY_LIST } from "../../lib/modules/moduleRegistry.js";
import { getShadowNavigationComposition } from "../../lib/navigation/navigationComposition.js";
import { getNavigationParityDiagnostics } from "../../lib/navigation/navigationParityDiagnostics.js";
import { PRODUCT_MODE_METADATA_LIST } from "../../lib/productModes/productModeMetadata.js";
import { PRODUCT_MODE_ORDER } from "../../lib/productModes/productModes.js";
import { getShadowRouteCompositionDiagnostics } from "../../lib/routes/routeCompositionDiagnostics.js";
import { getShadowUpgradePromptComposition } from "../../lib/upgrades/upgradePromptComposition.js";
import { useProductContextDiagnostics } from "../../lib/productContext/useProductContextDiagnostics.js";

const EMPTY_LABEL = "None";
const READINESS_PREVIEW_GENERATED_AT = "2026-05-19T00:00:00.000Z";

const SAMPLE_READINESS_SETUP_CONTEXT = Object.freeze({
  company_id: "sample-company-id",
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
  relationship_readiness: Object.freeze({
    relationship_count: 0,
  }),
  assignment_readiness: Object.freeze({
    assignment_count: 0,
  }),
  invitation_summary: Object.freeze({
    pending_count: 0,
  }),
});

const SAMPLE_READINESS_RESULT = resolveCompanyReadiness(SAMPLE_READINESS_SETUP_CONTEXT, {
  generatedAt: READINESS_PREVIEW_GENERATED_AT,
});

function formatList(values, fallback = EMPTY_LABEL) {
  if (!Array.isArray(values) || values.length === 0) return fallback;
  return values.join(", ");
}

function countBy(items, key) {
  return items.reduce((accumulator, item) => {
    const value = item?.[key] || "unknown";

    return {
      ...accumulator,
      [value]: (accumulator[value] || 0) + 1,
    };
  }, {});
}

function formatAuthority(value) {
  return value ? String(value).replaceAll("_", " ") : EMPTY_LABEL;
}

function formatSeverityCounts(counts = {}) {
  return Object.entries(counts)
    .map(([severity, count]) => `${severity}: ${count}`)
    .join(", ");
}

function createReadinessRows(readinessResult) {
  if (!readinessResult) {
    return {
      unknownItems: [],
      blockingRows: [],
      warningRows: [],
    };
  }

  return {
    unknownItems: readinessResult.checklistItems.filter(
      (item) => item.severity === COMPANY_READINESS_SEVERITIES.UNKNOWN,
    ),
    blockingRows: readinessResult.blockingItems
      .map((key) => readinessResult.checklistItems.find((item) => item.key === key))
      .filter(Boolean),
    warningRows: readinessResult.warnings
      .map((key) => readinessResult.checklistItems.find((item) => item.key === key))
      .filter(Boolean),
  };
}

function DiagnosticCard({ label, value, detail }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
      {detail ? <div className="mt-1 text-sm text-slate-500">{detail}</div> : null}
    </div>
  );
}

function DiagnosticSection({ title, description, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function PillList({ items }) {
  if (!items.length) {
    return <span className="text-sm text-slate-500">{EMPTY_LABEL}</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.id || item}
          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
        >
          {item.label || item}
        </span>
      ))}
    </div>
  );
}

function SmallTable({ columns, rows, emptyLabel = "No diagnostic rows." }) {
  if (!rows.length) {
    return <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">{emptyLabel}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className="px-3 py-2 font-semibold">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, index) => (
            <tr
              key={
                row.id ||
                row.moduleId ||
                row.routeConceptId ||
                row.commandId ||
                row.dashboardItemId ||
                row.emptyStateId ||
                index
              }
            >
              {columns.map((column) => (
                <td key={column.key} className="max-w-sm px-3 py-2 align-top text-slate-700">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiagnosticMessages({ messages }) {
  if (!messages?.length) return null;

  return (
    <ul className="mb-4 space-y-1 text-sm text-slate-500">
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  );
}

function LaneSummary({ title, groups }) {
  const entries = Object.entries(groups || {});

  if (!entries.length) return null;

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {entries.map(([lane, items]) => (
          <span key={lane} className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
            {lane}: {items.length}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ProductMetadataDiagnostics() {
  const [selectedModeId, setSelectedModeId] = useState(PRODUCT_MODE_ORDER[0]);
  const setupContextState = useCompanySetupContext();
  const productContextDiagnostics = useProductContextDiagnostics({
    source: "product_metadata_diagnostics",
  });

  const diagnostics = useMemo(() => {
    const composition = describeProductModeComposition(selectedModeId);
    const modules = getModulesForProductMode(selectedModeId);
    const optionalModules = getOptionalModulesForProductMode(selectedModeId);
    const hiddenModules = getHiddenModulesForProductMode(selectedModeId);
    const nav = getShadowNavigationComposition(selectedModeId);
    const navParity = getNavigationParityDiagnostics(selectedModeId);
    const routes = getShadowRouteCompositionDiagnostics(selectedModeId);
    const commands = getShadowCommandPaletteComposition(selectedModeId);
    const commandParity = getCommandPaletteParityDiagnostics(selectedModeId);
    const dashboard = getShadowDashboardComposition(selectedModeId);
    const dashboardParity = getDashboardParityDiagnostics(selectedModeId);
    const emptyStates = getShadowEmptyStateComposition(selectedModeId);
    const upgrades = getShadowUpgradePromptComposition(selectedModeId);

    return {
      composition,
      modules,
      optionalModules,
      hiddenModules,
      nav,
      navParity,
      routes,
      commands,
      commandParity,
      dashboard,
      dashboardParity,
      emptyStates,
      upgrades,
    };
  }, [selectedModeId]);

  const selectedMode = PRODUCT_MODE_METADATA_LIST.find((mode) => mode.id === selectedModeId);
  const moduleCounts = countBy(MODULE_REGISTRY_LIST, "category");
  const dependencyWarnings = diagnostics.composition?.missingDependencyIds ?? [];
  const liveReadinessResult = setupContextState.data
    ? resolveCompanyReadiness(setupContextState.data)
    : null;
  const liveReadinessRows = createReadinessRows(liveReadinessResult);
  const sampleReadinessRows = createReadinessRows(SAMPLE_READINESS_RESULT);
  const liveSetupStatusMessage = setupContextState.loading
    ? "Loading guarded setup context..."
    : setupContextState.permissionDenied
      ? "Setup context is unavailable for this current-company user. This diagnostics page will keep showing the static sample fallback."
      : setupContextState.error
        ? "Falcon could not load live setup context. This diagnostics page will keep showing the static sample fallback."
        : liveReadinessResult
          ? "Live setup context loaded through the guarded read-only RPC."
          : "No live setup context is available. Static sample fallback remains below.";

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="text-xs font-semibold uppercase tracking-wide">Diagnostic only</div>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Product Metadata Diagnostics</h1>
        <p className="mt-2 max-w-4xl">
          This protected page displays inert product mode, module, dependency, and shadow composition metadata. It is
          read-only and non-authoritative: it does not control runtime routes, navigation, dashboards, command palette
          behavior, permissions, billing, onboarding, company settings, or module enablement.
        </p>
      </div>

      <DiagnosticSection
        title="Product Context Diagnostics"
        description="Read-only route/runtime product-context diagnostics. This output does not control auth, routing, active company, data access, or legal separation."
      >
        <div className="grid gap-3 md:grid-cols-4">
          <DiagnosticCard
            label="Product Context"
            value={productContextDiagnostics.productContextLabel}
            detail={productContextDiagnostics.productContext}
          />
          <DiagnosticCard
            label="Route Family"
            value={productContextDiagnostics.routeFamily}
            detail={productContextDiagnostics.pathname}
          />
          <DiagnosticCard
            label="Operations Mode"
            value={productContextDiagnostics.operationsMode || "Not provided"}
            detail={productContextDiagnostics.operationsModeProvided ? "Used for diagnostic clarification only" : "Route-only inference"}
          />
          <DiagnosticCard
            label="Authority"
            value="None"
            detail="Diagnostic only"
          />
        </div>
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Product context diagnostics are non-authoritative:
          auth={String(productContextDiagnostics.affectsAuth)}, routing={String(productContextDiagnostics.affectsRouting)},
          company={String(productContextDiagnostics.affectsCompanyContext)}, data={String(productContextDiagnostics.affectsDataAccess)},
          legal={String(productContextDiagnostics.legalBoundary)}.
        </div>
      </DiagnosticSection>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label htmlFor="metadata-mode" className="text-sm font-medium text-slate-700">
            Product mode
          </label>
          <select
            id="metadata-mode"
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm sm:w-80"
            value={selectedModeId}
            onChange={(event) => setSelectedModeId(event.target.value)}
          >
            {PRODUCT_MODE_METADATA_LIST.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Local page state only. Selection is not persisted.
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DiagnosticCard label="Mode" value={selectedMode?.shortLabel || selectedModeId} detail={selectedMode?.primaryExperience} />
        <DiagnosticCard label="Included Modules" value={diagnostics.modules.length} detail={selectedMode?.dashboardName} />
        <DiagnosticCard label="Registry Modules" value={MODULE_REGISTRY_LIST.length} detail="Static metadata entries" />
        <DiagnosticCard
          label="Dependency Warnings"
          value={dependencyWarnings.length}
          detail={dependencyWarnings.length ? formatList(dependencyWarnings) : "No missing dependencies"}
        />
      </div>

      <DiagnosticSection
        title="Company Setup Readiness Preview"
        description="Live read-only setup context when available, with static sample fallback below. Readiness remains diagnostic only and does not affect runtime authority."
      >
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Live setup context is read-only and non-authoritative. Readiness is diagnostic guidance for future setup
          tooling, not a permission, route, RLS, workflow, onboarding, product-mode, or module authority source.
        </div>
        <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Live read-only setup context
          </div>
          <div className="mt-1">{liveSetupStatusMessage}</div>
          {setupContextState.error ? (
            <div className="mt-1 text-xs text-slate-500">
              Error: {setupContextState.error.message || "Unknown setup context error"}
            </div>
          ) : null}
        </div>

        {liveReadinessResult ? (
          <>
            <div className="mb-4 grid gap-3 md:grid-cols-4">
              <DiagnosticCard
                label="Live Status"
                value={liveReadinessResult.status}
                detail={`Company: ${liveReadinessResult.companyId || "Unknown"}`}
              />
              <DiagnosticCard
                label="Live Severity Counts"
                value={liveReadinessResult.checklistItems.length}
                detail={formatSeverityCounts(liveReadinessResult.severityCounts)}
              />
              <DiagnosticCard
                label="Live Blocking Items"
                value={liveReadinessResult.blockingItems.length}
                detail={formatList(liveReadinessResult.blockingItems)}
              />
              <DiagnosticCard
                label="Live Unknown Domains"
                value={liveReadinessRows.unknownItems.length}
                detail={formatList(liveReadinessRows.unknownItems.map((item) => item.key))}
              />
            </div>
            <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <span className="font-medium">Live next recommended action:</span>{" "}
              {liveReadinessResult.nextRecommendedAction}
            </div>
            <div className="mb-6 space-y-5">
              <div>
                <div className="mb-2 text-sm font-medium text-slate-700">Live blocking checklist items</div>
                <SmallTable
                  columns={[
                    { key: "label", label: "Item" },
                    { key: "severity", label: "Severity" },
                    { key: "status", label: "Status" },
                    { key: "remediation", label: "Diagnostic Remediation" },
                  ]}
                  rows={liveReadinessRows.blockingRows}
                  emptyLabel="No blocking items in the live read-only setup context."
                />
              </div>
              <div>
                <div className="mb-2 text-sm font-medium text-slate-700">Live warnings and unknowns</div>
                <SmallTable
                  columns={[
                    { key: "label", label: "Item" },
                    { key: "severity", label: "Severity" },
                    { key: "status", label: "Status" },
                    { key: "message", label: "Message" },
                  ]}
                  rows={liveReadinessRows.warningRows}
                  emptyLabel="No warning or unknown items in the live read-only setup context."
                />
              </div>
            </div>
          </>
        ) : null}

        <div className="mb-4 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Static sample fallback
          </div>
          <div className="mt-1">
            The sample below stays available for resolver inspection when live setup context is loading, unavailable, or
            permission-denied.
          </div>
        </div>
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <DiagnosticCard
            label="Sample Status"
            value={SAMPLE_READINESS_RESULT.status}
            detail={`Generated: ${SAMPLE_READINESS_RESULT.generatedAt}`}
          />
          <DiagnosticCard
            label="Severity Counts"
            value={SAMPLE_READINESS_RESULT.checklistItems.length}
            detail={formatSeverityCounts(SAMPLE_READINESS_RESULT.severityCounts)}
          />
          <DiagnosticCard
            label="Blocking Items"
            value={SAMPLE_READINESS_RESULT.blockingItems.length}
            detail={formatList(SAMPLE_READINESS_RESULT.blockingItems)}
          />
          <DiagnosticCard
            label="Unknown Domains"
            value={sampleReadinessRows.unknownItems.length}
            detail={formatList(sampleReadinessRows.unknownItems.map((item) => item.key))}
          />
        </div>
        <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <span className="font-medium">Next recommended action:</span>{" "}
          {SAMPLE_READINESS_RESULT.nextRecommendedAction}
        </div>
        <div className="space-y-5">
          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">Blocking checklist items</div>
            <SmallTable
              columns={[
                { key: "label", label: "Item" },
                { key: "severity", label: "Severity" },
                { key: "status", label: "Status" },
                { key: "remediation", label: "Diagnostic Remediation" },
              ]}
              rows={sampleReadinessRows.blockingRows}
              emptyLabel="No blocking items in the static sample."
            />
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">Warnings and unknowns</div>
            <SmallTable
              columns={[
                { key: "label", label: "Item" },
                { key: "severity", label: "Severity" },
                { key: "status", label: "Status" },
                { key: "message", label: "Message" },
              ]}
              rows={sampleReadinessRows.warningRows}
              emptyLabel="No warning or unknown items in the static sample."
            />
          </div>
        </div>
      </DiagnosticSection>

      <DiagnosticSection
        title="Product Modes"
        description="Static product-mode metadata used by the shadow diagnostics. This list does not switch companies or enforce product behavior."
      >
        <SmallTable
          columns={[
            { key: "label", label: "Mode" },
            { key: "primaryExperience", label: "Primary Experience" },
            { key: "dashboardName", label: "Dashboard" },
            {
              key: "includedModules",
              label: "Included",
              render: (row) => row.includedModules.length,
            },
          ]}
          rows={PRODUCT_MODE_METADATA_LIST}
        />
      </DiagnosticSection>

      <DiagnosticSection
        title="Module Registry Summary"
        description="Module categories, dependencies, and permission domains are metadata only. They do not grant access."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(moduleCounts).map(([category, count]) => (
            <span key={category} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {MODULE_CATEGORY_LABELS[category] || category}: {count}
            </span>
          ))}
        </div>
        <SmallTable
          columns={[
            { key: "label", label: "Module" },
            {
              key: "category",
              label: "Category",
              render: (row) => MODULE_CATEGORY_LABELS[row.category] || row.category,
            },
            { key: "status", label: "Status" },
            { key: "bundleType", label: "Bundle" },
            {
              key: "dependencies",
              label: "Dependencies",
              render: (row) => formatList(row.dependencies),
            },
            {
              key: "permissionDomains",
              label: "Permission Domains",
              render: (row) => formatList(row.permissionDomains),
            },
          ]}
          rows={MODULE_REGISTRY_LIST}
        />
      </DiagnosticSection>

      <DiagnosticSection
        title="Selected Mode Composition"
        description="The selected mode composition is derived from static registry metadata and shadow helper output only."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">Included modules</div>
            <PillList items={diagnostics.modules} />
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">Optional modules</div>
            <PillList items={diagnostics.optionalModules} />
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">Hidden by default</div>
            <PillList items={diagnostics.hiddenModules} />
          </div>
        </div>
      </DiagnosticSection>

      <DiagnosticSection
        title="Shadow Navigation Diagnostics"
        description="Navigation composition output is diagnostic metadata only and is not imported by active navigation."
      >
        <DiagnosticMessages messages={diagnostics.nav.diagnostics} />
        <SmallTable
          columns={[
            { key: "label", label: "Label" },
            { key: "moduleId", label: "Module" },
            { key: "registrationKind", label: "Registration" },
            { key: "visibility", label: "Visibility" },
            {
              key: "permissionAuthority",
              label: "Permission Authority",
              render: (row) => formatAuthority(row.permissionAuthority),
            },
          ]}
          rows={diagnostics.nav.entries}
        />
      </DiagnosticSection>

      <DiagnosticSection
        title="Live Navigation Parity Diagnostics"
        description="Compares the extracted current live navigation registry to the selected shadow navigation mode. This section is diagnostic-only and non-authoritative."
      >
        <DiagnosticMessages messages={diagnostics.navParity.diagnostics} />
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <DiagnosticCard
            label="Matched Concepts"
            value={diagnostics.navParity.matches.length}
            detail="Live registry and shadow mode both contain these concepts"
          />
          <DiagnosticCard
            label="Live-Only Gaps"
            value={diagnostics.navParity.liveOnlyEntries.length}
            detail="Current live concepts outside the selected shadow mode"
          />
          <DiagnosticCard
            label="Future Gaps"
            value={diagnostics.navParity.futureOnlyEntries.length}
            detail="Shadow concepts not present in current live navigation"
          />
        </div>

        <div className="space-y-5">
          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">Matched concepts</div>
            <SmallTable
              columns={[
                { key: "shadowLabel", label: "Shadow Concept" },
                {
                  key: "liveLabels",
                  label: "Current Live Labels",
                  render: (row) => formatList(row.liveLabels),
                },
                { key: "moduleId", label: "Module" },
                {
                  key: "permissionAuthority",
                  label: "Permission Authority",
                  render: (row) => formatAuthority(row.permissionAuthority),
                },
              ]}
              rows={diagnostics.navParity.matches}
              emptyLabel="No matched navigation concepts."
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">Live-only diagnostic gaps</div>
            <SmallTable
              columns={[
                {
                  key: "liveLabels",
                  label: "Current Live Labels",
                  render: (row) => formatList(row.liveLabels),
                },
                { key: "moduleId", label: "Module" },
                { key: "status", label: "Status" },
                {
                  key: "notes",
                  label: "Notes",
                  render: (row) => formatList(row.notes),
                },
              ]}
              rows={diagnostics.navParity.liveOnlyEntries}
              emptyLabel="No live-only navigation concepts."
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">Shadow-only / future gaps</div>
            <SmallTable
              columns={[
                { key: "shadowLabel", label: "Shadow Concept" },
                { key: "moduleId", label: "Module" },
                { key: "status", label: "Status" },
                {
                  key: "notes",
                  label: "Notes",
                  render: (row) => formatList(row.notes),
                },
              ]}
              rows={diagnostics.navParity.futureOnlyEntries}
              emptyLabel="No shadow-only future navigation gaps."
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">Diagnostic routes</div>
            <SmallTable
              columns={[
                { key: "label", label: "Label" },
                { key: "path", label: "Path" },
                { key: "status", label: "Status" },
              ]}
              rows={diagnostics.navParity.diagnosticRouteEntries}
              emptyLabel="No diagnostic-only routes in the current live registry."
            />
          </div>
        </div>
      </DiagnosticSection>

      <DiagnosticSection
        title="Shadow Route Diagnostics"
        description="Route patterns are conceptual diagnostics and do not change the active route table."
      >
        <DiagnosticMessages messages={diagnostics.routes.diagnostics} />
        <SmallTable
          columns={[
            { key: "label", label: "Route Concept" },
            { key: "routePattern", label: "Pattern" },
            { key: "moduleId", label: "Module" },
            { key: "lane", label: "Lane" },
            {
              key: "permissionKeys",
              label: "Permission Metadata",
              render: (row) => formatList(row.permissionKeys),
            },
            {
              key: "routeAuthority",
              label: "Route Authority",
              render: (row) => formatAuthority(row.routeAuthority),
            },
          ]}
          rows={diagnostics.routes.entries}
        />
        <LaneSummary title="Route lanes" groups={diagnostics.routes.entriesByLane} />
      </DiagnosticSection>

      <DiagnosticSection
        title="Shadow Command Palette Diagnostics"
        description="Command entries are future composition metadata only and are not registered in the active command palette."
      >
        <DiagnosticMessages messages={diagnostics.commands.diagnostics} />
        <SmallTable
          columns={[
            { key: "label", label: "Command" },
            { key: "kind", label: "Kind" },
            { key: "moduleId", label: "Module" },
            { key: "lane", label: "Lane" },
            {
              key: "permissionAuthority",
              label: "Permission Authority",
              render: (row) => formatAuthority(row.permissionAuthority),
            },
          ]}
          rows={diagnostics.commands.entries}
        />
        <LaneSummary title="Command lanes" groups={diagnostics.commands.entriesByLane} />
      </DiagnosticSection>

      <DiagnosticSection
        title="Live Command Palette Parity Diagnostics"
        description="Compares the current live command palette registry to the selected shadow command composition. This section is diagnostic-only and non-authoritative."
      >
        <DiagnosticMessages messages={diagnostics.commandParity.diagnostics} />
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <DiagnosticCard
            label="Matched Commands"
            value={diagnostics.commandParity.matches.length}
            detail="Current command concepts also present in shadow metadata"
          />
          <DiagnosticCard
            label="Live-Only Commands"
            value={diagnostics.commandParity.liveOnlyEntries.length}
            detail="Current commands outside the selected shadow mode"
          />
          <DiagnosticCard
            label="Future Commands"
            value={diagnostics.commandParity.futureOnlyEntries.length}
            detail="Shadow commands not present in the active palette"
          />
        </div>

        <div className="space-y-5">
          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">Matched commands</div>
            <SmallTable
              columns={[
                { key: "shadowLabel", label: "Shadow Command" },
                {
                  key: "liveLabels",
                  label: "Current Live Labels",
                  render: (row) => formatList(row.liveLabels),
                },
                { key: "moduleId", label: "Module" },
                { key: "lane", label: "Lane" },
                {
                  key: "permissionAuthority",
                  label: "Permission Authority",
                  render: (row) => formatAuthority(row.permissionAuthority),
                },
              ]}
              rows={diagnostics.commandParity.matches}
              emptyLabel="No matched command concepts."
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">Live-only command gaps</div>
            <SmallTable
              columns={[
                {
                  key: "liveLabels",
                  label: "Current Live Labels",
                  render: (row) => formatList(row.liveLabels),
                },
                { key: "commandId", label: "Command Concept" },
                { key: "status", label: "Status" },
                {
                  key: "notes",
                  label: "Notes",
                  render: (row) => formatList(row.notes),
                },
              ]}
              rows={diagnostics.commandParity.liveOnlyEntries}
              emptyLabel="No live-only command concepts."
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">Shadow-only / future command gaps</div>
            <SmallTable
              columns={[
                { key: "shadowLabel", label: "Shadow Command" },
                { key: "commandId", label: "Command Concept" },
                { key: "moduleId", label: "Module" },
                { key: "lane", label: "Lane" },
                { key: "status", label: "Status" },
              ]}
              rows={diagnostics.commandParity.futureOnlyEntries}
              emptyLabel="No shadow-only future command gaps."
            />
          </div>
        </div>

        <LaneSummary title="Parity shadow command lanes" groups={diagnostics.commandParity.entriesByLane} />
      </DiagnosticSection>

      <DiagnosticSection
        title="Shadow Dashboard Diagnostics"
        description="Dashboard shell and item metadata are not wired into the active dashboard renderer."
      >
        <DiagnosticMessages messages={diagnostics.dashboard.diagnostics} />
        <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <span className="font-medium">Shell:</span> {diagnostics.dashboard.shell?.name || EMPTY_LABEL}
        </div>
        <SmallTable
          columns={[
            { key: "label", label: "Item" },
            { key: "kind", label: "Kind" },
            { key: "moduleId", label: "Module" },
            { key: "lane", label: "Lane" },
            { key: "registrationKind", label: "Registration" },
          ]}
          rows={diagnostics.dashboard.items}
        />
        <LaneSummary title="Dashboard lanes" groups={diagnostics.dashboard.itemsByLane} />
      </DiagnosticSection>

      <DiagnosticSection
        title="Live Dashboard Parity Diagnostics"
        description="Compares the current live dashboard registry to the selected shadow dashboard composition. This section is diagnostic-only and non-authoritative."
      >
        <DiagnosticMessages messages={diagnostics.dashboardParity.diagnostics} />
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <DiagnosticCard
            label="Matched Dashboard Concepts"
            value={diagnostics.dashboardParity.matches.length}
            detail="Current dashboard concepts also present in shadow metadata"
          />
          <DiagnosticCard
            label="Live-Only Dashboard Entries"
            value={diagnostics.dashboardParity.liveOnlyEntries.length}
            detail="Current dashboard concepts outside the selected shadow mode"
          />
          <DiagnosticCard
            label="Future Dashboard Gaps"
            value={diagnostics.dashboardParity.futureOnlyEntries.length}
            detail="Shadow dashboard concepts not present in current live dashboards"
          />
        </div>

        <div className="space-y-5">
          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">Matched dashboard concepts</div>
            <SmallTable
              columns={[
                { key: "shadowLabel", label: "Shadow Dashboard Item" },
                {
                  key: "liveLabels",
                  label: "Current Live Labels",
                  render: (row) => formatList(row.liveLabels),
                },
                { key: "moduleId", label: "Module" },
                { key: "lane", label: "Lane" },
                { key: "kind", label: "Kind" },
                {
                  key: "widgetNotes",
                  label: "Widget / Section Notes",
                  render: (row) => formatList(row.widgetNotes),
                },
                {
                  key: "permissionAuthority",
                  label: "Permission Authority",
                  render: (row) => formatAuthority(row.permissionAuthority),
                },
              ]}
              rows={diagnostics.dashboardParity.matches}
              emptyLabel="No matched dashboard concepts."
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">Live-only dashboard entries</div>
            <SmallTable
              columns={[
                {
                  key: "liveLabels",
                  label: "Current Live Labels",
                  render: (row) => formatList(row.liveLabels),
                },
                { key: "dashboardItemId", label: "Dashboard Concept" },
                { key: "lane", label: "Lane Hint" },
                { key: "status", label: "Status" },
                {
                  key: "widgetNotes",
                  label: "Widget / Section Notes",
                  render: (row) => formatList(row.widgetNotes),
                },
                {
                  key: "notes",
                  label: "Notes",
                  render: (row) => formatList(row.notes),
                },
              ]}
              rows={diagnostics.dashboardParity.liveOnlyEntries}
              emptyLabel="No live-only dashboard concepts."
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">Shadow-only / future dashboard gaps</div>
            <SmallTable
              columns={[
                { key: "shadowLabel", label: "Shadow Dashboard Item" },
                { key: "dashboardItemId", label: "Dashboard Concept" },
                { key: "moduleId", label: "Module" },
                { key: "lane", label: "Lane" },
                { key: "kind", label: "Kind" },
                { key: "status", label: "Status" },
              ]}
              rows={diagnostics.dashboardParity.futureOnlyEntries}
              emptyLabel="No shadow-only future dashboard gaps."
            />
          </div>
        </div>

        <LaneSummary title="Parity shadow dashboard lanes" groups={diagnostics.dashboardParity.entriesByLane} />
      </DiagnosticSection>

      <DiagnosticSection
        title="Shadow Empty-State Diagnostics"
        description="Empty states are mode-safe diagnostic content and are not mounted into active app surfaces."
      >
        <DiagnosticMessages messages={diagnostics.emptyStates.diagnostics} />
        <SmallTable
          columns={[
            { key: "title", label: "Empty State" },
            { key: "moduleId", label: "Module" },
            { key: "lane", label: "Lane" },
            { key: "message", label: "Message" },
          ]}
          rows={diagnostics.emptyStates.emptyStates}
        />
        <LaneSummary title="Empty-state lanes" groups={diagnostics.emptyStates.emptyStatesByLane} />
      </DiagnosticSection>

      <DiagnosticSection
        title="Shadow Upgrade Prompt Diagnostics"
        description="Upgrade prompts are contextual diagnostics only. They do not enforce packaging, billing, or entitlement behavior."
      >
        <DiagnosticMessages messages={diagnostics.upgrades.diagnostics} />
        <SmallTable
          columns={[
            { key: "label", label: "Prompt" },
            { key: "moduleId", label: "Module" },
            { key: "context", label: "Context" },
            {
              key: "billingAuthority",
              label: "Billing Authority",
              render: (row) => formatAuthority(row.billingAuthority),
            },
            { key: "message", label: "Message" },
          ]}
          rows={diagnostics.upgrades.prompts}
        />
        <LaneSummary title="Prompt contexts" groups={diagnostics.upgrades.promptsByContext} />
      </DiagnosticSection>
    </div>
  );
}
