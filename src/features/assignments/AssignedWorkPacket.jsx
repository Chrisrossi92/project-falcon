import { AssignedWorkActions } from "./AssignmentActions";
import {
  FieldGrid,
  InstructionsSection,
  JsonSummary,
  PacketHeader,
  TerminalState,
} from "./AssignmentPrimitives";
import { assignmentTitle, formatDateTime, humanize, locationLabel } from "./assignmentFormat";
import AssignmentActivityTimeline from "./components/AssignmentActivityTimeline";

export default function AssignedWorkPacket({ packet, onChanged }) {
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
      <PacketHeader
        eyebrow="Active Work"
        title={assignmentTitle(packet)}
        subtitle={`Assigned to your company by ${packet.owner_company_name || "owner company"} · ${locationLabel(packet)}`}
        packet={packet}
        side="assigned"
        status={packet.assignment_status}
        actionsLabel="Assignment Actions"
        actionsAriaLabel="Assignment Actions"
        actions={
          <AssignedWorkActions
            assignmentId={packet.assignment_id}
            status={packet.assignment_status}
            onChanged={onChanged}
          />
        }
      />

      <TerminalState status={packet.assignment_status} />

      <FieldGrid
        title="Assignment Details"
        fields={[
          ["Assignment Type", humanize(packet.assignment_type)],
          ["Report Type", packet.report_type],
          ["Property Type", packet.property_type],
          ["Site Visit", formatDateTime(packet.site_visit_at)],
          ["Due", formatDateTime(packet.due_at || packet.final_due_at)],
          ["Review Due", formatDateTime(packet.assignment_review_due_at || packet.order_review_due_at)],
        ]}
      />

      <InstructionsSection>{packet.instructions}</InstructionsSection>

      <JsonSummary title="Terms" section="terms" value={packet.terms} />
      <JsonSummary title="Handoff" section="handoff" value={packet.handoff_payload} />
      <JsonSummary title="Submission" section="submission" value={packet.submission_payload} />
      <AssignmentActivityTimeline assignmentId={packet.assignment_id} refreshKey={activityRefreshKey} />
    </div>
  );
}
