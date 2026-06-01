import { useEffect, useRef, useState } from "react";
import {
  listCompanyAssignableAppraisers,
  listCompanyAssignableReviewers,
} from "@/features/company-members/assignableUsersApi";
import {
  isOrderNumberAvailableV2,
  overrideOrderNumber,
} from "@/lib/services/ordersService";
import { operationalUserName } from "@/lib/utils/userDisplayName";

function Label({ children }) { return <label className="block text-xs font-medium text-gray-600 mb-1">{children}</label>; }
function MoneyInput(props){ return <input type="number" step="0.01" min="0" {...props} className={"w-full border rounded px-2 py-1 text-sm "+(props.className||"")} />; }
function PercentInput(props){ return <input type="number" step="0.01" min="0" max="100" {...props} className={"w-full border rounded px-2 py-1 text-sm "+(props.className||"")} />; }
function RecommendedCue({ show, children }) {
  if (!show) return null;
  return (
    <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">
      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

function getOverrideErrorMessage(error) {
  const message = String(error?.message || "").toLowerCase();
  if (/not authorized|permission|membership|required|42501/.test(message) || error?.code === "42501") {
    return "You do not have permission to change this order number.";
  }
  if (/blank|required|invalid/.test(message)) {
    return "Enter a valid order number.";
  }
  if (/unavailable|conflict|duplicate|already|unique|reserved/.test(message)) {
    return "That order number is not available for this company.";
  }
  return "Falcon could not change this order number. Refresh and try again.";
}

function OrderNumberOverrideShell({ orderId, orderNumber, onChanged }) {
  const [open, setOpen] = useState(false);
  const [candidate, setCandidate] = useState(orderNumber || "");
  const [reason, setReason] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const availabilityTimerRef = useRef(null);

  const normalizedCurrent = String(orderNumber || "").trim();
  const normalizedCandidate = String(candidate || "").trim();
  const candidateInputId = `order-number-override-candidate-${orderId || "draft"}`;
  const reasonInputId = `order-number-override-reason-${orderId || "draft"}`;
  const canSubmit = Boolean(orderId) &&
    Boolean(normalizedCandidate) &&
    normalizedCandidate !== normalizedCurrent &&
    available !== false &&
    !checking &&
    !submitting;

  useEffect(() => {
    if (!open) return;
    setCandidate(orderNumber || "");
    setReason("");
    setAvailable(null);
    setChecking(false);
    setSubmitting(false);
    setError("");
  }, [open, orderNumber]);

  useEffect(() => {
    if (!open) return undefined;
    setAvailable(null);
    setError("");
    clearTimeout(availabilityTimerRef.current);

    if (!orderId || !normalizedCandidate || normalizedCandidate === normalizedCurrent) {
      setChecking(false);
      return undefined;
    }

    let cancelled = false;
    availabilityTimerRef.current = setTimeout(async () => {
      setChecking(true);
      try {
        const nextAvailable = await isOrderNumberAvailableV2(normalizedCandidate, { orderId });
        if (!cancelled) setAvailable(nextAvailable);
      } catch (availabilityError) {
        console.error("Failed to check order number availability", availabilityError);
        if (!cancelled) setAvailable(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(availabilityTimerRef.current);
    };
  }, [normalizedCandidate, normalizedCurrent, open, orderId]);

  async function handleSave() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const result = await overrideOrderNumber(
        orderId,
        normalizedCandidate,
        String(reason || "").trim() || null
      );
      const nextOrderNumber = result?.new_order_number || normalizedCandidate;
      onChanged?.(nextOrderNumber, result);
      setSuccess("Order number updated.");
      setOpen(false);
    } catch (overrideError) {
      console.error("Failed to override order number", overrideError);
      setError(getOverrideErrorMessage(overrideError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Label>Order #</Label>
      <div className="rounded border bg-slate-50 px-2 py-2">
        <div className="text-sm font-medium text-slate-800">
          {orderNumber || "Order number unavailable"}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Order-number changes require a separate override action.
        </div>
      </div>
      {success && <div className="mt-1 text-xs text-green-600">{success}</div>}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        Change order number
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-number-override-title"
            className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl"
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Order Number Override
              </div>
              <h2 id="order-number-override-title" className="mt-1 text-xl font-semibold text-slate-950">
                Change order number
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                This action is separate from normal order edits and writes an order activity event when changed.
              </p>
            </div>

            <div className="grid gap-4 px-5 py-5">
              {error && (
                <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
                </div>
              )}
              <div className="grid gap-1 text-sm">
                <label
                  htmlFor={candidateInputId}
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"
                >
                  New order number
                </label>
                <input
                  id={candidateInputId}
                  value={candidate}
                  onChange={(event) => setCandidate(event.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  placeholder="Enter replacement order number"
                />
                <span className="text-xs text-slate-500">
                  {checking && "Checking availability..."}
                  {!checking && available === true && "Available for this company."}
                  {!checking && available === false && "Already used in this company."}
                  {!checking && normalizedCandidate === normalizedCurrent && "Enter a different number to enable save."}
                </span>
              </div>

              <div className="grid gap-1 text-sm">
                <label
                  htmlFor={reasonInputId}
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"
                >
                  Reason
                </label>
                <textarea
                  id={reasonInputId}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={4}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  placeholder="Optional context for the order activity log"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSubmit}
                className="inline-flex h-9 items-center justify-center rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {submitting ? "Saving..." : "Save order number"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssignmentFields({ value, onChange, isEdit, orderId = null }) {
  const [appraisers, setAppraisers] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const lastCalcRef = useRef(null);
  const needsAppraiser = !value.appraiser_id;

  const handleAppraiserChange = (appraiserId) => {
    onChange({ appraiser_id: appraiserId || null });
    const selected = appraisers.find((a) => a.id === appraiserId);
    if (selected && selected.default_split_pct != null) {
      onChange({ split_pct: String(selected.default_split_pct) });
    }
  };

  const computeAppraiserFee = (baseFee, splitPct) => {
    const fee = parseFloat(baseFee);
    const split = parseFloat(splitPct);
    if (Number.isNaN(fee) || Number.isNaN(split)) return "";
    return (fee * (split / 100)).toFixed(2);
  };

  const handleBaseFeeChange = (val) => {
    onChange({ base_fee: val });
    const next = computeAppraiserFee(val, value.split_pct);
    if (next !== "") onChange({ appraiser_fee: next });
  };

  const handleSplitChange = (val) => {
    onChange({ split_pct: val });
    const next = computeAppraiserFee(value.base_fee, val);
    if (next !== "") onChange({ appraiser_fee: next });
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const [appraiserRows, reviewerRows] = await Promise.all([
          listCompanyAssignableAppraisers(),
          listCompanyAssignableReviewers(),
        ]);

        setAppraisers(
          (appraiserRows || [])
            .filter((u) => !!operationalUserName(u))
            .map((u) => ({
              id: u.id,
              name: operationalUserName(u, u.id),
              default_split_pct: u.default_split_pct ?? u.fee_split ?? u.split ?? null,
            }))
        );

        setReviewers(
          (reviewerRows || [])
            .filter((u) => !!operationalUserName(u))
            .map((u) => ({
              id: u.id,
              name: operationalUserName(u, u.id),
              email: u.email,
              is_active: u.is_active,
              status: u.status,
            }))
        );

        if (!value.reviewer_id) {
          const pam = (reviewerRows || []).find(
            (u) => String(u.email || "").toLowerCase() === "pcasper@continentalres.net" && (u.is_active !== false) && String(u.status || "").toLowerCase() !== "inactive"
          );
          const fallback = (reviewerRows || [])[0];
          const target = pam || fallback;
          if (target) onChange({ reviewer_id: target.id });
        }
      } catch (error) {
        console.error("Failed to load assignable users", error);
        setAppraisers([]);
        setReviewers([]);
        setLoadError(error?.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // default split when appraiser is already selected and split is empty
  useEffect(() => {
    if (!value.appraiser_id) return;
    if (value.split_pct !== null && value.split_pct !== "" && value.split_pct !== undefined) return;
    const selected = appraisers.find((a) => a.id === value.appraiser_id);
    if (selected?.default_split_pct != null) {
      onChange({ split_pct: String(selected.default_split_pct) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appraisers, value.appraiser_id, value.split_pct]);

  // auto-calc appraiser_fee
  useEffect(() => {
    const base = Number(value.base_fee || 0);
    const pct  = Number(value.split_pct || 0);
    const calc = round2(base * (pct/100));
    if (value.appraiser_fee === "" || value.appraiser_fee === String(lastCalcRef.current)) {
      onChange({ appraiser_fee: String(calc) });
      lastCalcRef.current = calc;
    }
  }, [value.base_fee, value.split_pct]); // eslint-disable-line

  return (
    <div className="rounded-md bg-white/60 p-3 border">
      <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Assignment & Fee</div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3 md:col-span-1">
          <Label>Status</Label>
          <div className="w-full rounded border bg-slate-50 px-2 py-1 text-sm text-slate-600">
            {(isEdit ? value.status || "new" : "new")
              .replace(/_/g, " ")
              .toLowerCase()
              .replace(/\b\w/g, (c) => c.toUpperCase())}
          </div>
        </div>

        <div className="col-span-3 md:col-span-2">
          <Label>Appraiser</Label>
          <select
            value={value.appraiser_id || ""}
            onChange={(e) => handleAppraiserChange(e.target.value || null)}
            className="w-full border rounded px-2 py-1 text-sm"
            disabled={loading}
          >
            <option value="">Select appraiser...</option>
            {appraisers.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
          </select>
          {!loading && appraisers.length === 0 && <div className="text-xs text-red-600 mt-1">No active appraisers found.</div>}
          <RecommendedCue show={needsAppraiser && !loading && appraisers.length > 0}>
            Recommended: assign an appraiser before creating the order.
          </RecommendedCue>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <Label>Split %</Label>
          <PercentInput
            aria-label="Split %"
            value={value.split_pct || ""}
            onChange={(e)=>handleSplitChange(e.target.value)}
          />
        </div>
        <div>
          <Label>Base Fee</Label>
          <MoneyInput
            aria-label="Base Fee"
            value={value.base_fee || ""}
            onChange={(e)=>handleBaseFeeChange(e.target.value)}
          />
        </div>
        <div>
          <Label>Appraiser Fee</Label>
          <MoneyInput
            aria-label="Appraiser Fee"
            value={value.appraiser_fee || ""}
            onChange={(e)=>onChange({ appraiser_fee: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          {isEdit ? (
            <OrderNumberOverrideShell
              orderId={orderId}
              orderNumber={value.order_number || ""}
              onChanged={(nextOrderNumber) => onChange({ order_number: nextOrderNumber })}
            />
          ) : (
            <>
              <Label>Order #</Label>
              <div
                aria-label="Order number generated on save"
                className="w-full rounded border border-dashed border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-600"
              >
                Generated on save
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Assigned automatically when saved.
              </div>
            </>
          )}
        </div>
        <div>
          <Label>Reviewer</Label>
          <select
            value={value.reviewer_id || ""}
            onChange={(e) => onChange({ reviewer_id: e.target.value || null })}
            className="w-full border rounded px-2 py-1 text-sm"
            disabled={loading}
          >
            <option value="">Select reviewer...</option>
            {reviewers.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
          </select>
          {!loading && reviewers.length === 0 && <div className="text-xs text-red-600 mt-1">No active reviewers found.</div>}
          {loadError && <div className="text-xs text-red-600 mt-1">{loadError}</div>}
        </div>
      </div>
    </div>
  );
}
