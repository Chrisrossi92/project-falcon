import { useId } from "react";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

const tactileTransition =
  "transition-[border-color,box-shadow,background-color,transform] duration-150 ease-out motion-reduce:transition-none";

const interactiveTactile =
  "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-100 motion-reduce:hover:translate-y-0";

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
  interactive = false,
  ...props
}) {
  const generatedTitleId = useId();
  const resolvedTitleId = title ? titleId || generatedTitleId : undefined;

  return (
    <Component
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : resolvedTitleId}
      className={cx(className, tactileTransition, interactive && interactiveTactile)}
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
