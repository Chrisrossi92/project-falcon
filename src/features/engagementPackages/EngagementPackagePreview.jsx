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
    <div className="grid gap-2 sm:grid-cols-2">
      {documents.map((document) => (
        <div key={document.key} className="rounded-md border border-slate-200 bg-white p-3">
          <div className="text-sm font-semibold text-slate-900">{document.title}</div>
          <div className="mt-1 text-xs leading-5 text-slate-500">{document.description}</div>
        </div>
      ))}
    </div>
  );
}

export function EngagementPackageSection({ title, items }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-3">
      <h4 className="text-sm font-semibold text-slate-950">{title}</h4>
      <dl className="mt-3 grid gap-2">
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

function AttachmentsSection({ attachments, emptyText }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-3">
      <h4 className="text-sm font-semibold text-slate-950">Attachments</h4>
      {attachments.length > 0 ? (
        <ul className="mt-3 grid gap-2">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-start justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
              <span className="text-sm font-medium text-slate-800">{attachment.name}</span>
              <span className="text-xs font-semibold text-slate-500">{attachment.type}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">{emptyText}</p>
      )}
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
    <section className={`rounded-lg border border-slate-200 bg-slate-50 p-4 ${className}`} aria-label="Engagement package preview">
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
        {model.sections.map((section) => (
          <EngagementPackageSection key={section.key} title={section.title} items={section.items} />
        ))}
        <AttachmentsSection attachments={model.attachments} emptyText={model.emptyAttachmentText} />
      </div>
    </section>
  );
}

