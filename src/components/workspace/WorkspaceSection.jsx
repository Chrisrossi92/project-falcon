import { useId } from "react";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function WorkspaceSection({
  as: Component = "section",
  title,
  titleId,
  eyebrow,
  description,
  meta,
  children,
  ariaLabel,
  className = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
  headerClassName = "mb-4 border-b border-slate-100 pb-3",
  headerContentClassName = "flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between",
  titleClassName = "text-base font-semibold text-slate-950",
  eyebrowClassName = "text-xs font-semibold uppercase tracking-[0.14em] text-slate-500",
  descriptionClassName = "mt-1 text-sm text-slate-500",
  ...props
}) {
  const generatedTitleId = useId();
  const resolvedTitleId = title ? titleId || generatedTitleId : undefined;

  return (
    <Component
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : resolvedTitleId}
      className={className}
      {...props}
    >
      {(title || eyebrow || description || meta) && (
        <div className={headerClassName}>
          <div className={headerContentClassName}>
            <div className="min-w-0">
              {eyebrow && <div className={eyebrowClassName}>{eyebrow}</div>}
              {title && (
                <h2 id={resolvedTitleId} className={titleClassName}>
                  {title}
                </h2>
              )}
              {description && <p className={descriptionClassName}>{description}</p>}
            </div>
            {meta && <div className="shrink-0">{meta}</div>}
          </div>
        </div>
      )}
      {children}
    </Component>
  );
}

export function WorkspaceSectionMeta({ children, className = "" }) {
  return (
    <div className={cx("text-sm font-medium text-slate-600", className)}>
      {children}
    </div>
  );
}
