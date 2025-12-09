import React, { useEffect, useRef, useState } from "react";
import supabase from "@/lib/supabaseClient";

function Label({ children }) { return <label className="block text-xs font-medium text-gray-600 mb-1">{children}</label>; }
function MoneyInput(props){ return <input type="number" step="0.01" min="0" {...props} className={"w-full border rounded px-2 py-1 text-sm "+(props.className||"")} />; }
function PercentInput(props){ return <input type="number" step="0.01" min="0" max="100" {...props} className={"w-full border rounded px-2 py-1 text-sm "+(props.className||"")} />; }
const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

export default function AssignmentFields({ value, onChange, isEdit }) {
  const [appraisers, setAppraisers] = useState([]);
  const [reviewers, setReviewers] = useState([]);
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
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, role, status, fee_split, split")
        .order("full_name");
      if (error) {
        console.error("Failed to load appraisers", error);
        setAppraisers([]);
        setReviewers([]);
        return;
      }
      const active = (data || []).filter((u) => String(u.status || "").toLowerCase() === "active");
      const appraiserList = active.filter((u) => String(u.role || "").toLowerCase() === "appraiser");
      const reviewersList = active.filter((u) => ["appraiser", "reviewer"].includes(String(u.role || "").toLowerCase()));

      setAppraisers(
        appraiserList.map((u) => ({
          id: u.id,
          name: u.full_name,
          default_split_pct: u.fee_split ?? u.split ?? null,
        }))
      );

      setReviewers(
        reviewersList
          .filter((u) => !!u.full_name)
          .map((u) => ({
            id: u.id,
            name: u.full_name,
            role: u.role,
          }))
      );

      if (!value.reviewer_id) {
        const pam = reviewersList.find((u) => String(u.role || "").toLowerCase() === "reviewer");
        const fallback = reviewersList[0];
        const target = pam || fallback;
        if (target) onChange({ reviewer_id: target.id });
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
        const { data: u } = await supabase.from("users").select("fee_split,split,split_pct").eq("id", value.appraiser_id).maybeSingle();
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
            value={value.status || "NEW"}
            onChange={(e) => onChange({ status: e.target.value })}
          >
            {["NEW","IN_PROGRESS","COMPLETE","ON_HOLD","CANCELED"].map((s) => (
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
          >
            <option value="">Select appraiser...</option>
            {appraisers.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
          </select>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div className="col-span-3 md:col-span-1">
          <Label>Reviewer</Label>
          <select
            value={value.reviewer_id || ""}
            onChange={(e) => onChange({ reviewer_id: e.target.value || null })}
            className="w-full border rounded px-2 py-1 text-sm"
          >
            <option value="">Select reviewer...</option>
            {reviewers.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
          </select>
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

      <div className="mt-3">
        <Label>Order #</Label>
        <input
          className="w-full border rounded px-2 py-1 text-sm"
          value={value.order_number || ""}
          onChange={(e)=>onChange({ order_number: e.target.value })}
        />
      </div>
    </div>
  );
}
