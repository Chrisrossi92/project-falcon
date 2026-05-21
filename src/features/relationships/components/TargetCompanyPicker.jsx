import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { searchRelationshipTargets } from "../api";
import { blockedReasonLabel, formatRelationshipType, humanize } from "../relationshipFormat";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validQuery(query) {
  const trimmed = query.trim();
  return UUID_RE.test(trimmed) || trimmed.length >= 3;
}

export default function TargetCompanyPicker({ relationshipType, value, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const selectedId = value?.company_id || "";
  const canSearch = Boolean(relationshipType) && validQuery(query);
  const hint = useMemo(() => {
    if (!relationshipType) return "Choose a relationship type before searching.";
    if (!query.trim()) return "Search active companies by name, slug, or exact company ID.";
    if (!validQuery(query)) return "Enter at least 3 characters, or paste an exact company ID.";
    return "Discovery returns company identity and invite eligibility only.";
  }, [query, relationshipType]);

  const runSearch = async () => {
    if (!canSearch) return;
    setLoading(true);
    setError("");
    setSearched(true);
    onChange?.(null);
    try {
      const rows = await searchRelationshipTargets({
        query: query.trim(),
        relationshipType,
        limit: 10,
      });
      setResults(Array.isArray(rows) ? rows : []);
    } catch (searchError) {
      console.debug("Relationship target search failed", {
        code: searchError?.code,
        message: searchError?.message,
      });
      setResults([]);
      setError("Company discovery is unavailable for this company context.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Target Company</legend>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={query}
          disabled={!relationshipType || loading}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              runSearch();
            }
          }}
          placeholder="Search by company name, slug, or ID"
          className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
        />
        <button
          type="button"
          disabled={!canSearch || loading}
          onClick={runSearch}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          {loading ? "Searching..." : "Search"}
        </button>
      </div>
      <p className="text-xs text-slate-500">{hint}</p>
      {error && <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      {searched && !loading && !error && results.length === 0 && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
          No company identity records matched this search.
        </div>
      )}

      {results.length > 0 && (
        <div className="grid gap-2">
          {results.map((target) => {
            const selected = selectedId === target.company_id;
            const eligible = Boolean(target.eligible_for_invite);
            return (
              <button
                key={target.company_id}
                type="button"
                aria-disabled={!eligible}
                onClick={() => {
                  if (!eligible) return;
                  onChange?.(target);
                }}
                className={`rounded-md border p-3 text-left transition ${
                  selected
                    ? "border-slate-950 bg-slate-50 ring-1 ring-slate-950"
                    : eligible
                      ? "border-slate-200 bg-white hover:bg-slate-50"
                      : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-75"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-950">{target.company_name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {target.company_slug ? `/${target.company_slug}` : "No slug"} · {target.company_type_label || humanize(target.company_type)}
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    eligible ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}>
                    <span className="sr-only">Invite eligibility: </span>
                    {blockedReasonLabel(target.blocked_reason)}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {formatRelationshipType(target.relationship_type, target.relationship_type_label)}
                  {target.current_relationship_status ? ` · Current status: ${humanize(target.current_relationship_status)}` : ""}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
