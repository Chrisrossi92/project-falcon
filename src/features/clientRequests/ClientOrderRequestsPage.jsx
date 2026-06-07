import { useEffect, useMemo, useState } from "react";

import {
  getClientOrderRequestReviewDetail,
  listClientOrderRequestsForReview,
  updateClientOrderRequestReviewStatus,
} from "@/features/clientRequests/api";

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function statusLabel(status) {
  switch (status) {
    case "under_review":
      return "Reviewing";
    case "accepted":
      return "Accepted";
    case "declined":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    case "submitted":
    default:
      return "Submitted";
  }
}

function DetailItem({ label, value }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value || "Not provided"}</div>
    </div>
  );
}

export default function ClientOrderRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);
  const [actionState, setActionState] = useState({ loading: false, error: null });

  useEffect(() => {
    let active = true;

    async function loadRequests() {
      setLoadingList(true);
      setError(null);

      try {
        const rows = await listClientOrderRequestsForReview();
        if (!active) return;
        setRequests(rows);
        setSelectedKey((current) => current || rows[0]?.requestKey || null);
      } catch (err) {
        if (!active) return;
        setRequests([]);
        setError(err);
      } finally {
        if (active) setLoadingList(false);
      }
    }

    loadRequests();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedKey) {
      setDetail(null);
      return undefined;
    }

    let active = true;

    async function loadDetail() {
      setLoadingDetail(true);
      setActionState({ loading: false, error: null });

      try {
        const row = await getClientOrderRequestReviewDetail(selectedKey);
        if (!active) return;
        setDetail(row);
      } catch (err) {
        if (!active) return;
        setDetail(null);
        setActionState({ loading: false, error: err?.message || "Request detail is unavailable." });
      } finally {
        if (active) setLoadingDetail(false);
      }
    }

    loadDetail();

    return () => {
      active = false;
    };
  }, [selectedKey]);

  const selectedSummary = useMemo(
    () => requests.find((request) => request.requestKey === selectedKey) || null,
    [requests, selectedKey],
  );

  async function handleStatus(status) {
    if (!detail?.requestKey || actionState.loading) return;

    setActionState({ loading: true, error: null });

    try {
      const updated = await updateClientOrderRequestReviewStatus(detail.requestKey, status);
      setDetail((current) => ({
        ...current,
        ...updated,
      }));
      setRequests((current) =>
        current.map((request) =>
          request.requestKey === detail.requestKey
            ? {
                ...request,
                status: updated?.status || status,
                reviewedAt: updated?.reviewedAt || request.reviewedAt,
              }
            : request,
        ),
      );
      setActionState({ loading: false, error: null });
    } catch (err) {
      setActionState({
        loading: false,
        error: err?.message || "The request status could not be updated.",
      });
    }
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Clients
        </div>
        <h1 className="text-2xl font-semibold text-slate-950">Client Order Requests</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Review Client Portal appraisal requests before they enter the operational order workflow.
        </p>
      </section>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">
          Client order requests are unavailable.
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="rounded-lg border border-stone-200 bg-white" aria-label="Client request list">
          <div className="border-b border-stone-200 p-4">
            <h2 className="text-base font-semibold text-slate-950">Inbox</h2>
            <p className="mt-1 text-sm text-slate-600">
              Submitted and reviewing requests for the current company.
            </p>
          </div>

          {loadingList ? (
            <div className="p-4 text-sm text-slate-500">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">No client order requests are waiting.</div>
          ) : (
            <div className="divide-y divide-stone-200">
              {requests.map((request) => (
                <button
                  type="button"
                  key={request.requestKey}
                  onClick={() => setSelectedKey(request.requestKey)}
                  className={[
                    "grid w-full gap-1 px-4 py-3 text-left text-sm transition hover:bg-stone-50",
                    request.requestKey === selectedKey ? "bg-stone-50" : "bg-white",
                  ].join(" ")}
                >
                  <span className="font-semibold text-slate-950">{request.propertyAddress}</span>
                  <span className="text-slate-600">{request.clientName}</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {statusLabel(request.status)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-stone-200 bg-white" aria-label="Client request detail">
          <div className="border-b border-stone-200 p-4">
            <h2 className="text-base font-semibold text-slate-950">
              {selectedSummary?.propertyAddress || "Request detail"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Review the submitted client intake details. Conversion into an operational order is not wired in this slice.
            </p>
          </div>

          {loadingDetail ? (
            <div className="p-4 text-sm text-slate-500">Loading request detail...</div>
          ) : detail ? (
            <div className="grid gap-6 p-4">
              <section className="grid gap-4 md:grid-cols-3" aria-label="Request summary">
                <DetailItem label="Status" value={statusLabel(detail.status)} />
                <DetailItem label="Submitted" value={formatDate(detail.submittedAt)} />
                <DetailItem label="Requested Due" value={formatDate(detail.requestedDueDate)} />
              </section>

              <section className="grid gap-4 md:grid-cols-2" aria-label="Property request">
                <DetailItem label="Client" value={detail.clientName} />
                <DetailItem label="Property Address" value={detail.propertyAddress} />
                <DetailItem label="Property Type" value={detail.propertyType} />
                <DetailItem label="Report Type" value={detail.reportType} />
                <DetailItem label="Loan Purpose" value={detail.loanPurpose} />
                <DetailItem label="Borrower / Property Contact" value={detail.borrowerContactName} />
              </section>

              <section className="grid gap-4 md:grid-cols-2" aria-label="Client contact">
                <DetailItem label="Requested By" value={detail.requestedByName || detail.requestedByEmail} />
                <DetailItem label="Client Contact" value={detail.clientContactName} />
                <DetailItem label="Contact Phone" value={detail.clientContactPhone} />
                <DetailItem label="Contact Email" value={detail.clientContactEmail} />
              </section>

              <section className="grid gap-2" aria-label="Request notes">
                <h3 className="text-sm font-semibold text-slate-950">Notes</h3>
                <p className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm leading-6 text-slate-700">
                  {detail.notes || "No notes provided."}
                </p>
              </section>

              <section className="grid gap-3" aria-label="Review actions">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatus("under_review")}
                    disabled={actionState.loading || ["accepted", "declined", "cancelled"].includes(detail.status)}
                    className="rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionState.loading ? "Updating..." : "Mark reviewing"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatus("declined")}
                    disabled={actionState.loading || ["accepted", "declined", "cancelled"].includes(detail.status)}
                    className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reject request
                  </button>
                </div>
                {actionState.error ? (
                  <p className="text-sm text-rose-700" role="alert">
                    {actionState.error}
                  </p>
                ) : null}
              </section>
            </div>
          ) : (
            <div className="p-4 text-sm text-slate-500">Select a request to review.</div>
          )}
        </div>
      </section>
    </div>
  );
}
