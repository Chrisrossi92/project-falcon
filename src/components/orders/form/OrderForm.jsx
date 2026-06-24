// src/components/orders/form/OrderForm.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ClientFields from "./ClientFields";
import AssignmentFields from "./AssignmentFields";
import PropertyFields from "./PropertyFields";
import DatesFields from "./DatesFields";
import { createOrderViaRpc, updateOrderViaRpc } from "@/lib/services/ordersService";
import {
  createOrderFormClient,
  searchOrderFormClientsByName,
} from "@/features/orders/orderClientOptionsApi";
import { formatPhoneForDisplay } from "@/lib/utils/phoneFormat";
import { dateOnlyInputValue } from "@/lib/utils/dateOnly";

// ---- date helpers ----
const toYMD = (value) => {
  return dateOnlyInputValue(value);
};

const toLocalDateTimeInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
};

const fromLocalDateTimeInputToLocalTimestamp = (value) => {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;
  return `${match[1]}T${match[2]}:${match[3] || "00"}`;
};

function buildOrderPayload(values, { isEdit = false } = {}) {
  const payload = {
    client_id: values.client_id || null,
    manual_client_name: values.manual_client_name || null,
    managing_amc_id: values.managing_amc_id || null,
    client_contact_id: values.client_contact_id || null,

    appraiser_id: values.appraiser_id || null,
    reviewer_id: values.reviewer_id || null,

    base_fee: values.base_fee ? Number(values.base_fee) : null,
    split_pct: values.split_pct ? Number(values.split_pct) : null,
    appraiser_fee: values.appraiser_fee ? Number(values.appraiser_fee) : null,

    property_address: values.address_line1 || values.property_address || null,
    city: values.city || values.property_city || null,
    state: values.state || values.property_state || null,
    postal_code: values.postal_code || values.zip || values.property_zip || null,

    property_type: values.property_type || null,
    report_type: values.report_type || null,

    entry_contact_name: values.entry_contact_name || null,
    entry_contact_phone: values.entry_contact_phone ? formatPhoneForDisplay(values.entry_contact_phone) : null,
    property_contact_name: values.property_contact_name || values.entry_contact_name || null,
    property_contact_phone: values.property_contact_phone || values.entry_contact_phone
      ? formatPhoneForDisplay(values.property_contact_phone || values.entry_contact_phone)
      : null,

    site_visit_at: values.site_visit_at || null,
    review_due_at: values.review_due_at || null,
    final_due_at: values.final_due_at || null,

    access_notes: values.access_notes || null,
    notes: values.notes || null,
  };

  if (!isEdit) {
    payload.status = "new";
  }

  return payload;
}

