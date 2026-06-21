import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  createVendorWorkspaceAssignmentDocumentDownloadUrl,
  createVendorWorkspaceReportUploadUrl,
  fetchVendorWorkspaceAssignedOrderDetail,
  registerVendorWorkspaceReportDocument,
  resubmitVendorWorkspaceReport,
  startVendorWorkspaceAssignedOrder,
  submitVendorWorkspaceReport,
} from "@/features/vendorWorkspace/api.js";
import { OPERATIONS_MODES } from "@/lib/operations/operationsMode";
import { getWorkspacePageChrome } from "@/lib/workspace/workspaceIdentity";

const statusClasses = Object.freeze({
  accepted_not_started: "border-amber-200 bg-amber-50 text-amber-700",
  in_progress: "border-sky-200 bg-sky-50 text-sky-700",
  inspection_scheduled: "border-indigo-200 bg-indigo-50 text-indigo-700",
  report_submitted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  awaiting_review: "border-slate-200 bg-slate-50 text-slate-600",
  revision_requested: "border-rose-200 bg-rose-50 text-rose-700",
  resubmitted_awaiting_review: "border-violet-200 bg-violet-50 text-violet-700",
  completed_closed: "border-slate-200 bg-slate-100 text-slate-700",
});

const statusLabels = Object.freeze({
  accepted_not_started: "Accepted",
  in_progress: "In Progress",
  inspection_scheduled: "In Progress",
  report_submitted: "Submitted / Awaiting Review",
  awaiting_review: "Submitted / Awaiting Review",
  revision_requested: "Revision Requested",
  resubmitted_awaiting_review: "Resubmitted / Awaiting Review",
  completed_closed: "Completed",
});

function displayStatusLabel(item = {}) {
  const safeItem = item || {};
  const status = safeItem.assignment_status || "accepted_not_started";
  if (
    status === "report_submitted" &&
    (safeItem.report_submission?.resubmitted_at || safeItem.submission_payload?.resubmission)
  ) {
    return statusLabels.resubmitted_awaiting_review;
  }
  return statusLabels[status] || safeItem.status_label || "Assigned";
}

function noActionMessage(status) {
  if (status === "report_submitted" || status === "awaiting_review" || status === "resubmitted_awaiting_review") {
    return "No vendor action is available while the AMC coordinator reviews the submitted report.";
  }
  if (status === "completed_closed") {
    return "This assignment is complete. No further vendor action is available.";
  }
  return "No vendor action is currently available for this assignment state.";
}

function formatDate(value) {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not specified";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatFileSize(value) {
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) return "Size pending";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getMarket(order = {}) {
  return [order.city, order.state, order.postal_code].filter(Boolean).join(", ");
}

function LoadingState() {
  return (
    <section aria-label="Loading assigned order detail" className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-3 w-40 rounded bg-slate-200" />
        <div className="mt-4 h-7 w-72 rounded bg-slate-200" />
        <div className="mt-4 h-3 w-full max-w-2xl rounded bg-slate-100" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.75fr]">
        <div className="h-96 rounded-lg border border-slate-200 bg-white shadow-sm" />
        <div className="h-80 rounded-lg border border-slate-200 bg-white shadow-sm" />
      </div>
    </section>
  );
}

