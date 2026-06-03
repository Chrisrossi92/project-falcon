import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, X } from "lucide-react";

import {
  listOrderVendorBidRequests,
  recordOrderVendorBidResponse,
  selectOrderVendorBidResponse,
} from "../api";

const RECORDABLE_REQUEST_STATUSES = new Set(["draft", "sent", "partially_responded"]);
const RECORDABLE_RECIPIENT_STATUSES = new Set(["pending", "sent", "viewed"]);
const SELECTABLE_REQUEST_STATUSES = new Set(["sent", "partially_responded"]);

function humanize(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";
}

function formatDateTime(value) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatMoney(amount, currency = "USD") {
  if (amount === null || amount === undefined || amount === "") return null;
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount)) return null;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(numericAmount);
}

function getRecipients(request = {}) {
  return Array.isArray(request.recipients) ? request.recipients : [];
}

function getRespondedCount(request = {}) {
  return getRecipients(request).filter((recipient) => recipient.status === "responded" || recipient.response).length;
}

function getSelectedRecipient(request = {}) {
  return getRecipients(request).find((recipient) => {
    return recipient.status === "selected" || recipient.response?.selected_at;
  }) || null;
}

function getRecipientId(recipient = {}) {
  return recipient.recipient_id || recipient.id || null;
}

function getResponseId(response = {}) {
  return response.response_id || response.id || null;
}

function canRecordRecipientResponse(request = {}, recipient = {}) {
  return (
    RECORDABLE_REQUEST_STATUSES.has(String(request.status || "")) &&
    RECORDABLE_RECIPIENT_STATUSES.has(String(recipient.status || "")) &&
    !recipient.response &&
    Boolean(getRecipientId(recipient))
  );
}

function canSelectRecipientResponse(request = {}, recipient = {}) {
  const response = recipient.response;
  const status = String(recipient.status || "");

  return (
    SELECTABLE_REQUEST_STATUSES.has(String(request.status || "")) &&
    status === "responded" &&
    Boolean(response) &&
    !response.selected_at &&
    Boolean(getResponseId(response))
  );
}

function formatRecordResponseError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");

  if (code === "42501" || /permission|not authorized|authorization/i.test(message)) {
    return "You do not have permission to record bid responses.";
  }

  return "Bid response could not be recorded. Review the details and try again.";
}

function formatSelectResponseError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");

  if (code === "42501" || /permission|not authorized|authorization/i.test(message)) {
    return "You do not have permission to select bid responses.";
  }

  return "Bid response could not be selected. Review the bid status and try again.";
}

function normalizeCurrency(value) {
  const currency = String(value || "USD").trim().toUpperCase();
  return currency || "USD";
}

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
}

function ResponseSummary({ response }) {
  if (!response) return null;

  const fee = formatMoney(response.fee_amount, response.currency);
  const parts = [];
  if (fee) parts.push(fee);
  if (response.turn_time_days !== null && response.turn_time_days !== undefined) {
    parts.push(`${response.turn_time_days} day${Number(response.turn_time_days) === 1 ? "" : "s"}`);
  }
  if (response.proposed_due_at) {
    parts.push(`Due ${formatDateTime(response.proposed_due_at)}`);
  }

  return (
    <div className="mt-1 text-xs text-slate-500">
      {parts.length ? parts.join(" · ") : "Response recorded"}
      {response.comments && <div className="mt-1 text-slate-600">{response.comments}</div>}
    </div>
  );
}

