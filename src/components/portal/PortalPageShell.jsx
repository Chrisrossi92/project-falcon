import { cn } from "@/lib/utils";

export function PortalPageHeader({
  actions,
  className,
  description,
  eyebrow,
  label,
  meta,
  title,
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-100/80",
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {(eyebrow || label) ? (
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {eyebrow || label}
            </p>
          ) : null}
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h1>
          {description ? (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
          ) : null}
          {meta ? <div className="mt-4">{meta}</div> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </section>
  );
}

export function PortalPageShell({
  actions,
  children,
  className,
  contentClassName,
  description,
  eyebrow,
  headerClassName,
  label,
  meta,
  title,
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[112rem] space-y-6", className)}>
      <PortalPageHeader
        actions={actions}
        className={headerClassName}
        description={description}
        eyebrow={eyebrow}
        label={label}
        meta={meta}
        title={title}
      />
      <div className={cn("space-y-6", contentClassName)}>{children}</div>
    </div>
  );
}
