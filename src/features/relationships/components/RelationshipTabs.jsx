import { RELATIONSHIP_SCOPES } from "../relationshipFormat";

export default function RelationshipTabs({ scope, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
      {RELATIONSHIP_SCOPES.map((item) => {
        const active = item.key === scope;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange?.(item.key)}
            className={`h-9 rounded-md px-3 text-sm font-semibold transition ${
              active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-950"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
