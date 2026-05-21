import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

import { OwnerAssignmentActions } from "./AssignmentActions";
import {
  AssignmentMetaChips,
  AssignmentStatusBadge,
  FieldGrid,
  JsonSummary,
  TerminalState,
} from "./AssignmentPrimitives";
import { assignmentTitle, formatDateTime, humanize, locationLabel } from "./assignmentFormat";
import AssignmentActivityTimeline from "./components/AssignmentActivityTimeline";

export default function OwnerAssignmentPacket({ packet, onChanged }) {
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
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Owner Packet</div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">{assignmentTitle(packet)}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Owner-company management packet for {packet.assigned_company_name || "assigned company"} · {locationLabel(packet)}
            </p>
            <div className="mt-3">
              <AssignmentMetaChips packet={packet} side="owner" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AssignmentStatusBadge status={packet.assignment_status} />
            {packet.order_id && (
              <Link
                to={`/orders/${packet.order_id}`}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Open Order
              </Link>
            )}
          </div>
        </div>
        <div className="mt-4">
          <OwnerAssignmentActions
            assignmentId={packet.assignment_id}
            status={packet.assignment_status}
            onChanged={onChanged}
          />
        </div>
      </section>

      <TerminalState status={packet.assignment_status} />

      <FieldGrid
        fields={[
          ["Assignment Type", humanize(packet.assignment_type)],
          ["Relationship", humanize(packet.relationship_type)],
          ["Relationship Status", humanize(packet.relationship_status)],
          ["Report Type", packet.report_type],
          ["Site Visit", formatDateTime(packet.site_visit_at)],
          ["Due", formatDateTime(packet.due_at || packet.final_due_at)],
          ["Review Due", formatDateTime(packet.assignment_review_due_at || packet.order_review_due_at)],
          ["Offered", formatDateTime(packet.offered_at)],
          ["Updated Status", humanize(packet.order_status)],
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
      <JsonSummary title="Submission" section="submission" value={packet.submission_payload} />
      <JsonSummary title="Compliance" section="compliance" value={packet.compliance_snapshot} />
      <AssignmentActivityTimeline assignmentId={packet.assignment_id} refreshKey={activityRefreshKey} />
    </div>
  );
}
