const variantClasses = {
  loading:
    "rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600",
  error:
    "rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700",
  errorRed:
    "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700",
  empty:
    "rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center",
};

const stateTransition =
  "transition-colors duration-150 ease-out motion-reduce:transition-none";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function WorkspaceState({
  variant = "empty",
  title,
  message,
  children,
  className = "",
  role,
}) {
  const resolvedRole =
    role === undefined
      ? variant === "loading"
        ? "status"
        : String(variant).startsWith("error")
        ? "alert"
        : undefined
      : role;

  return (
    <div
      role={resolvedRole}
      className={cx(variantClasses[variant] || variantClasses.empty, stateTransition, className)}
    >
      {title ? (
        <>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {message ? <p className="mt-1 text-sm text-slate-500">{message}</p> : null}
          {children}
        </>
      ) : (
        children || message
      )}
    </div>
  );
}

export function WorkspaceLoadingState({ message = "Loading...", className = "" }) {
  return <WorkspaceState variant="loading" message={message} className={className} />;
}

export function WorkspaceErrorState({
  message = "Something went wrong.",
  className = "",
  tone = "rose",
}) {
  return (
    <WorkspaceState
      variant={tone === "red" ? "errorRed" : "error"}
      message={message}
      className={className}
    />
  );
}

export function WorkspaceEmptyState({ title, message, className = "", children }) {
  return (
    <WorkspaceState variant="empty" title={title} message={message} className={className}>
      {children}
    </WorkspaceState>
  );
}
