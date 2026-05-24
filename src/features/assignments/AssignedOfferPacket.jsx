import { AssignedOfferActions } from "./AssignmentActions";
import {
  FieldGrid,
  InstructionsSection,
  JsonSummary,
  PacketHeader,
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
      <PacketHeader
        eyebrow="Work Request"
        title={assignmentTitle(packet)}
        subtitle={`Offer from ${packet.owner_company_name || "owner company"} · ${locationLabel(packet)}`}
        packet={packet}
        side="assigned"
        status={packet.assignment_status}
        actionsLabel="Work Request Actions"
        actionsAriaLabel="Work Request Actions"
        actions={
          <AssignedOfferActions assignmentId={packet.assignment_id} onChanged={onChanged} />
        }
      />

      <TerminalState status={packet.assignment_status} />

      <FieldGrid
        title="Work Request Details"
        fields={[
          ["Assignment Type", humanize(packet.assignment_type)],
          ["Report Type", packet.report_type],
          ["Property Type", packet.property_type],
          ["Due", formatDateTime(packet.due_at)],
          ["Review Due", formatDateTime(packet.review_due_at)],
          ["Expires", formatDateTime(packet.expires_at)],
        ]}
      />

      <InstructionsSection>{packet.instructions}</InstructionsSection>

      <JsonSummary title="Terms" section="terms" value={packet.terms} />
      <JsonSummary title="Handoff" section="handoff" value={packet.handoff_payload} />
      <AssignmentActivityTimeline assignmentId={packet.assignment_id} refreshKey={activityRefreshKey} />
    </div>
  );
}
