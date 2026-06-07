import { getWorkspaceIdentity } from "@/lib/workspace/workspaceIdentity";

export default function WorkspaceBadge({ operationsMode, className = "" }) {
  const identity = getWorkspaceIdentity(operationsMode);
  const badgeClass =
    identity.accentClasses.badge || "border-slate-300 bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${badgeClass} ${className}`}
      data-testid="workspace-identity-badge"
      title={identity.badgeDescription}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {identity.badgeLabel}
    </span>
  );
}
