import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, ExternalLink, Link2, Mail } from "lucide-react";

import {
  createOrderCompanyAssignmentInvitation,
  createOrderCompanyAssignmentWorkInvitation,
} from "./api";
import { OwnerAssignmentActions } from "./AssignmentActions";
import {
  ActionButton,
  FieldGrid,
  InstructionsSection,
  JsonSummary,
  PacketHeader,
  TerminalState,
} from "./AssignmentPrimitives";
import { assignmentTitle, formatDateTime, humanize, locationLabel } from "./assignmentFormat";
import AssignmentActivityTimeline from "./components/AssignmentActivityTimeline";

function safeLine(label, value) {
  return value ? `${label}: ${value}` : "";
}

function assignmentPropertyLine(packet) {
  const cityState = [packet?.city, packet?.state].filter(Boolean).join(", ");
  if (cityState) return `Property: ${cityState}`;
  if (packet?.property_address) return `Property: ${packet.property_address}`;
  return "";
}

function contactName(packet) {
  return (
    packet?.contact_name ||
    packet?.vendor_contact_name ||
    packet?.handoff_payload?.contact_name ||
    packet?.handoff_payload?.vendor_contact_name ||
    ""
  );
}

function normalizedAssignmentType(packet) {
  return String(packet?.assignment_type || packet?.assignmentType || "").trim().toLowerCase();
}

function normalizedAssignmentStatus(packet) {
  return String(packet?.assignment_status || packet?.status || "").trim().toLowerCase();
}

function normalizedAssignmentId(packet) {
  return packet?.assignment_id || packet?.id || "";
}

function canGenerateAssignmentInvitation(packet) {
  return (
    Boolean(normalizedAssignmentId(packet)) &&
    normalizedAssignmentType(packet) === "vendor_appraisal" &&
    normalizedAssignmentStatus(packet) === "offered"
  );
}

function canGenerateAssignmentWorkInvitation(packet) {
  return (
    Boolean(normalizedAssignmentId(packet)) &&
    normalizedAssignmentType(packet) === "vendor_appraisal" &&
    ["accepted", "in_progress"].includes(normalizedAssignmentStatus(packet))
  );
}

function buildAssignmentOfferEmail({ packet, link }) {
  const orderNumber = packet?.order_number || "this order";
  const greetingName = contactName(packet);
  const lines = [
    `Subject: Assignment offer for order ${orderNumber}`,
    "",
    greetingName ? `Hello ${greetingName},` : "Hello,",
    "",
    "Continental is offering you an appraisal assignment.",
    "",
    `Order: ${orderNumber}`,
    assignmentPropertyLine(packet),
    safeLine("Due date", formatDateTime(packet?.due_at || packet?.final_due_at) === "Not set" ? "" : formatDateTime(packet?.due_at || packet?.final_due_at)),
    "",
    "Open the secure assignment offer:",
    link,
    "",
    "Please accept or decline the assignment through the link. If you have questions or cannot access the page, contact the AMC coordinator.",
    "",
    "Thank you,",
    "Continental Real Estate Solutions",
  ];

  return lines.filter((line, index, all) => {
    if (line) return true;
    return all[index - 1] !== "";
  }).join("\n").trim();
}

function buildAssignmentWorkEmail({ packet, link }) {
  const orderNumber = packet?.order_number || "this order";
  const greetingName = contactName(packet);
  const lines = [
    `Subject: Assignment work link for order ${orderNumber}`,
    "",
    greetingName ? `Hello ${greetingName},` : "Hello,",
    "",
    "Continental has opened your assignment work link.",
    "",
    `Order: ${orderNumber}`,
    assignmentPropertyLine(packet),
    safeLine("Due date", formatDateTime(packet?.due_at || packet?.final_due_at) === "Not set" ? "" : formatDateTime(packet?.due_at || packet?.final_due_at)),
    "",
    "Open the secure assignment work page:",
    link,
    "",
    "Use this link to start work and submit the completed report. If you have questions or cannot access the page, contact the AMC coordinator.",
    "",
    "Thank you,",
    "Continental Real Estate Solutions",
  ];

  return lines.filter((line, index, all) => {
    if (line) return true;
    return all[index - 1] !== "";
  }).join("\n").trim();
}

async function copyText(text) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return false;
  await navigator.clipboard.writeText(text);
  return true;
}

