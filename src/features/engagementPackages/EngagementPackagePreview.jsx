import { buildEngagementPackagePreviewModel } from "./engagementPackageModel";

function PreviewPill({ children }) {
  return (
    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">
      {children}
    </span>
  );
}

function DocumentChecklist({ documents }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {documents.map((document) => (
        <div key={document.key} className="rounded-md border border-slate-200 bg-white p-2.5">
          <div className="text-sm font-semibold text-slate-900">{document.title}</div>
          <div className="mt-1 text-xs leading-5 text-slate-500">{document.description}</div>
        </div>
      ))}
    </div>
  );
}

function ReadinessStatus({ status }) {
  const label = status === "ready" ? "Ready" : status === "optional" ? "Optional" : "Missing";
  const classes = {
    ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
    missing: "border-amber-200 bg-amber-50 text-amber-700",
    optional: "border-slate-200 bg-white text-slate-500",
  };

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${classes[status] || classes.missing}`}>
      {label}
    </span>
  );
}

function InsightStatus({ status }) {
  const labels = {
    ready: "Ready",
    missing: "Missing",
    warning: "Review",
    info: "Info",
  };
  const classes = {
    ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
    missing: "border-amber-200 bg-amber-50 text-amber-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${classes[status] || classes.info}`}>
      {labels[status] || "Info"}
    </span>
  );
}

function PackageReadinessChecklist({ items }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-3" aria-label="Package Readiness">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-950">Package Readiness</h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            This checklist is informational and does not block assignment.
          </p>
        </div>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <li key={item.key} className="flex items-start justify-between gap-3 rounded-md bg-slate-50 px-2.5 py-2">
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-800">{item.label}</div>
              <div className={`mt-0.5 text-xs ${item.status === "missing" ? "text-amber-700" : "text-slate-500"}`}>
                {item.value}
              </div>
            </div>
            <ReadinessStatus status={item.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function AssignmentIntelligencePanel({ intelligence }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-3" aria-label="Assignment Intelligence">
      <div>
        <h4 className="text-sm font-semibold text-slate-950">{intelligence.title}</h4>
        <p className="mt-1 text-xs leading-5 text-slate-500">{intelligence.subtitle}</p>
      </div>
      <div className="mt-3 grid gap-2 xl:grid-cols-2">
        {intelligence.groups.map((group) => (
          <section key={group.key} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h5 className="text-sm font-semibold text-slate-900">{group.title}</h5>
                <p className="mt-0.5 text-xs text-slate-500">{group.summary}</p>
              </div>
              <InsightStatus status={group.status} />
            </div>
            <ul className="mt-2 grid gap-1.5">
              {group.items.map((item) => (
                <li key={item.key} className="rounded-md bg-white px-2.5 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                    <InsightStatus status={item.status} />
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.reason}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}

function EngagementLetterPreview({ letter }) {
  return (
    <section className="rounded-md border border-slate-300 bg-white p-4 shadow-sm" aria-label="Engagement Letter Preview">
      <div className="border-b border-slate-200 pb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Formal letter preview
        </div>
        <h4 className="mt-1 text-lg font-semibold text-slate-950">{letter.title}</h4>
        <div className="mt-2 text-sm text-slate-500">{letter.dateLine}</div>
      </div>

      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
        <p className="font-semibold text-slate-900">{letter.salutation}</p>
        <p>{letter.intro}</p>
        <p>{letter.body}</p>
      </div>

      <dl className="mt-4 grid gap-3 rounded-md border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2">
        {letter.fields.map((item) => (
          <div key={item.label} className={item.label === "Scope Notes" ? "sm:col-span-2" : ""}>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              {item.label}
            </dt>
            <dd className={`mt-1 text-sm ${item.missing ? "text-slate-400" : "text-slate-800"}`}>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 border-t border-slate-200 pt-3 text-sm text-slate-500">
        {letter.closing}
      </div>
    </section>
  );
}

export function EngagementPackageSection({ title, items }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-3">
      <h4 className="text-sm font-semibold text-slate-950">{title}</h4>
      <dl className="mt-3 grid gap-2 xl:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="grid gap-1 sm:grid-cols-[9rem_minmax(0,1fr)]">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              {item.label}
            </dt>
            <dd className={`text-sm ${item.missing ? "text-slate-400" : "text-slate-800"}`}>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function DocumentMetadataList({ documents, emptyText }) {
  if (documents.length === 0) {
    return <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">{emptyText}</p>;
  }

  return (
    <ul className="mt-3 grid gap-2">
      {documents.map((document) => (
        <li key={document.id} className="rounded-md bg-slate-50 px-3 py-2">
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0 text-sm font-medium text-slate-800">{document.name}</span>
            <span className="shrink-0 text-xs font-semibold text-slate-500">{document.type}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            {document.visibilityScope !== "Not provided" && <span>{document.visibilityScope}</span>}
            {document.uploadedAt !== "Not provided" && <span>Uploaded {document.uploadedAt}</span>}
            {document.size && <span>{document.size}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function DocumentSections({ sections }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-3">
      <h4 className="text-sm font-semibold text-slate-950">Package Documents</h4>
      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        {sections.map((section) => (
          <section key={section.key} aria-label={section.title} className="rounded-md border border-slate-100 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <h5 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                {section.title}
              </h5>
              <span className="text-xs font-medium text-slate-400">
                {section.documents.length} {section.documents.length === 1 ? "document" : "documents"}
              </span>
            </div>
            <DocumentMetadataList documents={section.documents} emptyText={section.emptyText} />
          </section>
        ))}
      </div>
    </section>
  );
}

export default function EngagementPackagePreview({
  order,
  assignment,
  vendor,
  client,
  attachments,
  className = "",
}) {
  const model = buildEngagementPackagePreviewModel({
    order,
    assignment,
    vendor,
    client,
    attachments,
  });

  return (
    <section className={`rounded-lg border border-slate-200 bg-slate-50 p-3 ${className}`} aria-label="Engagement package preview">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Document package
          </div>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">{model.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{model.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PreviewPill>Read-only</PreviewPill>
          <PreviewPill>No PDF generated</PreviewPill>
        </div>
      </div>

      <div className="mt-4">
        <DocumentChecklist documents={model.documents} />
      </div>

      <div className="mt-4 grid gap-3">
        <PackageReadinessChecklist items={model.readinessChecklist} />
        <AssignmentIntelligencePanel intelligence={model.assignmentIntelligence} />
        <EngagementLetterPreview letter={model.letterPreview} />
        {model.sections.map((section) => (
          <EngagementPackageSection key={section.key} title={section.title} items={section.items} />
        ))}
        <DocumentSections sections={model.documentSections} />
      </div>
    </section>
  );
}