function RecordResponseModal({ recipient, onClose, onSuccess }) {
  const [feeAmount, setFeeAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [proposedDueAt, setProposedDueAt] = useState("");
  const [turnTimeDays, setTurnTimeDays] = useState("");
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const vendorName = recipient?.vendor_company_name || "Vendor";

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setErrorMessage("");

    try {
      await recordOrderVendorBidResponse(getRecipientId(recipient), {
        fee_amount: numberOrNull(feeAmount),
        currency: normalizeCurrency(currency),
        proposed_due_at: proposedDueAt || null,
        turn_time_days: numberOrNull(turnTimeDays),
        comments: comments.trim() || null,
      });
      await onSuccess?.();
    } catch (recordError) {
      setErrorMessage(formatRecordResponseError(recordError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-bid-response-title"
        className="w-full max-w-lg rounded-md bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h2 id="record-bid-response-title" className="text-base font-semibold text-slate-950">
              Record response
            </h2>
            <p className="mt-1 text-sm text-slate-500">{vendorName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-60"
            aria-label="Close record response dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 p-4">
          {errorMessage && (
            <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Fee amount
              <input
                type="number"
                min="0"
                step="0.01"
                value={feeAmount}
                onChange={(event) => setFeeAmount(event.target.value)}
                className="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Currency
              <input
                type="text"
                maxLength={3}
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className="h-10 rounded-md border border-slate-200 px-3 text-sm uppercase text-slate-900"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Proposed due date
              <input
                type="datetime-local"
                value={proposedDueAt}
                onChange={(event) => setProposedDueAt(event.target.value)}
                className="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Turn time days
              <input
                type="number"
                min="0"
                step="1"
                value={turnTimeDays}
                onChange={(event) => setTurnTimeDays(event.target.value)}
                className="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900"
              />
            </label>
          </div>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Comments
            <textarea
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              rows={4}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save response"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SelectBidModal({ recipient, onClose, onSuccess }) {
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const response = recipient?.response || {};
  const vendorName = recipient?.vendor_company_name || "Vendor";
  const fee = formatMoney(response.fee_amount, response.currency);

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setErrorMessage("");

    try {
      await selectOrderVendorBidResponse(getResponseId(response));
      await onSuccess?.();
    } catch (selectError) {
      setErrorMessage(formatSelectResponseError(selectError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="select-bid-title"
        className="w-full max-w-lg rounded-md bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h2 id="select-bid-title" className="text-base font-semibold text-slate-950">
              Select bid
            </h2>
            <p className="mt-1 text-sm text-slate-500">{vendorName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-60"
            aria-label="Close select bid dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 p-4">
          {errorMessage && (
            <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Fee</dt>
                <dd className="font-semibold text-slate-950">{fee || "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Proposed due</dt>
                <dd className="font-semibold text-slate-950">{formatDateTime(response.proposed_due_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Turn time</dt>
                <dd className="font-semibold text-slate-950">
                  {response.turn_time_days !== null && response.turn_time_days !== undefined
                    ? `${response.turn_time_days} day${Number(response.turn_time_days) === 1 ? "" : "s"}`
                    : "Not provided"}
                </dd>
              </div>
            </dl>
            {response.comments && (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <div className="text-xs font-semibold uppercase text-slate-400">Comments</div>
                <p className="mt-1 text-slate-700">{response.comments}</p>
              </div>
            )}
          </div>

          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Selecting this bid does not create an assignment yet.
          </p>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Selecting..." : "Confirm selection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecipientRow({
  recipient,
  canRecordResponse,
  canSelectResponse,
  onRecordResponse,
  onSelectResponse,
}) {
  return (
    <li className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">
            {recipient.vendor_company_name || "Vendor"}
          </div>
          <ResponseSummary response={recipient.response} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canRecordResponse && (
            <button
              type="button"
              onClick={onRecordResponse}
              className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              aria-label={`Record response for ${recipient.vendor_company_name || "vendor"}`}
            >
              Record response
            </button>
          )}
          {canSelectResponse && (
            <button
              type="button"
              onClick={onSelectResponse}
              className="inline-flex h-8 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
              aria-label={`Select bid for ${recipient.vendor_company_name || "vendor"}`}
            >
              Select bid
            </button>
          )}
          <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {humanize(recipient.status)}
          </span>
        </div>
      </div>
    </li>
  );
}

function BidRequestCard({
  request,
  canRecordResponses,
  canSelectResponses,
  onRecordResponse,
  onSelectResponse,
}) {
  const recipients = getRecipients(request);
  const selectedRecipient = getSelectedRecipient(request);
  const recipientCount = recipients.length;
  const respondedCount = getRespondedCount(request);

  return (
    <article className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-950">Bid request</h3>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              {humanize(request.status)}
            </span>
          </div>
          <div className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-3">
            <div>
              <span className="font-semibold text-slate-600">Response due:</span>{" "}
              {formatDateTime(request.response_due_at)}
            </div>
            <div>
              <span className="font-semibold text-slate-600">Vendor due:</span>{" "}
              {formatDateTime(request.desired_vendor_due_at)}
            </div>
            <div>
              <span className="font-semibold text-slate-600">Client due:</span>{" "}
              {formatDateTime(request.client_due_at)}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right text-sm">
          <div className="rounded-md bg-white px-3 py-2 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase text-slate-400">Recipients</div>
            <div className="font-semibold text-slate-950">{recipientCount}</div>
          </div>
          <div className="rounded-md bg-white px-3 py-2 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase text-slate-400">Responded</div>
            <div className="font-semibold text-slate-950">{respondedCount}</div>
          </div>
        </div>
      </div>

      {selectedRecipient?.response && (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <div className="font-semibold">Selected response: {selectedRecipient.vendor_company_name || "Vendor"}</div>
          <ResponseSummary response={selectedRecipient.response} />
        </div>
      )}

      {recipients.length > 0 && (
        <ul className="mt-3 grid gap-2">
          {recipients.map((recipient) => (
            <RecipientRow
              key={getRecipientId(recipient) || recipient.vendor_profile_id}
              recipient={recipient}
              canRecordResponse={canRecordResponses && canRecordRecipientResponse(request, recipient)}
              canSelectResponse={canSelectResponses && canSelectRecipientResponse(request, recipient)}
              onRecordResponse={() => onRecordResponse?.(recipient)}
              onSelectResponse={() => onSelectResponse?.(recipient)}
            />
          ))}
        </ul>
      )}
    </article>
  );
}

export default function BidRequestsPanel({
  orderId,
  enabled = true,
  hasActiveVendorAssignment = false,
  canRecordResponses = false,
  canSelectResponses = false,
  refreshToken = 0,
  onBidRequestsChange,
  className = "",
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recordResponseRecipient, setRecordResponseRecipient] = useState(null);
  const [selectResponseRecipient, setSelectResponseRecipient] = useState(null);

  const loadBidRequests = useCallback(async () => {
    if (!enabled || !orderId) return;
    setLoading(true);
    setError(null);

    try {
      const rows = await listOrderVendorBidRequests(orderId);
      const nextRequests = Array.isArray(rows) ? rows : [];
      setRequests(nextRequests);
      onBidRequestsChange?.(nextRequests);
    } catch (loadError) {
      if (import.meta.env.DEV || import.meta.env.MODE === "test") {
        console.warn("[BidRequestsPanel] bid request load failed", {
          code: loadError?.code,
          message: loadError?.message,
          details: loadError?.details,
          hint: loadError?.hint,
        });
      }
      setRequests([]);
      onBidRequestsChange?.([]);
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [enabled, onBidRequestsChange, orderId]);

  useEffect(() => {
    if (!enabled || !orderId) return;
    loadBidRequests();
  }, [enabled, loadBidRequests, orderId, refreshToken]);

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
  }, [requests]);

  if (!enabled) return null;

  return (
    <section className={`rounded-md border border-slate-200 bg-white p-3 shadow-sm ${className}`} aria-label="Bid requests">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Bid requests
          </div>
          <p className="mt-1 text-sm font-medium text-slate-950">
            Vendor fee and turn-time outreach for this order.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Bid requests do not assign work automatically.
          </p>
        </div>
        {orderId && (
          <button
            type="button"
            onClick={loadBidRequests}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>
        )}
      </div>

      {!orderId && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Order context is required before bid requests can load.
        </div>
      )}

      {loading && (
        <div role="status" className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
          Loading bid requests...
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <div className="font-semibold">Bid requests could not load.</div>
          <p className="mt-1">Review permissions and order details, then try again.</p>
        </div>
      )}

      {!loading && !error && orderId && sortedRequests.length === 0 && (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="font-semibold text-slate-800">No bid requests</div>
          <p className="mt-1 leading-6">
            No vendor bid outreach has been recorded for this order.
          </p>
          {hasActiveVendorAssignment && (
            <p className="mt-1 leading-6">
              No bid requests were recorded before this assignment.
            </p>
          )}
        </div>
      )}

      {!loading && !error && sortedRequests.length > 0 && (
        <div className="mt-3 grid gap-3">
          {sortedRequests.map((request) => (
            <BidRequestCard
              key={request.bid_request_id || request.id}
              request={request}
              canRecordResponses={canRecordResponses}
              canSelectResponses={canSelectResponses}
              onRecordResponse={setRecordResponseRecipient}
              onSelectResponse={setSelectResponseRecipient}
            />
          ))}
        </div>
      )}

      {recordResponseRecipient && (
        <RecordResponseModal
          recipient={recordResponseRecipient}
          onClose={() => setRecordResponseRecipient(null)}
          onSuccess={async () => {
            setRecordResponseRecipient(null);
            await loadBidRequests();
          }}
        />
      )}

      {selectResponseRecipient && (
        <SelectBidModal
          recipient={selectResponseRecipient}
          onClose={() => setSelectResponseRecipient(null)}
          onSuccess={async () => {
            setSelectResponseRecipient(null);
            await loadBidRequests();
          }}
        />
      )}
    </section>
  );
}
