import { useState } from "react";
import { Link } from "react-router-dom";

import { submitClientPortalOrderRequest } from "@/features/clientPortal/api";

const initialForm = Object.freeze({
  propertyAddress: "",
  propertyType: "",
  reportType: "",
  loanPurpose: "",
  requestedDueDate: "",
  borrowerContactName: "",
  clientContactName: "",
  clientContactPhone: "",
  clientContactEmail: "",
  notes: "",
});

function Field({ children, label }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-800">
      <span>{label}</span>
      {children}
    </label>
  );
}

function inputClassName(extra = "") {
  return [
    "min-h-10 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-slate-950",
    "outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200",
    extra,
  ].join(" ");
}

export default function ClientPortalNewOrderPage() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submittedRequest, setSubmittedRequest] = useState(null);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await submitClientPortalOrderRequest(form);
      setSubmittedRequest(result);
      setForm(initialForm);
    } catch (err) {
      setError(err?.message || "The request could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedRequest) {
    return (
      <div className="grid gap-6">
        <section className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Order Appraisal
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">Request submitted</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Your team will review and confirm the details before the appraisal moves forward.
          </p>
        </section>

        <section className="grid gap-4 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
          <div>
            <h2 className="text-base font-semibold text-emerald-950">Request received</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-800">
              We received your request for {submittedRequest.propertyAddress || "this property"}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSubmittedRequest(null)}
              className="rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
            >
              Submit another request
            </button>
            <Link
              to="/client-portal/orders"
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
            >
              View orders
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Order Appraisal
        </div>
        <h1 className="text-2xl font-semibold text-slate-950">Request an appraisal</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Send the property and contact details your team needs to review the request.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 rounded-lg border border-stone-200 bg-white p-5"
        aria-label="Appraisal request"
      >
        <section className="grid gap-4" aria-label="Property details">
          <h2 className="text-base font-semibold text-slate-950">Property details</h2>
          <Field label="Property address">
            <textarea
              required
              rows={3}
              value={form.propertyAddress}
              onChange={(event) => updateField("propertyAddress", event.target.value)}
              className={inputClassName("resize-y")}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Property type">
              <input
                required
                value={form.propertyType}
                onChange={(event) => updateField("propertyType", event.target.value)}
                className={inputClassName()}
                placeholder="Single family, condo, multifamily"
              />
            </Field>
            <Field label="Report type">
              <input
                required
                value={form.reportType}
                onChange={(event) => updateField("reportType", event.target.value)}
                className={inputClassName()}
                placeholder="Full appraisal, desktop, review"
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Loan purpose">
              <input
                value={form.loanPurpose}
                onChange={(event) => updateField("loanPurpose", event.target.value)}
                className={inputClassName()}
                placeholder="Purchase, refinance, equity"
              />
            </Field>
            <Field label="Requested due date">
              <input
                type="date"
                value={form.requestedDueDate}
                onChange={(event) => updateField("requestedDueDate", event.target.value)}
                className={inputClassName()}
              />
            </Field>
          </div>
        </section>

        <section className="grid gap-4" aria-label="Contact details">
          <h2 className="text-base font-semibold text-slate-950">Contact details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Borrower or property contact">
              <input
                value={form.borrowerContactName}
                onChange={(event) => updateField("borrowerContactName", event.target.value)}
                className={inputClassName()}
              />
            </Field>
            <Field label="Your contact name">
              <input
                value={form.clientContactName}
                onChange={(event) => updateField("clientContactName", event.target.value)}
                className={inputClassName()}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Contact phone">
              <input
                type="tel"
                value={form.clientContactPhone}
                onChange={(event) => updateField("clientContactPhone", event.target.value)}
                className={inputClassName()}
              />
            </Field>
            <Field label="Contact email">
              <input
                type="email"
                value={form.clientContactEmail}
                onChange={(event) => updateField("clientContactEmail", event.target.value)}
                className={inputClassName()}
              />
            </Field>
          </div>
        </section>

        <section className="grid gap-4" aria-label="Instructions">
          <h2 className="text-base font-semibold text-slate-950">Instructions</h2>
          <Field label="Notes or special instructions">
            <textarea
              rows={4}
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              className={inputClassName("resize-y")}
            />
          </Field>
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm leading-6 text-slate-600">
            File upload is not available yet. Your team can request supporting documents after
            reviewing the request.
          </div>
        </section>

        {error ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting request..." : "Submit request"}
          </button>
          <Link
            to="/client-portal/orders"
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
