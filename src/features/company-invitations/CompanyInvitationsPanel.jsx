import { useCallback, useEffect, useMemo, useState } from "react";
import { MailPlus, RefreshCw, Send, XCircle } from "lucide-react";
import toast from "react-hot-toast";

import {
  cancelCompanyInvitation,
  listCompanyInvitations,
  resendCompanyInvitation,
} from "./api";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status) {
  const labels = {
    prepared: "Ready to send",
    sent: "Awaiting acceptance",
    auth_failed: "Needs attention",
    accepted: "Accepted",
    cancelled: "Cancelled",
    expired: "Expired",
  };
  return labels[status] || status || "-";
}

function statusClass(status) {
  if (status === "sent" || status === "prepared") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "accepted") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "auth_failed") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function statusHelp(status) {
  const labels = {
    prepared: "Staged invite. Send again or cancel if the details are wrong.",
    sent: "Invite sent. Access starts only after the recipient accepts.",
    auth_failed: "Email send needs attention. Resend or cancel if needed.",
    accepted: "Accepted by the recipient. Membership is now governed by Team Access.",
    cancelled: "Cancelled invitations cannot be used for access.",
    expired: "Expired invitations cannot be used. Send a new invite if access is still needed.",
  };
  return labels[status] || "Invitation state recorded";
}

function statusAccessNote(status) {
  if (status === "accepted") return "Active after acceptance";
  if (status === "cancelled" || status === "expired") return "No active access";
  return "Pending access";
}

function safeInvitationError(error, fallback) {
  const text = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  if (/invitation_not_found|not_resendable|not_cancelable|no longer/.test(text)) {
    return "This invitation is no longer available.";
  }
  if (/company_inactive/.test(text)) return "This company is not active.";
  if (/role_preset_invalid/.test(text)) {
    return "The invited role preset is no longer available. Send a new invite.";
  }
  if (/permission|forbidden|42501|unauthorized/.test(text)) {
    return "You do not have permission to manage this invitation.";
  }
  if (/auth_invite_failed/.test(text)) return "Falcon could not send the invite email.";
  return fallback;
}

function roleNames(invitation) {
  const roles = Array.isArray(invitation.role_assignments) ? invitation.role_assignments : [];
  if (!roles.length) return "-";
  return roles.map((role) => {
    const label = role.display_name || role.role_name || role.role_key || "Role";
    return role.is_primary ? `${label} (primary)` : label;
  }).join(", ");
}

function timestampDetail(label, value, fallback = "Not recorded") {
  return (
    <div className="grid gap-0.5">
      <span className="font-medium text-slate-700">{formatDate(value)}</span>
      <span className="text-xs text-slate-400">{value ? label : fallback}</span>
    </div>
  );
}

export default function CompanyInvitationsPanel({
  canList,
  canInvite,
  onOpenInvite,
  refreshToken = 0,
}) {
  const [status, setStatus] = useState("open");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const title = useMemo(() => {
    if (status === "terminal") return "Past Invitations";
    if (status === "all") return "All Invitations";
    return "Pending Invitations";
  }, [status]);

  const load = useCallback(async () => {
    if (!canList) return;
    setLoading(true);
    setError(null);
    try {
      const invitations = await listCompanyInvitations(status, 100);
      setRows(invitations);
    } catch (loadError) {
      console.debug("Company invitation list failed", {
        code: loadError?.code,
        message: loadError?.message,
      });
      setRows([]);
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [canList, status]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  if (!canList) return null;

  const handleCancel = async (invitation) => {
    const ok = window.confirm("Cancel this invitation? The recipient will no longer be able to use this invite.");
    if (!ok) return;
    setBusyId(invitation.invitation_id);
    try {
      await cancelCompanyInvitation(invitation.invitation_id, "Cancelled from Team Access", crypto.randomUUID());
      toast.success("Invitation cancelled.");
      await load();
    } catch (cancelError) {
      console.debug("Company invitation cancel failed", {
        code: cancelError?.code,
        message: cancelError?.message,
      });
      toast.error(safeInvitationError(cancelError, "Falcon could not cancel this invitation."));
    } finally {
      setBusyId(null);
    }
  };

  const handleResend = async (invitation) => {
    setBusyId(invitation.invitation_id);
    try {
      await resendCompanyInvitation(invitation.invitation_id, {
        expiresInDays: 7,
        reason: "Resent from Team Access",
      });
      toast.success("Invite email sent.");
      await load();
    } catch (resendError) {
      console.debug("Company invitation resend failed", {
        code: resendError?.code,
        message: resendError?.message,
      });
      toast.error(safeInvitationError(resendError, "Falcon could not resend this invitation."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Team Access</div>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pending invitations are separate from active team membership and do not grant access until accepted.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm"
          >
            <option value="open">Pending/Open</option>
            <option value="terminal">Past/Terminal</option>
            <option value="all">All</option>
          </select>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
          {canInvite && (
            <button
              type="button"
              onClick={onOpenInvite}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <MailPlus className="h-4 w-4" aria-hidden="true" />
              Invite New Member
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="px-4 py-6 text-sm text-slate-500">Loading invitations...</div>
      ) : error ? (
        <div className="px-4 py-6">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Falcon could not load company invitations.
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-6 text-sm text-slate-500">
          {status === "open"
            ? "No pending invitations. Invite a member when another person needs company access."
            : "No invitations found for this filter."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Invited Member</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Invited By</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Sent</th>
                {status !== "open" && <th className="px-4 py-3">Closed</th>}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((invitation) => (
                <tr key={invitation.invitation_id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="grid gap-0.5">
                      <span className="font-medium text-slate-900">{invitation.invite_email}</span>
                      <span className="text-xs text-slate-500">{statusAccessNote(invitation.invitation_status)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="grid gap-1">
                      <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(invitation.invitation_status)}`}>
                        {statusLabel(invitation.invitation_status)}
                      </span>
                      <span className="text-xs text-slate-500">{statusHelp(invitation.invitation_status)}</span>
                    </div>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">
                    <div className="grid gap-0.5">
                      <span>{roleNames(invitation)}</span>
                      <span className="text-xs text-slate-400">Role presets apply after acceptance.</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{invitation.invited_by_display_name || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{timestampDetail("Created", invitation.created_at)}</td>
                  <td className="px-4 py-3 text-slate-600">{timestampDetail("Invite expires", invitation.expires_at)}</td>
                  <td className="px-4 py-3 text-slate-600">{timestampDetail("Backend send recorded", invitation.auth_invite_sent_at, "Send not recorded")}</td>
                  {status !== "open" && (
                    <td className="px-4 py-3 text-slate-600">
                      {timestampDetail(
                        invitation.accepted_at ? "Accepted" : invitation.cancelled_at ? "Cancelled" : "No close timestamp",
                        invitation.accepted_at || invitation.cancelled_at,
                        invitation.invitation_status === "expired" ? "Expired by deadline" : "Not recorded"
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {invitation.can_resend && (
                        <button
                          type="button"
                          onClick={() => handleResend(invitation)}
                          disabled={busyId === invitation.invitation_id}
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          <Send className="h-3.5 w-3.5" aria-hidden="true" />
                          Send another invite email
                        </button>
                      )}
                      {invitation.can_cancel && (
                        <button
                          type="button"
                          onClick={() => handleCancel(invitation)}
                          disabled={busyId === invitation.invitation_id}
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-red-200 bg-white px-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          Cancel
                        </button>
                      )}
                      {!invitation.can_resend && !invitation.can_cancel && (
                        <span className="text-xs text-slate-400">No actions</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