function AssignmentInvitationPanel({ packet }) {
  const [invitation, setInvitation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);

  if (!canGenerateAssignmentInvitation(packet)) return null;

  const assignmentLink = invitation?.path || invitation?.link || "";

  async function generateInvitation() {
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const result = await createOrderCompanyAssignmentInvitation(normalizedAssignmentId(packet));
      setInvitation(result);
      setMessage("Assignment link generated.");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function copyAssignmentLink() {
    const copied = await copyText(assignmentLink);
    setMessage(copied ? "Link copied." : "Select the text to copy.");
  }

  async function copyAssignmentEmail() {
    const draft = buildAssignmentOfferEmail({ packet, link: assignmentLink });
    const copied = await copyText(draft);
    setMessage(copied ? "Email text copied." : "Select the text to copy.");
  }

  return (
    <section
      id="assignment-invitation-panel"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      aria-label="Assignment invitation"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Assignment invitation</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Generate a secure vendor link for accepting or declining this offered assignment.
          </p>
        </div>
        <ActionButton icon={Link2} onClick={generateInvitation} disabled={busy}>
          {busy ? "Generating..." : "Generate Assignment Link"}
        </ActionButton>
      </div>

      {assignmentLink && (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="select-all break-all font-mono text-sm text-slate-700">{assignmentLink}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton icon={Copy} variant="secondary" onClick={copyAssignmentLink}>
              Copy Link
            </ActionButton>
            <ActionButton icon={Mail} variant="secondary" onClick={copyAssignmentEmail}>
              Copy Email Text
            </ActionButton>
          </div>
        </div>
      )}

      {message && <p role="status" className="mt-2 text-sm font-medium text-slate-600">{message}</p>}
      {error && <p className="mt-2 text-sm text-rose-600">{error.message || "Assignment invitation could not be generated."}</p>}
    </section>
  );
}

function AssignmentWorkInvitationPanel({ packet }) {
  const [invitation, setInvitation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);

  if (!canGenerateAssignmentWorkInvitation(packet)) return null;

  const workLink = invitation?.path || invitation?.link || "";

  async function generateInvitation() {
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const result = await createOrderCompanyAssignmentWorkInvitation(normalizedAssignmentId(packet));
      setInvitation(result);
      setMessage("Work link generated.");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function copyWorkLink() {
    const copied = await copyText(workLink);
    setMessage(copied ? "Link copied." : "Select the text to copy.");
  }

  async function copyWorkEmail() {
    const draft = buildAssignmentWorkEmail({ packet, link: workLink });
    const copied = await copyText(draft);
    setMessage(copied ? "Email text copied." : "Select the text to copy.");
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label="Assignment work link">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Assignment work link</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Generate a separate secure vendor link for starting work and submitting the report.
          </p>
        </div>
        <ActionButton icon={Link2} onClick={generateInvitation} disabled={busy}>
          {busy ? "Generating..." : "Generate Work Link"}
        </ActionButton>
      </div>

      {workLink && (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="select-all break-all font-mono text-sm text-slate-700">{workLink}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton icon={Copy} variant="secondary" onClick={copyWorkLink}>
              Copy Link
            </ActionButton>
            <ActionButton icon={Mail} variant="secondary" onClick={copyWorkEmail}>
              Copy Email Text
            </ActionButton>
          </div>
        </div>
      )}

      {message && <p role="status" className="mt-2 text-sm font-medium text-slate-600">{message}</p>}
      {error && <p className="mt-2 text-sm text-rose-600">{error.message || "Assignment work link could not be generated."}</p>}
    </section>
  );
}

export default function OwnerAssignmentPacket({ packet, onChanged }) {
  const showAssignmentInvitationEntry = canGenerateAssignmentInvitation(packet);
  const assignmentId = normalizedAssignmentId(packet);
  const assignmentStatus = packet.assignment_status || packet.status;
  const activityRefreshKey = [
    assignmentStatus,
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
        eyebrow="Owner Packet"
        title={assignmentTitle(packet)}
        subtitle={`Owner-company management packet for ${packet.assigned_company_name || "assigned company"} · ${locationLabel(packet)}`}
        packet={packet}
        side="owner"
        status={assignmentStatus}
        secondaryActions={
          <>
            {showAssignmentInvitationEntry && (
              <a
                href="#assignment-invitation-panel"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                <Link2 className="h-4 w-4" aria-hidden="true" />
                Generate Assignment Link
              </a>
            )}
            {packet.order_id && (
              <Link
                to={`/orders/${packet.order_id}`}
                aria-label={`Open order for assignment packet ${assignmentTitle(packet)}`}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Open Order
              </Link>
            )}
          </>
        }
        actions={
          <OwnerAssignmentActions
            assignmentId={assignmentId}
            status={assignmentStatus}
            onChanged={onChanged}
          />
        }
      />

      <TerminalState status={assignmentStatus} />
      <AssignmentInvitationPanel packet={packet} />
      <AssignmentWorkInvitationPanel packet={packet} />

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

      <InstructionsSection>{packet.instructions}</InstructionsSection>

      <JsonSummary title="Terms" section="terms" value={packet.terms} />
      <JsonSummary title="Handoff" section="handoff" value={packet.handoff_payload} />
      <JsonSummary title="Submission" section="submission" value={packet.submission_payload} />
      <JsonSummary title="Compliance" section="compliance" value={packet.compliance_snapshot} />
      <AssignmentActivityTimeline assignmentId={assignmentId} refreshKey={activityRefreshKey} />
    </div>
  );
}
