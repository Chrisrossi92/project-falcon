import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Send, X } from "lucide-react";

import { listCompanyRolePresets, sendCompanyInvitation } from "./api";

function safeInviteError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  if (/owner_grant_permission_required/.test(code) || /owner/i.test(message)) {
    return "You do not have permission to grant Owner access.";
  }
  if (/member_already_active/.test(code) || /already an active member/i.test(message)) {
    return "That person is already an active member of this company.";
  }
  if (/member_exists_inactive/.test(code) || /inactive company access/i.test(message)) {
    return "That person already has inactive company access. Reactivate them instead.";
  }
  if (/invalid_email/.test(code)) return "Enter a valid email address.";
  if (/invalid_role_ids|role_assign_permission_required/.test(code)) return "Choose valid role presets for this invitation.";
  if (/invite_permission_required|permission|forbidden|42501/i.test(`${code} ${message}`)) {
    return "You do not have permission to send this invitation.";
  }
  if (/auth_invite_failed/.test(code)) return "Falcon could not send the invite email.";
  return "Falcon could not send this invitation.";
}

function roleSortValue(role) {
  const name = String(role?.role_name || "").toLowerCase();
  if (name === "owner") return 1;
  if (name === "admin") return 2;
  if (name === "reviewer") return 3;
  if (name === "appraiser") return 4;
  if (name === "billing") return 5;
  return 99;
}

export default function InviteCompanyMemberModal({ open, onClose, onInvited }) {
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const [email, setEmail] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [primaryRoleId, setPrimaryRoleId] = useState("");
  const [reason, setReason] = useState("");
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const assignableRoles = useMemo(
    () => [...roles].filter((role) => role.assignable_by_current_user).sort((a, b) => roleSortValue(a) - roleSortValue(b) || String(a.role_name).localeCompare(String(b.role_name))),
    [roles]
  );

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setSelectedRoleIds([]);
    setPrimaryRoleId("");
    setReason("");
    setFormError("");
    setSubmitError("");
    setLoadingRoles(true);
    listCompanyRolePresets()
      .then((rows) => setRoles(rows))
      .catch((error) => {
        console.debug("Role preset list failed", {
          code: error?.code,
          message: error?.message,
        });
        setRoles([]);
        setSubmitError("Falcon could not load role presets.");
      })
      .finally(() => setLoadingRoles(false));
    setTimeout(() => closeButtonRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) {
        onClose?.();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [open, onClose, submitting]);

  useEffect(() => {
    if (!selectedRoleIds.length) {
      setPrimaryRoleId("");
      return;
    }
    if (!selectedRoleIds.includes(primaryRoleId)) {
      setPrimaryRoleId(selectedRoleIds[0]);
    }
  }, [primaryRoleId, selectedRoleIds]);

  if (!open) return null;

  const toggleRole = (roleId) => {
    setSelectedRoleIds((current) => {
      if (current.includes(roleId)) return current.filter((id) => id !== roleId);
      return [...current, roleId];
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setSubmitError("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(normalizedEmail)) {
      setFormError("Enter a valid email address.");
      return;
    }
    if (!selectedRoleIds.length) {
      setFormError("Choose at least one role preset.");
      return;
    }
    setSubmitting(true);
    try {
      const requestId = crypto.randomUUID();
      await sendCompanyInvitation({
        email: normalizedEmail,
        role_ids: selectedRoleIds,
        primary_role_id: primaryRoleId || selectedRoleIds[0],
        reason: reason.trim() || null,
        request_id: requestId,
      });
      onInvited?.();
    } catch (error) {
      console.debug("Company member invite failed", {
        code: error?.code,
        message: error?.message,
      });
      setSubmitError(safeInviteError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose?.();
      }}
    >
      <form
        ref={dialogRef}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-company-member-title"
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Team Access</div>
            <h2 id="invite-company-member-title" className="mt-1 text-xl font-semibold text-slate-950">Invite Member</h2>
            <p className="mt-1 text-sm text-slate-500">
              Send a company invitation with preset role access. Access activates only after the recipient accepts.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            aria-label="Close invite modal"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-5 px-5 py-5">
          {(formError || submitError) && (
            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>{formError || submitError}</div>
            </div>
          )}

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              placeholder="person@example.com"
              required
            />
            <span className="text-xs text-slate-500">The invited person appears as pending until they accept.</span>
          </label>

          <section aria-labelledby="role-presets-title" className="grid gap-2">
            <div>
              <h3 id="role-presets-title" className="text-sm font-medium text-slate-700">Role Presets</h3>
              <p className="mt-1 text-xs text-slate-500">
                Template roles only. These labels describe intended access after acceptance; backend permissions remain authoritative.
              </p>
            </div>
            {loadingRoles ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">Loading role presets...</div>
            ) : assignableRoles.length === 0 ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">No assignable role presets are available.</div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {assignableRoles.map((role) => {
                  const selected = selectedRoleIds.includes(role.role_id);
                  return (
                    <label
                      key={role.role_id}
                      className={`flex items-start gap-3 rounded-md border p-3 text-sm ${selected ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selected}
                        onChange={() => toggleRole(role.role_id)}
                        disabled={submitting}
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold text-slate-900">{role.role_name}</span>
                        {role.description && <span className="mt-0.5 block text-xs text-slate-500">{role.description}</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          {selectedRoleIds.length > 1 && (
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Primary Role</span>
              <select
                value={primaryRoleId}
                onChange={(event) => setPrimaryRoleId(event.target.value)}
                disabled={submitting}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              >
                {assignableRoles
                  .filter((role) => selectedRoleIds.includes(role.role_id))
                  .map((role) => (
                    <option key={role.role_id} value={role.role_id}>{role.role_name}</option>
                ))}
              </select>
              <span className="text-xs text-slate-500">Primary role is the main role label shown after acceptance.</span>
            </label>
          )}

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Reason</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              disabled={submitting}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            />
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || loadingRoles || !email.trim() || selectedRoleIds.length === 0}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {submitting ? "Sending..." : "Send Invite"}
          </button>
        </div>
      </form>
    </div>
  );
}
