import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, ExternalLink, Link2, Mail, Plus } from "lucide-react";

import { useEffectivePermissions } from "@/lib/hooks/usePermissions";
import {
  addVendorAssignmentInternalNote,
  createOrderCompanyAssignmentInvitation,
  createOrderCompanyAssignmentWorkInvitation,
  listVendorAssignmentInternalNotes,
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

function absolutePublicLink(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (typeof window === "undefined" || !window.location?.origin) {
    return raw;
  }

  try {
    return new URL(raw, window.location.origin).toString();
  } catch {
    return raw;
  }
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

function revisionFromPacket(packet) {
  const revision = packet?.submission_payload?.revision;
  return revision && typeof revision === "object" ? revision : null;
}

function RevisionRequestSummary({ revision }) {
  if (!revision) return null;

  const instructions = revision.instructions || revision.summary || revision.note || "";

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm" aria-label="Revision request summary">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-amber-950">Revision requested</h2>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            Vendor-facing revision instructions are active for this assignment.
          </p>
        </div>
        <div className="text-sm text-amber-900 sm:text-right">
          <div>
            <span className="font-semibold">Requested:</span> {formatDateTime(revision.requested_at)}
          </div>
          <div>
            <span className="font-semibold">Due:</span> {formatDateTime(revision.due_at)}
          </div>
        </div>
      </div>
      {instructions && (
        <p className="mt-3 whitespace-pre-wrap rounded-md border border-amber-200 bg-white/70 px-3 py-2 text-sm leading-6 text-amber-950">
          {instructions}
        </p>
      )}
    </section>
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

  const assignmentLink = absolutePublicLink(invitation?.link || invitation?.path);

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
          <a
            href={assignmentLink}
            target="_blank"
            rel="noreferrer"
            className="select-all break-all font-mono text-sm font-medium text-blue-700 underline decoration-blue-200 underline-offset-2 hover:text-blue-800"
          >
            {assignmentLink}
          </a>
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

  const workLink = absolutePublicLink(invitation?.link || invitation?.path);

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
          <a
            href={workLink}
            target="_blank"
            rel="noreferrer"
            className="select-all break-all font-mono text-sm font-medium text-blue-700 underline decoration-blue-200 underline-offset-2 hover:text-blue-800"
          >
            {workLink}
          </a>
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

const INTERNAL_NOTE_CONTEXTS = [
  { value: "review", label: "Review" },
  { value: "revision", label: "Revision" },
  { value: "completion", label: "Completion" },
  { value: "general", label: "General" },
];

function InternalNotesPanel({ assignmentId }) {
  const { hasPermission } = useEffectivePermissions();
  const canAddInternalNote = hasPermission("order_company_assignments.complete");
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [noteContext, setNoteContext] = useState("review");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function loadNotes() {
      if (!assignmentId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await listVendorAssignmentInternalNotes(assignmentId);
        if (!cancelled) {
          setNotes(Array.isArray(result?.items) ? result.items : []);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadNotes();

    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  async function saveNote(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    setMessage("");

    try {
      const result = await addVendorAssignmentInternalNote(assignmentId, {
        note_text: noteText,
        note_context: noteContext,
      });

      if (result?.ok === false) {
        setFieldErrors(result.field_errors || {});
        setError(new Error("Internal note could not be saved."));
        return;
      }

      setNoteText("");
      setNoteContext("review");
      setMessage(result?.message || "Internal note saved.");
      const refreshed = await listVendorAssignmentInternalNotes(assignmentId);
      setNotes(Array.isArray(refreshed?.items) ? refreshed.items : []);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label="Internal coordinator notes">
      <div>
        <h2 className="text-sm font-semibold text-slate-950">Internal coordinator notes</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Private AMC/internal notes for review and revision decisions. These are not sent to vendors.
        </p>
      </div>

      {canAddInternalNote ? (
        <form className="mt-4 space-y-3" onSubmit={saveNote}>
          <div className="grid gap-3 md:grid-cols-[180px_1fr]">
            <label className="block text-sm font-medium text-slate-700">
              Context
              <select
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                value={noteContext}
                onChange={(event) => setNoteContext(event.target.value)}
                disabled={saving}
              >
                {INTERNAL_NOTE_CONTEXTS.map((context) => (
                  <option key={context.value} value={context.value}>
                    {context.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Internal note
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                maxLength={4000}
                disabled={saving}
                placeholder="Add coordinator-only reasoning, review context, or revision notes."
              />
            </label>
          </div>
          {fieldErrors.note_context && <p className="text-sm text-rose-600">{fieldErrors.note_context}</p>}
          {fieldErrors.note_text && <p className="text-sm text-rose-600">{fieldErrors.note_text}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton icon={Plus} type="submit" disabled={saving || !noteText.trim()}>
              {saving ? "Saving..." : "Add Internal Note"}
            </ActionButton>
            {message && <p role="status" className="text-sm font-medium text-slate-600">{message}</p>}
          </div>
          {error && <p className="text-sm text-rose-600">{error.message || "Internal notes are unavailable."}</p>}
        </form>
      ) : (
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          You can review internal notes, but adding notes requires vendor assignment review authority.
        </p>
      )}

      <div className="mt-4 space-y-2">
        {loading && <p className="text-sm text-slate-500">Loading internal notes...</p>}
        {!loading && notes.length === 0 && (
          <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
            No internal notes yet.
          </p>
        )}
        {notes.map((note) => (
          <article key={note.note_key || `${note.created_at}-${note.note_text}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>{humanize(note.note_context || "review")}</span>
              <span>{formatDateTime(note.created_at)}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{note.note_text}</p>
            {note.author_name && <p className="mt-2 text-xs text-slate-500">By {note.author_name}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

export default function OwnerAssignmentPacket({ packet, onChanged }) {
  const showAssignmentInvitationEntry = canGenerateAssignmentInvitation(packet);
  const assignmentId = normalizedAssignmentId(packet);
  const assignmentStatus = packet.assignment_status || packet.status;
  const revision = revisionFromPacket(packet);
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
      <RevisionRequestSummary revision={revision} />
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
      {assignmentId && <InternalNotesPanel assignmentId={assignmentId} />}
      <AssignmentActivityTimeline assignmentId={assignmentId} refreshKey={activityRefreshKey} />
    </div>
  );
}
