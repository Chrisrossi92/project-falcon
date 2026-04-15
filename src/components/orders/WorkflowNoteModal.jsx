import React, { useEffect, useState } from "react";

export default function WorkflowNoteModal({
  open,
  title,
  description,
  confirmLabel,
  initialValue = "",
  busy = false,
  onCancel,
  onConfirm,
}) {
  const [note, setNote] = useState(initialValue);

  useEffect(() => {
    if (open) setNote(initialValue || "");
  }, [open, initialValue]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        </div>

        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="workflow-note">
          Note
        </label>
        <textarea
          id="workflow-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add context for the next person."
          rows={6}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          disabled={busy}
        />

        <div className="mt-2 text-xs text-slate-500">Attachment support coming next.</div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              console.log("WORKFLOW NOTE MODAL CONFIRM CLICK", {
                noteTextPresent: Boolean(note?.trim?.()),
                noteLength: typeof note === "string" ? note.length : 0,
              });
              onConfirm?.(note);
            }}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
          >
            {busy ? "Saving..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
