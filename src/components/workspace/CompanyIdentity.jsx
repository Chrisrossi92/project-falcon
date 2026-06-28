import { cn } from "@/lib/utils";

function initialFor(value) {
  const normalized = String(value || "").trim();
  return normalized ? normalized[0].toUpperCase() : "F";
}

export default function CompanyIdentity({
  companyName = "Falcon",
  workspaceName = "Workspace",
  logoUrl = "",
  logoAlt = "",
  className = "",
  markClassName = "",
}) {
  const safeCompanyName = String(companyName || "").trim() || "Falcon";
  const safeWorkspaceName = String(workspaceName || "").trim() || "Workspace";
  const altText = logoAlt || `${safeCompanyName} logo`;

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-950/45 p-2.5 shadow-sm shadow-slate-950/25 ring-1 ring-white/5",
        className,
      )}
      data-testid="company-identity"
    >
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white text-slate-950 shadow-sm",
          markClassName,
        )}
        data-testid="company-identity-mark"
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={altText}
            className="max-h-10 max-w-10 object-contain"
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(226,232,240,0.95),rgba(148,163,184,0.28)_58%,rgba(15,23,42,0.08))] text-lg font-semibold"
            aria-hidden="true"
          >
            {initialFor(safeCompanyName)}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <div
          className="truncate text-sm font-semibold leading-5 text-slate-50"
          data-testid="company-identity-name"
          title={safeCompanyName}
        >
          {safeCompanyName}
        </div>
        <div
          className="truncate text-xs font-medium leading-5 text-slate-400"
          data-testid="workspace-identity-title"
          title={safeWorkspaceName}
        >
          {safeWorkspaceName}
        </div>
      </div>
    </div>
  );
}
