import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { submitClientPortalOrderRequest } from "@/features/clientPortal/api";

const initialForm = Object.freeze({
  propertyAddress: "",
  propertyCity: "",
  propertyState: "",
  propertyPostalCode: "",
  propertyCounty: "",
  propertyType: "",
  propertyTypeOther: "",
  reportType: "",
  reportTypeOther: "",
  loanPurpose: "",
  loanPurposeOther: "",
  requestedDueDate: "",
  borrowerContactName: "",
  clientContactName: "",
  clientContactPhone: "",
  clientContactEmail: "",
  notes: "",
});

const PROPERTY_TYPE_OPTIONS = Object.freeze([
  "Office",
  "Retail",
  "Industrial",
  "Multifamily",
  "Mixed Use",
  "Land",
  "Special Purpose",
  "Other",
]);

const REPORT_TYPE_OPTIONS = Object.freeze([
  "Full Appraisal",
  "Restricted Appraisal",
  "Review",
  "Desktop",
  "Other",
]);

const LOAN_PURPOSE_OPTIONS = Object.freeze([
  "Purchase",
  "Refinance",
  "Construction",
  "Equity / HELOC",
  "Estate / Legal",
  "Internal Review",
  "Other",
]);

function Field({ children, helper = null, label }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-800">
      <span>{label}</span>
      {children}
      {helper ? <span className="text-xs font-normal leading-5 text-slate-500">{helper}</span> : null}
    </label>
  );
}

