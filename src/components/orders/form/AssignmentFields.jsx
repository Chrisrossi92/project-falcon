import React, { useEffect, useRef, useState } from "react";
import supabase from "@/lib/supabaseClient";

function Label({ children }) { return <label className="block text-xs font-medium text-gray-600 mb-1">{children}</label>; }
function MoneyInput(props){ return <input type="number" step="0.01" min="0" {...props} className={"w-full border rounded px-2 py-1 text-sm "+(props.className||"")} />; }
function PercentInput(props){ return <input type="number" step="0.01" min="0" max="100" {...props} className={"w-full border rounded px-2 py-1 text-sm "+(props.className||"")} />; }
const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

export default function AssignmentFields({ value, onChange, isEdit }) {
  const [appraisers, setAppraisers] = useState([]);
  const lastCalcRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("users").select("id,full_name,role,status").order("full_name");
      setAppraisers((data || []).filter((u) => String(u.role || "").toLowerCase()==="appraiser" && String(u.status||"active")==="active"));
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
            {["NEW","In progress","Complete","On hold","Canceled"].map((s) => (
              <option key={s} value={s.toUpperCase?.() || s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="col-span-3 md:col-span-2">
          <Label>Appraiser</Label>
          <select
            value={value.appraiser_id || ""}
            onChange={(e) => onChange({ appraiser_id: e.target.value || null })}
            className="w-full border rounded px-2 py-1 text-sm"
          >
            <option value="">Select appraiser…</option>
            {appraisers.map((u) => (<option key={u.id} value={u.id}>{u.full_name}</option>))}
          </select>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <Label>Split %</Label>
          <PercentInput value={value.split_pct || ""} onChange={(e)=>onChange({ split_pct: e.target.value })}/>
        </div>
        <div>
          <Label>Base Fee</Label>
          <MoneyInput value={value.base_fee || ""} onChange={(e)=>onChange({ base_fee: e.target.value })}/>
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






