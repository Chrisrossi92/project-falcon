import React, { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabaseClient";

function Label({ children }) { return <label className="block text-xs font-medium text-gray-600 mb-1">{children}</label>; }
function TextInput(props){ return <input {...props} className={"w-full border rounded px-2 py-1 text-sm "+(props.className||"")} />; }

export default function ClientFields({ value, onChange }) {
  const [clients,setClients] = useState([]); const [amcs,setAmcs]=useState([]);

  useEffect(() => {
    (async () => {
      const [{ data: cl }, { data: amcRows }] = await Promise.all([
        supabase.from("clients").select("id,name,category,amc_id,is_merged").neq("is_merged", true).order("name"),
        supabase.from("clients").select("id,name").eq("category", "amc").order("name"),
      ]);
      setClients(cl ?? []); setAmcs(amcRows ?? []);
    })();
  }, []);

  const filteredClients = useMemo(() => {
    const nonAmc = (clients || []).filter((c) => String(c.category || "").toLowerCase() !== "amc");
    const amcIdNum = value.managing_amc_id ? Number(value.managing_amc_id) : null;
    if (!amcIdNum) return nonAmc;
    return nonAmc.filter((c) => Number(c.amc_id) === amcIdNum);
  }, [clients, value.managing_amc_id]);

  return (
    <div className="rounded-md bg-white/60 p-3 border">
      <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Client</div>

      <Label>AMC (if applicable)</Label>
      <select
        value={value.managing_amc_id ?? ""}
        onChange={(e) => onChange({ managing_amc_id: e.target.value || null, client_id: null })}
        className="w-full border rounded px-2 py-1 text-sm"
      >
        <option value="">- None / Direct -</option>
        {amcs.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
      </select>

      <div className="mt-3">
        <Label>Client</Label>
        <select
          value={value.client_id ?? ""}
          onChange={(e) => onChange({ client_id: e.target.value || null, manual_client_name: "" })}
          className="w-full border rounded px-2 py-1 text-sm"
        >
          <option value="">{value.managing_amc_id ? "Select client tied to this AMC..." : "Select client..."}</option>
          {filteredClients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
      </div>

      <div className="mt-2 text-[11px] text-gray-500">Or enter a manual client:</div>
      <TextInput
        placeholder="Manual client name"
        value={value.manual_client_name || ""}
        onChange={(e) => onChange({ manual_client_name: e.target.value })}
        disabled={!!value.client_id}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <div>
          <Label>Property Entry Contact</Label>
          <TextInput
            placeholder="Contact name"
            value={value.entry_contact_name || ""}
            onChange={(e) => onChange({ entry_contact_name: e.target.value })}
          />
        </div>
        <div>
          <Label>Contact Phone</Label>
          <TextInput
            placeholder="(555) 123-4567"
            value={value.entry_contact_phone || ""}
            onChange={(e) => onChange({ entry_contact_phone: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