function formatStatusLabel(status) {
  return String(status || "new")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeClientName(name) {
  return String(name || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function getInlineClientCreateErrorMessage(error) {
  const message = String(error?.message || error?.details || error?.hint || "");

  if (message.includes("client_name_required")) {
    return "Enter a client name.";
  }

  if (message.includes("client_name_already_exists")) {
    return "A client with this name already exists.";
  }

  if (message.includes("invalid_amc")) {
    return "Choose a valid AMC.";
  }

  if (
    message.includes("permission") ||
    message.includes("forbidden") ||
    message.includes("not authorized") ||
    error?.code === "42501"
  ) {
    return "You do not have permission to create clients.";
  }

  return "Falcon could not create this client.";
}

export default function OrderForm({
  order,
  onSaved,
  onCancel,
  operationsScope = null,
  allowInlineClientCreation = true,
}) {
  const navigate = useNavigate();
  const [values, setValues] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const isEdit = Boolean(order?.id);
  const formTitle = isEdit ? "Edit Order" : "New Order";
  const submitLabel = isEdit ? "Save Changes" : "Create Order";
  const savingLabel = isEdit ? "Saving..." : "Creating...";
  const canCreateInlineClient = allowInlineClientCreation === true && operationsScope !== "amc_operations";
  const statusLabel = formatStatusLabel(values.status || "new");
  const orderNumberPreview = isEdit
    ? values.order_number || "Order number unavailable"
    : "Generated on save";

  // hydrate from OrderFrontend
  useEffect(() => {
    if (!order) return;
    setValues({
      order_number: order.order_number ?? "",
      status: (order.status || "").toLowerCase(),
      client_id: order.client_id ?? null,
      manual_client_name: order.manual_client_name ?? order.client_name ?? "",
      managing_amc_id: order.managing_amc_id ?? order.amc_id ?? null,
      client_contact_id: order.client_contact_id ?? null,
      appraiser_id: order.appraiser_id ?? null,
      reviewer_id: order.reviewer_id ?? order.current_reviewer_id ?? null,
      split_pct: order.split_pct ?? "",
      base_fee: order.base_fee ?? "",
      appraiser_fee: order.appraiser_fee ?? "",
      address_line1: order.address_line1 ?? order.property_address ?? "",
      city: order.city ?? "",
      state: order.state ?? "",
      postal_code: order.postal_code ?? order.zip ?? "",
      property_type: order.property_type ?? "",
      report_type: order.report_type ?? "",
      site_visit_at: toLocalDateTimeInput(order.site_visit_at),
      review_due_at: toYMD(order.review_due_at),
      final_due_at: toYMD(order.final_due_at ?? order.due_date),
      property_contact_name: order.property_contact_name ?? "",
      property_contact_phone: formatPhoneForDisplay(order.property_contact_phone ?? ""),
      entry_contact_name: order.entry_contact_name ?? "",
      entry_contact_phone: formatPhoneForDisplay(order.entry_contact_phone ?? ""),
      access_notes: order.access_notes ?? "",
      notes: order.notes ?? "",
    });
  }, [order]);

  const applyPatch = (patch) => {
    setValues((prev) => {
      const next = { ...prev, ...patch };

      // auto-calc appraiser_fee from base_fee * split_pct
      if ("base_fee" in patch || "split_pct" in patch) {
        const base = parseFloat(next.base_fee ?? 0);
        const split = parseFloat(next.split_pct ?? 0);
        if (!Number.isNaN(base) && !Number.isNaN(split)) {
          next.appraiser_fee = String(
            Math.round(base * (split / 100) * 100) / 100
          );
        }
      }

      return next;
    });
  };

  const handleChange = (arg) => {
    if (arg && arg.target) {
      const { name, value } = arg.target;
      applyPatch({ [name]: value });
    } else if (arg && typeof arg === "object") {
      applyPatch(arg);
    }
  };

  function handleCancel() {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const nextValues = {
        ...values,
        site_visit_at: values.site_visit_at
          ? fromLocalDateTimeInputToLocalTimestamp(values.site_visit_at)
          : null,
      };

      const shouldResolveManualClient =
        canCreateInlineClient &&
        !isEdit &&
        !nextValues.client_id &&
        String(nextValues.manual_client_name || "").trim();

      if (!isEdit && !canCreateInlineClient && !nextValues.client_id) {
        throw new Error("Select an existing client before creating this order.");
      }

      if (shouldResolveManualClient) {
        const manualClientName = String(nextValues.manual_client_name || "").trim();
        const matches = await searchOrderFormClientsByName(
          manualClientName,
          operationsScope ? { limit: 10, operationsScope } : 10
        );
        const normalizedManualName = normalizeClientName(manualClientName);
        const existingClient = (matches || []).find(
          (client) => normalizeClientName(client.name) === normalizedManualName
        );

        if (existingClient?.id) {
          nextValues.client_id = existingClient.id;
        } else {
          let createdClient;
          try {
            createdClient = await createOrderFormClient({
              name: manualClientName,
              amcId: nextValues.managing_amc_id || null,
            });
          } catch (clientError) {
            throw new Error(getInlineClientCreateErrorMessage(clientError));
          }

          if (!createdClient?.id) {
            throw new Error("Client record could not be created. The order was not created.");
          }

          nextValues.client_id = createdClient.id;
        }

        nextValues.manual_client_name = null;
      }

      const payload = buildOrderPayload(nextValues, { isEdit });
      if (!isEdit && operationsScope) {
        payload.operations_scope = operationsScope;
      }

      const result = isEdit
        ? await updateOrderViaRpc(order.id, payload)
        : operationsScope
          ? await createOrderViaRpc(payload, { operationsScope })
          : await createOrderViaRpc(payload);

      if (onSaved) onSaved(result);
      else if (result?.id) navigate(`/orders/${result.id}`);
    } catch (err) {
      console.error("Failed to save order", err);
      setError(err.message || "Failed to save order. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 p-6 bg-white h-full"
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">
              {formTitle}
            </h2>
            <p className="text-sm text-slate-500">
              {isEdit
                ? "Update order intake, scheduling, assignment, and notes."
                : "Create, assign, and schedule the order."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700">
              {orderNumberPreview}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
              Status: {statusLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-600 max-w-xs">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm px-3 py-1 rounded-md border border-slate-200 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="text-sm px-4 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isSaving ? savingLabel : submitLabel}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 overflow-y-auto pr-1">
        <ClientFields
          value={values}
          values={values}
          onChange={handleChange}
          allowInlineClientCreation={canCreateInlineClient}
          operationsScope={operationsScope}
        />
        <PropertyFields value={values} values={values} onChange={handleChange} />
        <DatesFields value={values} values={values} onChange={handleChange} />
        <AssignmentFields
          value={values}
          values={values}
          onChange={handleChange}
          isEdit={isEdit}
          orderId={order?.id || null}
        />
        <div className="col-span-1 xl:col-span-2 space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Special Instructions
          </label>
          <textarea
            name="notes"
            value={values.notes || ""}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 text-sm min-h-[96px]"
            placeholder="Internal instructions for appraisers/reviewers"
          />
        </div>
      </div>
    </form>
  );
}


