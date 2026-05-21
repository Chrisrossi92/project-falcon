import { Link } from "react-router-dom";

import {
  formatDateTime,
  formatRelationshipType,
  humanize,
  relationshipCompanyLabel,
  relationshipDirection,
  statusClass,
} from "../relationshipFormat";

export default function RelationshipList({ relationships = [], selectedId, scope, loading, error, onRetry }) {
  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
        Loading relationships...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
        <div className="font-semibold">Relationships could not be loaded.</div>
        <p className="mt-1">Falcon could not load company relationships for this company context.</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-3 rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700">
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!relationships.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
        No company relationships match this view.
      </div>
    );
  }

  const direction = relationshipDirection(scope);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <ul className="divide-y divide-slate-100">
        {relationships.map((relationship) => {
          const selected = relationship.id === selectedId;
          return (
            <li key={relationship.id}>
              <Link
                to={`/relationships/${relationship.id}`}
                className={`block px-4 py-3 transition ${selected ? "bg-slate-100" : "hover:bg-slate-50"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-950">
                      {relationshipCompanyLabel(relationship, direction)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatRelationshipType(relationship.relationship_type, relationship.relationship_type_label)}
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(relationship.status)}`}>
                    {humanize(relationship.status)}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-400">Updated {formatDateTime(relationship.updated_at)}</div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
