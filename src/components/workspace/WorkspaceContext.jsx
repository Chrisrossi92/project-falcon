function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

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
}) {
  return (
    <div
      className={cx(
        "min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm",
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
