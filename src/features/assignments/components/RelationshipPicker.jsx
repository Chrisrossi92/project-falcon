import { RefreshCw } from "lucide-react";

import { humanize } from "../assignmentFormat";
import { ActionButton } from "../AssignmentPrimitives";

export function relationshipCompanyName(relationship) {
  return relationship?.target_company_name || "Unnamed company";
}

export default function RelationshipPicker({ relationships = [], value, onChange, loading, error, onRetry }) {
  if (loading) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
        Loading active outgoing relationships...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
        <div className="font-semibold">Relationships could not be loaded.</div>
        <p className="mt-1">Falcon could not load active outgoing relationships for assignment offers.</p>
        {onRetry && (
          <div className="mt-3">
            <ActionButton variant="secondary" onClick={onRetry} icon={RefreshCw}>
              Retry
            </ActionButton>
          </div>
        )}
      </div>
    );
  }

  if (!relationships.length) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
        No active outgoing relationships are available for assignment offers.
      </div>
    );
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Relationship</legend>
      <p className="text-xs text-slate-500">
        Only active outgoing relationships from your current company are available for assignment offers.
      </p>
      <div className="grid gap-2">
        {relationships.map((relationship) => {
          const selected = value === relationship.id;
          return (
            <label
              key={relationship.id}
              className={`cursor-pointer rounded-md border p-3 transition ${
                selected
                  ? "border-slate-950 bg-slate-50 ring-1 ring-slate-950"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="assignmentRelationship"
                value={relationship.id}
                checked={selected}
                onChange={() => onChange?.(relationship.id)}
                className="sr-only"
              />
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-950">{relationshipCompanyName(relationship)}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {relationship.relationship_type_label || humanize(relationship.relationship_type)}
                  </div>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  {humanize(relationship.status)}
                </span>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
