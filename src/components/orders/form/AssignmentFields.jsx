import React, { useEffect, useRef, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { listAssignableUsers } from "@/lib/services/usersService";

function Label({ children }) { return <label className="block text-xs font-medium text-gray-600 mb-1">{children}</label>; }
function MoneyInput(props){ return <input type="number" step="0.01" min="0" {...props} className={"w-full border rounded px-2 py-1 text-sm "+(props.className||"")} />; }
function PercentInput(props){ return <input type="number" step="0.01" min="0" max="100" {...props} className={"w-full border rounded px-2 py-1 text-sm "+(props.className||"")} />; }
const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

export default function AssignmentFields({ value, onChange, isEdit }) {
  const [appraisers, setAppraisers] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const lastCalcRef = useRef(null);

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
          listAssignableUsers({ roles: ["appraiser", "admin", "owner"] }),
          listAssignableUsers({ roles: ["reviewer", "admin", "owner"] }),
        ]);

        setAppraisers(
          (appraiserRows || [])
            .filter((u) => !!(u.full_name || u.display_name || u.name))
            .map((u) => ({
              id: u.id,
              name: u.display_name || u.full_name || u.name || u.email || u.id,
              default_split_pct: u.fee_split ?? u.split ?? null,
            }))
        );

        setReviewers(
          (reviewerRows || [])
            .filter((u) => !!(u.full_name || u.display_name || u.name))
            .map((u) => ({
              id: u.id,
              name: u.display_name || u.full_name || u.name || u.email || u.id,
              role: String(u.role || "").toLowerCase(),
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
  }, []);

  // default split when appraiser selected (only if empty)
  useEffect(() => {
    (async () => {
      if (!value.appraiser_id) return;
      if (value.split_pct !== null && value.split_pct !== "" && value.split_pct !== undefined) return;
      let pct = null;
      const { data: roles } = await supabase.from("user_roles")
        .select("split_pct,role").eq("user_id", value.appraiser_id).eq("role","appraiser").limit(1);
      if (roles?.length && roles[0]?.split_pct != null) pct = roles[0].split_pct;
      if (pct == null) {
        const { data: u } = await supabase.from("profiles").select("fee_split,split,split_pct").eq("id", value.appraiser_id).maybeSingle();
        if (u) pct = u.fee_split ?? u.split ?? u.split_pct ?? null;
      }
      if (pct != null) onChange({ split_pct: String(pct) });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.appraiser_id]);

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
      <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Meta & Assignment</div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3 md:col-span-1">
          <Label>Status</Label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={(value.status || "new").toLowerCase()}
            onChange={(e) => onChange({ status: e.target.value.toLowerCase() })}
          >
            {["new","in_progress","in_review","needs_revisions","completed"].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
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
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <Label>Split %</Label>
          <PercentInput value={value.split_pct || ""} onChange={(e)=>handleSplitChange(e.target.value)}/>
        </div>
        <div>
          <Label>Base Fee</Label>
          <MoneyInput value={value.base_fee || ""} onChange={(e)=>handleBaseFeeChange(e.target.value)}/>
        </div>
        <div>
          <Label>Appraiser Fee</Label>
          <MoneyInput value={value.appraiser_fee || ""} onChange={(e)=>onChange({ appraiser_fee: e.target.value })}/>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Order #</Label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={value.order_number || ""}
            onChange={(e)=>onChange({ order_number: e.target.value })}
          />
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
