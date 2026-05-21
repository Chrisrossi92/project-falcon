import React, { useEffect, useMemo, useState } from "react";
import {
  listOrderFormClientOptions,
  searchOrderFormClientsByName,
} from "@/features/orders/orderClientOptionsApi";

function Label({ children }) { return <label className="block text-xs font-medium text-gray-600 mb-1">{children}</label>; }
function TextInput(props){ return <input {...props} className={"w-full border rounded px-2 py-1 text-sm "+(props.className||"")} />; }
function RecommendedCue({ show, children }) {
  if (!show) return null;
  return (
    <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">
      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
function ClientNudge({ show, clientName }) {
  if (!show) return null;
  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
      A client named <span className="font-medium text-slate-800">{clientName}</span> already exists. Select the existing client instead of creating a duplicate.
    </div>
  );
}
function SelectedClientContactPreview({ client }) {
  if (!client) return null;

  const contactName = String(client.contact_name_1 || "").trim();
  const contactEmail = String(client.contact_email_1 || "").trim();
  const contactPhone = String(client.contact_phone_1 || "").trim();
  const hasContact = Boolean(contactName || contactEmail || contactPhone);

  if (!hasContact) {
    return (
      <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
        No primary contact saved for this client.
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Primary Client Contact
      </div>
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        {contactName && <span className="font-medium text-slate-800">{contactName}</span>}
        {contactEmail && <span>{contactEmail}</span>}
        {contactPhone && <span>{contactPhone}</span>}
      </div>
    </div>
  );
}

export default function ClientFields({ value, onChange }) {
  const [clients,setClients] = useState([]); const [amcs,setAmcs]=useState([]);
  const [matchingClient, setMatchingClient] = useState(null);
  const [checkingClientName, setCheckingClientName] = useState(false);
  const manualClientName = String(value.manual_client_name || "").trim();
  const needsClient = !value.client_id && !String(value.manual_client_name || "").trim();
  const canOfferClientCreation = !value.client_id && manualClientName.length > 0;

  useEffect(() => {
    (async () => {
      const rows = await listOrderFormClientOptions();
      setClients(rows ?? []);
      setAmcs((rows || []).filter((client) => String(client.category || "").toLowerCase() === "amc"));
    })();
  }, []);

  const filteredClients = useMemo(() => {
    const nonAmc = (clients || []).filter((c) => String(c.category || "").toLowerCase() !== "amc");
    const amcIdNum = value.managing_amc_id ? Number(value.managing_amc_id) : null;
    if (!amcIdNum) return nonAmc;
    return nonAmc.filter((c) => Number(c.amc_id) === amcIdNum);
  }, [clients, value.managing_amc_id]);

  const selectedClient = useMemo(() => {
    if (!value.client_id) return null;
    return (clients || []).find((client) => String(client.id) === String(value.client_id)) || null;
  }, [clients, value.client_id]);

  useEffect(() => {
    let cancelled = false;

    if (!canOfferClientCreation) {
      setMatchingClient(null);
      if (value.create_client_from_manual) {
        onChange({ create_client_from_manual: false });
      }
      return () => {
        cancelled = true;
      };
    }

    setCheckingClientName(true);
    const timer = window.setTimeout(async () => {
      try {
        const matches = await searchOrderFormClientsByName(manualClientName, 5);
        if (cancelled) return;
        const normalized = manualClientName.toLowerCase();
        const exact = (matches || []).find(
          (client) => String(client.name || "").trim().toLowerCase() === normalized
        );
        setMatchingClient(exact || null);
        if (exact && value.create_client_from_manual) {
          onChange({ create_client_from_manual: false });
        }
      } catch (error) {
        console.warn("Client duplicate check failed", error);
        if (!cancelled) setMatchingClient(null);
      } finally {
        if (!cancelled) setCheckingClientName(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canOfferClientCreation, manualClientName, value.create_client_from_manual]);

  return (
    <div className="rounded-md bg-white/60 p-3 border">
      <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Client & Contact</div>

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
        <SelectedClientContactPreview client={selectedClient} />
      </div>

      <div className="mt-2 text-[11px] text-gray-500">Or enter a manual client:</div>
      <TextInput
        placeholder="Manual client name"
        value={value.manual_client_name || ""}
        onChange={(e) => onChange({ manual_client_name: e.target.value, create_client_from_manual: false })}
        disabled={!!value.client_id}
      />
      {canOfferClientCreation && (
        <div className="mt-2 space-y-2">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              checked={!!value.create_client_from_manual}
              disabled={!!matchingClient || checkingClientName}
              onChange={(e) => onChange({ create_client_from_manual: e.target.checked })}
            />
            <span>Create client record from this name</span>
          </label>
          {checkingClientName && (
            <div className="text-[11px] text-slate-500">Checking existing clients...</div>
          )}
          <ClientNudge show={!!matchingClient} clientName={matchingClient?.name} />
        </div>
      )}
      <RecommendedCue show={needsClient}>
        Recommended: select a client or enter a manual client name.
      </RecommendedCue>

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
