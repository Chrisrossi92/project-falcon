import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";

/**
 * Props:
 *  - amcId: bigint | string | null   (selected AMC id from form)
 *  - value: bigint | string | null   (current client_id)
 *  - onChange: (newId: number|null) => void
 *  - disabled?: boolean
 */
export default function AmcClientPicker({ amcId, value, onChange, disabled = false }) {
  const [opts, setOpts] = useState([]);
  const [loading, setLoading] = useState(false);

  // normalize to number (or null) for bigint comparisons
  const amcIdNum =
    amcId == null ? null :
    typeof amcId === "string" ? Number(amcId) :
    typeof amcId === "number" ? amcId : null;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        let q = supabase
          .from("clients")
          .select("id,name,category,status,amc_id,is_merged")
          .neq("is_merged", true)
          .in("category", ["client", "lender"])
          .order("name", { ascending: true });

        if (amcIdNum != null && Number.isFinite(amcIdNum)) {
          q = q.eq("amc_id", amcIdNum);
        }

        const { data, error } = await q;
        if (error) throw error;
        if (cancelled) return;

        setOpts(data || []);
      } catch (e) {
        console.error("Load clients for AMC failed:", e);
        setOpts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [amcIdNum]);

  const handleChange = (e) => {
    const raw = e.target.value;
    if (!raw) return onChange(null);
    const n = Number(raw);
    onChange(Number.isFinite(n) ? n : null);
  };

  return (
    <select
      className="w-full rounded border px-3 py-2 text-sm"
      value={value ?? ""}
      onChange={handleChange}
      disabled={disabled || loading}
    >
      <option value="">
        {amcIdNum != null ? "Select client tied to this AMC…" : "Select client…"}
      </option>
      {opts.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name} {c.category ? `(${c.category})` : ""}
        </option>
      ))}
    </select>
  );
}
