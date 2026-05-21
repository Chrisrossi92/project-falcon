import { AssignedOfferActions } from "./AssignmentActions";
import {
  AssignmentMetaChips,
  AssignmentStatusBadge,
  FieldGrid,
  JsonSummary,
  TerminalState,
} from "./AssignmentPrimitives";
import { assignmentTitle, formatDateTime, humanize, locationLabel } from "./assignmentFormat";
import AssignmentActivityTimeline from "./components/AssignmentActivityTimeline";

export default function AssignedOfferPacket({ packet, onChanged }) {
  const activityRefreshKey = [
    packet.assignment_status,
    packet.offered_at,
    packet.accepted_at,
    packet.declined_at,
    packet.started_at,
    packet.submitted_at,
    packet.completed_at,
    packet.cancelled_at,
    packet.revoked_at,
  ].join("|");

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Offer Preview</div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">{assignmentTitle(packet)}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Assigned-company offer from {packet.owner_company_name || "owner company"} · {locationLabel(packet)}
            </p>
            <div className="mt-3">
              <AssignmentMetaChips packet={packet} side="assigned" />
            </div>
          </div>
          <AssignmentStatusBadge status={packet.assignment_status} />
        </div>
        <div className="mt-4">
          <AssignedOfferActions assignmentId={packet.assignment_id} onChanged={onChanged} />
        </div>
      </section>

      <TerminalState status={packet.assignment_status} />

      <FieldGrid
        fields={[
          ["Assignment Type", humanize(packet.assignment_type)],
          ["Report Type", packet.report_type],
          ["Property Type", packet.property_type],
          ["Due", formatDateTime(packet.due_at)],
          ["Review Due", formatDateTime(packet.review_due_at)],
          ["Expires", formatDateTime(packet.expires_at)],
        ]}
      />

      {packet.instructions && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-950">Instructions</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{packet.instructions}</p>
        </section>
      )}

      <JsonSummary title="Terms" section="terms" value={packet.terms} />
      <JsonSummary title="Handoff" section="handoff" value={packet.handoff_payload} />
      <AssignmentActivityTimeline assignmentId={packet.assignment_id} refreshKey={activityRefreshKey} />
    </div>
  );
}
