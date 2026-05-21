import { useEffect, useState } from "react";

import { getRelationship } from "../api";
import {
  formatDateTime,
  formatRelationshipType,
  humanize,
  relationshipCompanyLabel,
  statusClass,
} from "../relationshipFormat";
import RelationshipLifecycleActions from "./RelationshipLifecycleActions";

function Field({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</dt>
      <dd className="mt-1 min-w-0 break-words text-sm font-medium text-slate-800">{value || "Not set"}</dd>
    </div>
  );
}

function RelationshipCallout({ relationship, direction }) {
  if (!relationship) return null;

  const status = relationship.status;
  let message = "";

  if (status === "archived") {
    message = "This relationship is archived. Archived relationships are terminal and have no further lifecycle actions.";
  } else if (!direction) {
    message = "Action availability depends on whether this relationship is incoming or outgoing for the current company. Falcon could not classify that direction from relationship RPC data in this view.";
  } else if (["declined", "expired"].includes(status)) {
    message = direction === "outgoing"
      ? "This relationship is no longer current. Archive is the only lifecycle action when you have archive permission."
      : "This relationship is no longer current. The source company controls archive behavior.";
  } else if (status === "suspended") {
    message = direction === "outgoing"
      ? "This relationship is suspended. Users with permission may reactivate it, and the source company may archive it."
      : "This relationship is suspended. Users with permission may reactivate it.";
  } else if (status === "invited" && direction === "outgoing") {
    message = "This outgoing invitation is awaiting the target company. Accept and decline actions are available only to the incoming target company.";
  }

  if (!message) return null;

  return (
    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      {message}
    </div>
  );
}

export default function RelationshipDetailPanel({ relationshipId, relationship: listRelationship, direction, refreshKey, onChanged, onError }) {
  const [relationship, setRelationship] = useState(listRelationship || null);
  const [loading, setLoading] = useState(Boolean(relationshipId));
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!relationshipId) {
        setRelationship(null);
        setLoading(false);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const row = await getRelationship(relationshipId);
        if (!active) return;
        setRelationship(row);
      } catch (loadError) {
        if (!active) return;
        setRelationship(null);
        setError(loadError);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [relationshipId, refreshKey]);

  useEffect(() => {
    if (listRelationship && listRelationship.id === relationshipId) {
      setRelationship(listRelationship);
    }
  }, [listRelationship, relationshipId]);

  if (!relationshipId) {
    return (
      <aside className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
        Select a relationship to review details and available lifecycle actions.
      </aside>
    );
  }

  if (loading) {
    return (
      <aside className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
        Loading relationship detail...
      </aside>
    );
  }

  if (error || !relationship) {
    return (
      <aside className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
        <div className="font-semibold">Relationship detail could not be loaded.</div>
        <p className="mt-1">The relationship is unavailable to this company context or no longer exists.</p>
      </aside>
    );
  }

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Relationship Detail</div>
          <h2 className="mt-1 truncate text-xl font-semibold text-slate-950">{relationshipCompanyLabel(relationship, direction)}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {formatRelationshipType(relationship.relationship_type, relationship.relationship_type_label)}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(relationship.status)}`}>
          {humanize(relationship.status)}
        </span>
      </div>

      <div className="mt-4">
        <RelationshipLifecycleActions
          relationship={relationship}
          direction={direction}
          onChanged={onChanged}
          onError={onError}
        />
      </div>
      <RelationshipCallout relationship={relationship} direction={direction} />

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field label="Source company" value={relationship.source_company_name} />
        <Field label="Target company" value={relationship.target_company_name} />
        <Field label="Invited" value={formatDateTime(relationship.invited_at)} />
        <Field label="Approved" value={formatDateTime(relationship.approved_at)} />
        <Field label="Suspended" value={formatDateTime(relationship.suspended_at)} />
        <Field label="Archived" value={formatDateTime(relationship.archived_at)} />
      </dl>

      {relationship.notes && (
        <section className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Notes</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{relationship.notes}</p>
        </section>
      )}
    </aside>
  );
}