function FormSection({ children, eyebrow, title }) {
  return (
    <section className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm" aria-label={title}>
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {eyebrow}
        </div>
        <h2 className="mt-1 text-base font-semibold text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function inputClassName(extra = "") {
  return [
    "min-h-10 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-slate-950",
    "outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200",
    extra,
  ].join(" ");
}

function resolveControlledValue(value, otherValue) {
  return value === "Other" ? otherValue : value;
}

function hasText(value) {
  return String(value || "").trim().length > 0;
}

function orderRequestErrorMessage(error) {
  const message = String(error?.message || error?.details || error || "");

  if (/property_address_required/i.test(message)) {
    return "Enter the property address before submitting.";
  }
  if (/property_city_required/i.test(message)) {
    return "Enter the property city before submitting.";
  }
  if (/property_state_required/i.test(message)) {
    return "Enter the two-letter property state before submitting.";
  }
  if (/property_postal_code_required/i.test(message)) {
    return "Enter the property ZIP before submitting.";
  }
  if (/property_type_required/i.test(message)) {
    return "Enter the property type before submitting.";
  }
  if (/report_type_required/i.test(message)) {
    return "Enter the report type before submitting.";
  }
  if (/requested_due_date_must_be_future/i.test(message)) {
    return "Choose a requested due date in the future.";
  }
  if (/client_contact_email_invalid/i.test(message)) {
    return "Enter a valid contact email address.";
  }
  if (/client_portal_membership_required|client_portal_access_required|client_portal_order_request_create_required/i.test(message)) {
    return "Your Client Portal access could not be confirmed. Return to your invitation link or contact your appraisal team.";
  }
  if (/client_portal_order_request_permission_required|client_portal_orders_create_required/i.test(message)) {
    return "Your Client Portal access does not allow new appraisal requests. Contact your appraisal team.";
  }
  if (/client_portal_authentication_required|authentication_required/i.test(message)) {
    return "Sign in to submit an appraisal request.";
  }

  return "The request could not be submitted. Try again or contact your appraisal team.";
}

export default function ClientPortalNewOrderPage() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submittedRequest, setSubmittedRequest] = useState(null);

  const completedRequiredCount = useMemo(() => {
    const propertyType = resolveControlledValue(form.propertyType, form.propertyTypeOther);
    const reportType = resolveControlledValue(form.reportType, form.reportTypeOther);
    return [
      form.propertyAddress,
      form.propertyCity,
      form.propertyState,
      form.propertyPostalCode,
      propertyType,
      reportType,
    ].filter(hasText).length;
  }, [form]);
  const completionPercent = Math.round((completedRequiredCount / 6) * 100);

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
      const result = await submitClientPortalOrderRequest({
        propertyAddress: form.propertyAddress,
        propertyCity: form.propertyCity,
        propertyState: form.propertyState,
        propertyPostalCode: form.propertyPostalCode,
        propertyCounty: form.propertyCounty,
        propertyType: resolveControlledValue(form.propertyType, form.propertyTypeOther),
        reportType: resolveControlledValue(form.reportType, form.reportTypeOther),
        loanPurpose: resolveControlledValue(form.loanPurpose, form.loanPurposeOther),
        requestedDueDate: form.requestedDueDate,
        borrowerContactName: form.borrowerContactName,
        clientContactName: form.clientContactName,
        clientContactPhone: form.clientContactPhone,
        clientContactEmail: form.clientContactEmail,
        notes: form.notes,
      });
      setSubmittedRequest(result);
      setForm(initialForm);
    } catch (err) {
      setError(orderRequestErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedRequest) {
    return (
      <div className="grid gap-6">
        <section className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Request Appraisal
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">Request submitted</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Your appraisal team will review the details and confirm next steps.
          </p>
        </section>

        <section className="grid gap-5 rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Received
            </div>
            <h2 className="mt-1 text-lg font-semibold text-emerald-950">
              {submittedRequest.propertyAddress || "Appraisal request"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-800">
              Your request is queued for review. The appraisal team will confirm scope, timing, and
              any supporting documents needed before the appraisal moves forward.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-emerald-200 bg-white/70 p-3 text-sm text-emerald-900">
              <div className="font-semibold">1. Review</div>
              <div className="mt-1 text-xs leading-5">The request details are checked by the team.</div>
            </div>
            <div className="rounded-md border border-emerald-200 bg-white/70 p-3 text-sm text-emerald-900">
              <div className="font-semibold">2. Confirmation</div>
              <div className="mt-1 text-xs leading-5">Timing and any document needs are confirmed.</div>
            </div>
            <div className="rounded-md border border-emerald-200 bg-white/70 p-3 text-sm text-emerald-900">
              <div className="font-semibold">3. Tracking</div>
              <div className="mt-1 text-xs leading-5">Approved work appears in your portal.</div>
            </div>
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
              View appraisals
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
          Request Appraisal
        </div>
        <h1 className="text-2xl font-semibold text-slate-950">Request a new appraisal</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Send the property, assignment, and contact details your appraisal team needs to begin review.
        </p>
      </section>

      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm" aria-label="Request progress">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-950">Request progress</div>
            <p className="mt-1 text-xs text-slate-500">
              {completedRequiredCount} of 6 required fields complete
            </p>
          </div>
          <div className="text-sm font-semibold text-slate-700">{completionPercent}%</div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-slate-900 transition-all"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5" aria-label="Appraisal request">
        <FormSection eyebrow="Step 1" title="Property">
          <Field label="Property address">
            <textarea
              required
              rows={3}
              value={form.propertyAddress}
              onChange={(event) => updateField("propertyAddress", event.target.value)}
              className={inputClassName("resize-y")}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-[1fr_96px_140px]">
            <Field label="City">
              <input
                required
                value={form.propertyCity}
                onChange={(event) => updateField("propertyCity", event.target.value)}
                className={inputClassName()}
              />
            </Field>
            <Field label="State">
              <input
                required
                value={form.propertyState}
                onChange={(event) => updateField("propertyState", event.target.value.toUpperCase())}
                maxLength={2}
                className={inputClassName()}
              />
            </Field>
            <Field label="ZIP">
              <input
                required
                value={form.propertyPostalCode}
                onChange={(event) => updateField("propertyPostalCode", event.target.value)}
                className={inputClassName()}
              />
            </Field>
          </div>

          <Field label="County">
            <input
              value={form.propertyCounty}
              onChange={(event) => updateField("propertyCounty", event.target.value)}
              className={inputClassName()}
            />
          </Field>
        </FormSection>

        <FormSection eyebrow="Step 2" title="Assignment Details">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Property type">
              <select
                required
                value={form.propertyType}
                onChange={(event) => updateField("propertyType", event.target.value)}
                className={inputClassName()}
              >
                <option value="">Select property type...</option>
                {PROPERTY_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {form.propertyType === "Other" ? (
                <input
                  required
                  value={form.propertyTypeOther}
                  onChange={(event) => updateField("propertyTypeOther", event.target.value)}
                  className={inputClassName("mt-2")}
                  placeholder="Describe property type"
                />
              ) : null}
            </Field>
            <Field label="Report type">
              <select
                required
                value={form.reportType}
                onChange={(event) => updateField("reportType", event.target.value)}
                className={inputClassName()}
              >
                <option value="">Select report type...</option>
                {REPORT_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {form.reportType === "Other" ? (
                <input
                  required
                  value={form.reportTypeOther}
                  onChange={(event) => updateField("reportTypeOther", event.target.value)}
                  className={inputClassName("mt-2")}
                  placeholder="Describe report type"
                />
              ) : null}
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Loan purpose">
              <select
                value={form.loanPurpose}
                onChange={(event) => updateField("loanPurpose", event.target.value)}
                className={inputClassName()}
              >
                <option value="">Select loan purpose...</option>
                {LOAN_PURPOSE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {form.loanPurpose === "Other" ? (
                <input
                  value={form.loanPurposeOther}
                  onChange={(event) => updateField("loanPurposeOther", event.target.value)}
                  className={inputClassName("mt-2")}
                  placeholder="Describe intended use"
                />
              ) : null}
            </Field>
            <Field label="Requested due date">
              <input
                type="date"
                value={form.requestedDueDate}
                onChange={(event) => updateField("requestedDueDate", event.target.value)}
                className={inputClassName()}
              />
            </Field>
            <p className="-mt-3 text-xs leading-5 text-slate-500">
              Optional. Your team will confirm feasibility.
            </p>
          </div>
        </FormSection>

        <FormSection eyebrow="Step 3" title="Contacts">
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
        </FormSection>

        <FormSection eyebrow="Step 4" title="Documents">
          <div className="rounded-md border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-slate-600">
            Upload is not available from this portal form yet. Typical supporting documents include
            engagement letters, purchase contracts, rent rolls, surveys, plans, prior appraisals,
            and property contact instructions. Your appraisal team can request files after reviewing
            the submission.
          </div>
        </FormSection>

        <FormSection eyebrow="Step 5" title="Review">
          <Field label="Notes or special instructions">
            <textarea
              rows={4}
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              className={inputClassName("resize-y")}
            />
          </Field>

          <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
            <div className="text-sm font-semibold text-slate-950">Before submitting</div>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Confirm the property, report type, and best contact information are accurate. The
              request will be reviewed before it becomes an active appraisal.
            </p>
          </div>
        </FormSection>

        {error ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting request..." : "Submit request"}
          </button>
          <Link
            to="/client-portal/orders"
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
