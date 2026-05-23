function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

const tactileTransition =
  "transition-[border-color,box-shadow,background-color,transform] duration-150 ease-out motion-reduce:transition-none";

const interactiveTactile =
  "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-100 motion-reduce:hover:translate-y-0";

export function WorkspaceContextStrip({
  children,
  ariaLabel,
  className = "grid gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm",
  ...props
}) {
  return (
    <section aria-label={ariaLabel || props["aria-label"]} className={className}>
      {children}
    </section>
  );
}

export function WorkspaceContextTile({
  label,
  value,
  className = "",
  labelClassName = "",
  valueClassName = "",
  interactive = false,
}) {
  return (
    <div
      className={cx(
        "min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm",
        tactileTransition,
        interactive && interactiveTactile,
        className,
      )}
    >
      <div
        className={cx(
          "text-[10px] font-semibold uppercase tracking-wide text-slate-500",
          labelClassName,
        )}
      >
        {label}
      </div>
      <div className={cx("mt-1 truncate text-sm font-medium text-slate-950", valueClassName)}>
        {value}
      </div>
    </div>
  );
}