function UnavailableState({ onRetry }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-950">Assigned order detail unavailable</h1>
      <p className="mt-2 max-w-2xl">
        This assigned order is no longer available, or your company does not have access to it.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          to="/vendor-workspace/assigned-orders"
          className="rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
        >
          Back to Assigned Orders
        </Link>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        >
          Retry
        </button>
      </div>
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-950">{value || "Not specified"}</dd>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DocumentsList({ documents, assignmentWorkKey }) {
  const [busyDocumentKey, setBusyDocumentKey] = useState(null);
  const [documentErrors, setDocumentErrors] = useState({});

  if (!documents.length) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        No vendor-visible documents are available for this assigned order yet.
      </div>
    );
  }

  async function handleOpenDocument(document) {
    if (!document.document_key) return;

    setBusyDocumentKey(document.document_key);
    setDocumentErrors((current) => {
      const next = { ...current };
      delete next[document.document_key];
      return next;
    });

    try {
      const result = await createVendorWorkspaceAssignmentDocumentDownloadUrl(
        assignmentWorkKey,
        document.document_key,
      );
      window.open(result.signed_url, "_blank", "noopener,noreferrer");
    } catch {
      setDocumentErrors((current) => ({
        ...current,
        [document.document_key]: "This document cannot be opened right now. Please try again later.",
      }));
    } finally {
      setBusyDocumentKey(null);
    }
  }

  return (
    <div className="space-y-3">
      {documents.map((document, index) => (
        <article key={`${document.file_name || "document"}-${index}`} className="rounded-md border border-slate-200 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-950">
                {document.title || document.file_name || "Document"}
              </div>
              {!document.document_key ? (
                <p className="mt-1 text-xs text-slate-500">This document cannot be opened right now.</p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={!document.document_key || busyDocumentKey === document.document_key}
              onClick={() => handleOpenDocument(document)}
              className="rounded-md border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
            >
              {busyDocumentKey === document.document_key ? "Opening..." : "Open"}
            </button>
          </div>
          <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
            <DetailRow label="Category" value={document.category} />
            <DetailRow label="Type" value={document.mime_type} />
            <DetailRow label="Size" value={formatFileSize(document.file_size)} />
            <DetailRow label="Added" value={formatDate(document.created_at)} />
          </dl>
          {documentErrors[document.document_key] ? (
            <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
              {documentErrors[document.document_key]}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function isReportSubmissionDocument(document) {
  return document?.category === "final_report" || /submitted report|report/i.test(document?.title || "");
}

function Timeline({ item }) {
  const entries = [
    ["Accepted", item.accepted_at || item.timeline?.accepted_at],
    ["Started", item.started_at || item.timeline?.started_at],
    ["Submitted", item.submitted_at || item.timeline?.submitted_at],
    ["Completed", item.completed_at || item.timeline?.completed_at],
  ];

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {entries.map(([label, value]) => (
        <DetailRow key={label} label={label} value={formatDate(value)} />
      ))}
    </dl>
  );
}

const startErrorMessages = Object.freeze({
  assigned_order_unavailable: "This assigned order is no longer available.",
  assignment_start_invalid: "This assignment cannot be started from its current status.",
});

const submitErrorMessages = Object.freeze({
  assigned_order_unavailable: "This assigned order is no longer available.",
  report_submission_invalid: "This assignment cannot be submitted from its current status.",
  report_resubmission_invalid: "This revision cannot be resubmitted from its current status.",
});

const uploadErrorMessages = Object.freeze({
  assigned_order_unavailable: "This assigned order is no longer available.",
  report_upload_invalid: "This report file cannot be uploaded.",
  invalid_upload_request: "The report upload could not be prepared.",
  upload_not_authorized: "You cannot upload reports for this assignment.",
  signed_upload_failed: "The report upload could not be prepared.",
});

function reportUploadErrorMessage(error, fallback) {
  const fieldErrors = error?.field_errors || error?.details?.field_errors || {};
  return (
    fieldErrors.file_name ||
    fieldErrors.mime_type ||
    fieldErrors.file_size ||
    fieldErrors.document_role ||
    fieldErrors.action ||
    error?.message ||
    uploadErrorMessages[error?.code] ||
    fallback
  );
}

function AssignmentActions({ status, assignmentWorkKey, onStarted, onSubmitted, onUnavailable }) {
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isUploadingReport, setIsUploadingReport] = useState(false);
  const [actionError, setActionError] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [selectedReportFile, setSelectedReportFile] = useState(null);
  const [uploadedReportDocuments, setUploadedReportDocuments] = useState([]);

  if (status === "accepted_not_started") {
    async function handleStartWork() {
      if (isStarting) return;

      setIsStarting(true);
      setActionError("");

      try {
        const result = await startVendorWorkspaceAssignedOrder(assignmentWorkKey);

        if (result.ok) {
          onStarted?.(result.message || "Work started.");
          return;
        }

        if (result.error === "assigned_order_unavailable") {
          onUnavailable?.();
          return;
        }

        setActionError(
          result.field_errors?.action ||
          startErrorMessages[result.error] ||
          "Work could not be started. Try again or contact the AMC coordinator.",
        );
      } catch {
        setActionError("Work could not be started. Try again or contact the AMC coordinator.");
      } finally {
        setIsStarting(false);
      }
    }

    return (
      <div className="space-y-3">
        {actionError ? (
          <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            {actionError}
          </div>
        ) : null}
        <button
          type="button"
          disabled={isStarting}
          onClick={handleStartWork}
          className="w-full rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
        >
          {isStarting ? "Starting..." : "Start Work"}
        </button>
      </div>
    );
  }

  if (status === "in_progress" || status === "inspection_scheduled" || status === "revision_requested") {
    const isRevisionFlow = status === "revision_requested";
    const noteLabel = isRevisionFlow ? "Revision Response Note" : "Delivery Note";
    const fileLabel = isRevisionFlow ? "Revised Report PDF" : "Report PDF";
    const uploadButtonLabel = isRevisionFlow ? "Upload Revision File" : "Upload Report File";
    const submitButtonLabel = isRevisionFlow ? "Resubmit Report" : "Submit Report";
    const uploadingLabel = isRevisionFlow ? "Uploading revision..." : "Uploading...";
    const submittingLabel = isRevisionFlow ? "Resubmitting..." : "Submitting...";
    const emptyUploadText = isRevisionFlow
      ? "Upload at least one revised PDF report file before resubmitting this assignment for review."
      : "Upload at least one PDF report file before submitting this assignment for review.";
    const submitReportDisabled =
      isSubmittingReport || isUploadingReport || Boolean(selectedReportFile && !uploadedReportDocuments.length);

    console.log("[VendorWorkspaceReportUpload] submit button state", {
      assignment_work_key_present: Boolean(assignmentWorkKey),
      status,
      selected_file_name: selectedReportFile?.name || null,
      uploaded_report_document_count: uploadedReportDocuments.length,
      uploaded_report_document_keys: uploadedReportDocuments.map((document) => document.document_key || null),
      is_uploading: isUploadingReport,
      is_submitting: isSubmittingReport,
      submit_disabled: submitReportDisabled,
    });

    async function handleUploadReport() {
      if (isUploadingReport) return;

      if (!selectedReportFile) {
        setActionError(isRevisionFlow ? "Choose a revised report PDF before uploading." : "Choose a report PDF before uploading.");
        return;
      }

      setIsUploadingReport(true);
      setActionError("");

      try {
        const prepared = await createVendorWorkspaceReportUploadUrl(assignmentWorkKey, {
          file_name: selectedReportFile.name,
          mime_type: selectedReportFile.type || "application/pdf",
          file_size: selectedReportFile.size,
          document_role: "submitted_report",
        });

        const uploadResponse = await fetch(prepared.upload.signed_url, {
          method: "PUT",
          headers: {
            "content-type": selectedReportFile.type || "application/pdf",
            "x-upsert": "false",
          },
          body: selectedReportFile,
        });

        if (!uploadResponse.ok) {
          throw new Error("upload_failed");
        }

        const registered = await registerVendorWorkspaceReportDocument(assignmentWorkKey, {
          document_key: prepared.document.document_key,
          file_name: selectedReportFile.name,
          mime_type: selectedReportFile.type || "application/pdf",
          file_size: selectedReportFile.size,
          document_role: "submitted_report",
        });

        const registeredDocumentKey =
          registered.document?.document_key ||
          registered.document?.documentKey ||
          prepared.document?.document_key ||
          prepared.document?.documentKey ||
          null;

        if (registered.ok && registeredDocumentKey) {
          const uploadedDocument = {
            ...prepared.document,
            ...registered.document,
            document_key: registeredDocumentKey,
            document_role: registered.document?.document_role || prepared.document?.document_role || "submitted_report",
            category: registered.document?.category || prepared.document?.category || "final_report",
            title: registered.document?.title || prepared.document?.title || "Submitted Report",
            file_name: registered.document?.file_name || prepared.document?.file_name || selectedReportFile.name,
            mime_type: registered.document?.mime_type || prepared.document?.mime_type || selectedReportFile.type || "application/pdf",
            file_size: registered.document?.file_size ?? prepared.document?.file_size ?? selectedReportFile.size,
          };

          setUploadedReportDocuments((current) => {
            const withoutDuplicate = current.filter((document) => document.document_key !== registeredDocumentKey);
            const nextDocuments = [...withoutDuplicate, uploadedDocument];
            console.log("[VendorWorkspaceReportUpload] merged document", {
              assignment_work_key_present: Boolean(assignmentWorkKey),
              document_key: registeredDocumentKey,
              file_name: uploadedDocument.file_name || null,
              previous_count: current.length,
              next_count: nextDocuments.length,
            });
            console.log("[VendorWorkspaceReportUpload] uploadedReportDocuments length after merge", {
              length: nextDocuments.length,
              document_keys: nextDocuments.map((document) => document.document_key || null),
            });
            return nextDocuments;
          });
          setSelectedReportFile(null);
          return;
        }

        if (registered.error === "assigned_order_unavailable") {
          onUnavailable?.();
          return;
        }

        console.warn("[VendorWorkspaceReportUpload] registration rejected", {
          ok: registered.ok,
          error: registered.error || null,
          field_errors: registered.field_errors || null,
          has_registered_document_key: Boolean(registered.document?.document_key || registered.document?.documentKey),
          has_prepared_document_key: Boolean(prepared.document?.document_key || prepared.document?.documentKey),
        });

        setActionError(
          registered.field_errors?.document_key ||
          registered.field_errors?.file_size ||
          registered.field_errors?.mime_type ||
          registered.field_errors?.action ||
          uploadErrorMessages[registered.error] ||
          "Report file could not be registered. Try again or contact the AMC coordinator.",
        );
      } catch (error) {
        console.warn("[VendorWorkspaceReportUpload] upload failed", {
          code: error?.code || null,
          message: error?.message || null,
          details: error?.details || null,
          field_errors: error?.field_errors || null,
        });
        setActionError(
          reportUploadErrorMessage(
            error,
            "Report file could not be uploaded. Please try again or contact the AMC coordinator.",
          ),
        );
      } finally {
        setIsUploadingReport(false);
      }
    }

    async function handleSubmitReport() {
      if (isSubmittingReport) return;

      setActionError("");

      if (!uploadedReportDocuments.length) {
        setActionError(
          isRevisionFlow
            ? "Upload at least one revised report PDF before resubmitting."
            : "Upload at least one report PDF before submitting.",
        );
        return;
      }

      setIsSubmittingReport(true);

      try {
        const documentKeys = uploadedReportDocuments.map((document) => document.document_key);
        const result = isRevisionFlow
          ? await resubmitVendorWorkspaceReport(assignmentWorkKey, {
              comments: deliveryNote,
              document_keys: documentKeys,
            })
          : await submitVendorWorkspaceReport(assignmentWorkKey, {
              comments: deliveryNote,
              document_keys: documentKeys,
            });

        if (result.ok) {
          setDeliveryNote("");
          setSelectedReportFile(null);
          setUploadedReportDocuments([]);
          onSubmitted?.(result.message || (isRevisionFlow ? "Report resubmitted." : "Report submitted."));
          return;
        }

        if (result.error === "assigned_order_unavailable") {
          onUnavailable?.();
          return;
        }

        setActionError(
          result.field_errors?.action ||
          result.field_errors?.payload ||
          result.field_errors?.document_keys ||
          submitErrorMessages[result.error] ||
          (isRevisionFlow
            ? "Report could not be resubmitted. Please try again or contact the AMC coordinator."
            : "Report could not be submitted. Please try again or contact the AMC coordinator."),
        );
      } catch {
        setActionError(
          isRevisionFlow
            ? "Report could not be resubmitted. Please try again or contact the AMC coordinator."
            : "Report could not be submitted. Please try again or contact the AMC coordinator.",
        );
      } finally {
        setIsSubmittingReport(false);
      }
    }

    return (
      <div className="space-y-3">
        {actionError ? (
          <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            {actionError}
          </div>
        ) : null}
        <label className="grid gap-1 text-xs font-semibold text-slate-700">
          {noteLabel}
          <textarea
            value={deliveryNote}
            onChange={(event) => setDeliveryNote(event.target.value)}
            rows={4}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
            placeholder={isRevisionFlow ? "Optional response for the AMC coordinator." : "Optional note for the AMC coordinator."}
          />
        </label>
        <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <label className="grid gap-1 text-xs font-semibold text-slate-700">
            {fileLabel}
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={isUploadingReport || isSubmittingReport}
              onChange={(event) => {
                setActionError("");
                setSelectedReportFile(event.target.files?.[0] || null);
              }}
              className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </label>
          {selectedReportFile ? (
            <div className="rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-600">
              Selected: <span className="font-semibold text-slate-800">{selectedReportFile.name}</span>{" "}
              ({formatFileSize(selectedReportFile.size)})
            </div>
          ) : null}
          <button
            type="button"
            disabled={!selectedReportFile || isUploadingReport || isSubmittingReport}
            onClick={handleUploadReport}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          >
            {isUploadingReport ? uploadingLabel : uploadButtonLabel}
          </button>
          {uploadedReportDocuments.length ? (
            <div className="space-y-2">
              {uploadedReportDocuments.map((document) => (
                <div
                  key={document.document_key}
                  className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900"
                >
                  <div className="font-semibold">{document.file_name || document.title || "Uploaded report"}</div>
                  <div>{formatFileSize(document.file_size)} uploaded and ready to submit</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs leading-5 text-slate-600">
              {emptyUploadText}
            </p>
          )}
        </div>
        <div data-testid="report-upload-debug" className="text-[10px] text-slate-500">
          uploadedReportDocuments.length={uploadedReportDocuments.length}; selectedReportFile={selectedReportFile?.name || "none"};
          submitDisabled={String(submitReportDisabled)}
        </div>
        <button
          type="button"
          disabled={submitReportDisabled}
          onClick={handleSubmitReport}
          className="w-full rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
        >
          {isSubmittingReport ? submittingLabel : submitButtonLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
      {noActionMessage(status)}
    </div>
  );
}

function ReportSubmission({ item }) {
  const submission = item.report_submission || {};

  if (submission.submitted_at) {
    const isResubmitted = Boolean(submission.resubmitted_at);
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <div className="font-semibold">
          {isResubmitted ? "Resubmitted / Awaiting Review" : "Submitted / Awaiting Review"}
        </div>
        <dl className="mt-3 grid gap-3">
          <DetailRow label="Submitted" value={formatDate(submission.submitted_at)} />
          {isResubmitted ? (
            <DetailRow label="Resubmitted" value={formatDate(submission.resubmitted_at)} />
          ) : null}
          {submission.document_count ? (
            <DetailRow label="Report Files" value={`${submission.document_count} submitted`} />
          ) : null}
        </dl>
        {submission.note ? (
          <div className="mt-3 rounded-md border border-emerald-200 bg-white/70 p-3">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Note</div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{submission.note}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      Upload a report from Status / Next Action when this assignment is in progress.
    </div>
  );
}

export default function VendorAssignedOrderDetailPage() {
  const pageChrome = getWorkspacePageChrome(OPERATIONS_MODES.AMC_OPERATIONS, "vendorAssignedOrderDetail");
  const { assignmentWorkKey } = useParams();
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      setIsLoading(true);
      setError(null);

      try {
        const nextDetail = await fetchVendorWorkspaceAssignedOrderDetail(assignmentWorkKey);
        if (isMounted) setDetail(nextDetail);
      } catch (nextError) {
        if (isMounted) setError(nextError);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDetail();

    return () => {
      isMounted = false;
    };
  }, [assignmentWorkKey, reloadKey]);

  const item = detail?.ok ? detail.item : null;
  const order = item?.order || {};
  const owner = item?.owner || {};
  const status = item?.assignment_status || "accepted_not_started";
  const statusClass = statusClasses[status] || statusClasses.accepted_not_started;
  const statusLabel = displayStatusLabel(item);
  const documents = useMemo(() => {
    if (!Array.isArray(item?.documents)) return [];
    if (item?.report_submission?.submitted_at) return item.documents;
    return item.documents.filter((document) => !isReportSubmissionDocument(document));
  }, [item?.documents, item?.report_submission?.submitted_at]);
  const market = getMarket(order);

  if (isLoading) return <LoadingState />;
  if (error || !item) return <UnavailableState onRetry={() => setReloadKey((key) => key + 1)} />;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {pageChrome.eyebrow || "Assigned Order Detail"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              {order.property_address || "Property details pending"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {pageChrome.title || "Assigned Order Detail"} · {market || order.county || "Market pending"}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              {pageChrome.description || "Vendor assignment detail scoped to AMC coordinator review."}
            </p>
          </div>
          <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.75fr]">
        <main className="space-y-5">
          <Section title="Property">
            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="Order" value={order.order_number || "Order pending"} />
              <DetailRow label="Owner Company" value={owner.company_name || "AMC coordinator"} />
              <DetailRow label="Report Type" value={order.report_type || "Report type pending"} />
              <DetailRow label="Property Type" value={order.property_type || "Property type pending"} />
              <DetailRow label="County" value={order.county} />
              <DetailRow label="Market" value={market} />
            </dl>
          </Section>

          <Section title="Assignment Timeline">
            <Timeline item={item} />
          </Section>

          <Section title="Scope & Instructions">
            <div className="space-y-3 text-sm leading-6 text-slate-700">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Scope Summary</div>
                <p className="mt-1 whitespace-pre-wrap">{item.summary?.scope || "No scope summary provided."}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Vendor Instructions</div>
                <p className="mt-1 whitespace-pre-wrap">{item.instructions || "No vendor instructions provided."}</p>
              </div>
              {item.revision ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-900">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">
                    Revision Requested
                  </div>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    <DetailRow label="Requested" value={formatDate(item.revision.requested_at)} />
                    <DetailRow label="Requested By" value={item.revision.requested_by_label || "AMC coordinator"} />
                    <DetailRow label="Revision Due" value={formatDate(item.revision.due_at)} />
                    <DetailRow
                      label="Prior Submission"
                      value={formatDate(item.revision.prior_submission?.submitted_at)}
                    />
                  </dl>
                  <div className="mt-3 rounded-md border border-rose-200 bg-white/70 p-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">
                      Instructions
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">
                      {item.revision.instructions || item.revision.summary || "Review the revision request details."}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </Section>

          <Section title="Documents">
            <DocumentsList documents={documents} assignmentWorkKey={assignmentWorkKey} />
          </Section>

          <Section title="Report Submission">
            <ReportSubmission item={item} />
          </Section>
        </main>

        <aside className="space-y-5">
          <Section title="Status / Next Action">
            <div className="space-y-4">
              <dl className="grid gap-3">
                <DetailRow label="Status" value={statusLabel} />
                <DetailRow label="Next Action" value={item.next_action_label || "Review assignment"} />
                <DetailRow label="Due" value={formatDate(item.due_at)} />
                <DetailRow label="Review Due" value={formatDate(item.review_due_at)} />
                <DetailRow label="Inspection / Appointment" value={item.inspection_status} />
                <DetailRow label="Report State" value={item.report_submitted ? statusLabel : "Not submitted"} />
              </dl>
              {item.needs_attention ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                  Needs attention
                </div>
              ) : null}
              {successMessage ? (
                <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                  {successMessage}
                </div>
              ) : null}
              <AssignmentActions
                status={status}
                assignmentWorkKey={assignmentWorkKey}
                onStarted={(message) => {
                  setSuccessMessage(message);
                  setReloadKey((key) => key + 1);
                }}
                onSubmitted={(message) => {
                  setSuccessMessage(message);
                  setReloadKey((key) => key + 1);
                }}
                onUnavailable={() => {
                  setDetail({ ok: false, item: null, error: "assigned_order_unavailable" });
                }}
              />
            </div>
          </Section>

          <Link
            to="/vendor-workspace/assigned-orders"
            className="block rounded-md border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 shadow-sm"
          >
            Back to Assigned Orders
          </Link>
        </aside>
      </div>
    </div>
  );
}
