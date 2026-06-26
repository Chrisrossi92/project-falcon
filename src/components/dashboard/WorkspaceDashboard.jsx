import { Link } from "react-router-dom";

function joinClassNames(...values) {
  return values.filter(Boolean).join(" ");
}

export function WorkspaceDashboardHeader({ label, title, subtitle, action }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {label ? (
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </div>
      ) : null}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="p-6">
          <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
          {subtitle ? (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="px-6 pb-6 lg:p-6">{action}</div> : null}
      </div>
    </section>
  );
}

export function WorkspaceSummaryCards({ children, columns = "xl:grid-cols-4", label = "Workspace summary" }) {
  return (
    <section className={joinClassNames("grid gap-3 md:grid-cols-2", columns)} aria-label={label}>
      {children}
    </section>
  );
}

export function WorkspaceSummaryCard({ label, value, helper, to }) {
  const content = (
    <>
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-950">{value}</div>
      {helper ? <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p> : null}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {content}
    </article>
  );
}

export function WorkspaceSection({ title, subtitle, action, children, label, className = "" }) {
  return (
    <section
      className={joinClassNames("rounded-xl border border-slate-200 bg-white p-4 shadow-sm", className)}
      aria-label={label || title}
    >
      {(title || subtitle || action) ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title ? <h2 className="text-base font-semibold text-slate-950">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function WorkspaceEmptyState({ children, className = "" }) {
  return (
    <div
      className={joinClassNames(
        "rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function WorkspaceQuickActions({ actions }) {
  return (
    <div className="mt-4 grid gap-3">
      {actions.map((action) => (
        <Link
          key={`${action.label}-${action.to}`}
          to={action.to}
          className={
            action.variant === "primary"
              ? "rounded-lg border border-slate-900 bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
              : "rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
          }
        >
          {action.label}
        </Link>
      ))}
    </div>
  );
}
