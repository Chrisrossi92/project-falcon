import OrderStatusBadge from "@/components/orders/table/OrderStatusBadge";
import { Link } from "react-router-dom";
import SiteVisitPicker from "@/components/dates/SiteVisitPicker";
import SmartActionsControl from "@/features/orders/components/SmartActionsControl";
import { getSmartOrderActions } from "@/features/orders/smartActions";
import { formatOperationalDate } from "@/lib/utils/dateOnly";

const fmtDate = (d) => formatOperationalDate(d);

const formatCompactSiteVisit = (date) =>
  date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const dueDateTone = (d) => {
  if (!d || isNaN(new Date(d))) return "text-slate-500";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const days = Math.ceil((target.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "text-rose-700";
  if (days <= 2) return "text-amber-700";
  return "text-slate-700";
};

const DueDateLine = ({ label, value }) => (
  <div className="flex items-center justify-between gap-2 whitespace-nowrap rounded-lg border border-slate-100 bg-white px-2 py-1 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</span>
    <span className={`text-[12.5px] font-bold tabular-nums ${dueDateTone(value)}`}>{fmtDate(value)}</span>
  </div>
);

const pickFee = (r) => [r?.base_fee, r?.appraiser_fee].find((x) => x != null);
const money = (n) =>
  n == null ? "-" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const cityLine = (r) => {
  const c = r?.city || "";
  const s = r?.state || "";
  const z = r?.postal_code || "";
  const left = [c, s].filter(Boolean).join(", ");
  return (left + (z ? ` ${z}` : "")).trim();
};

const displayPropertyType = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.toLowerCase() === "oofice" ? "Office" : text;
};

const orderCell = (o) => (
  <div className="text-sm">
    <div className="font-semibold leading-tight text-slate-700">
      {o?.id ? (
        <Link
          to={`/orders/${o.id}`}
          onClick={(e) => e.stopPropagation()}
          className="underline-offset-2 hover:underline"
        >
          {o.order_number ?? o.id?.slice(0, 8) ?? "–"}
        </Link>
      ) : (
        o.order_number ?? o.id?.slice(0, 8) ?? "–"
      )}
    </div>
    <div className="mt-1">
      <OrderStatusBadge status={o.status} />
    </div>
  </div>
);

const clientCell = (o) => (
  <div className="text-sm truncate">
    <div className="font-semibold text-slate-900 truncate">{o.client_name ?? "–"}</div>
    <div className="mt-0.5 text-xs font-medium text-slate-500 truncate">{o.appraiser_name ?? "–"}</div>
  </div>
);

const addressCell = (o) => (
  <div className="text-sm min-w-0">
    <div className="truncate" title={o.address_line1 || ""}>{o.address_line1 || "-"}</div>
    <div className="text-xs text-muted-foreground truncate" title={cityLine(o)}>{cityLine(o) || "-"}</div>
  </div>
);

const propertySummaryCell = (o) => {
  const propertyType = displayPropertyType(o?.property_type) || "Property type not set";
  const reportType = o?.report_type || "Report type not set";
  const location = cityLine(o);

  return (
    <div className="min-w-0 text-sm">
      <div className="truncate text-[15px] font-semibold leading-5 text-slate-950" title={o.address_line1 || ""}>
        {o.address_line1 || "-"}
      </div>
      <div className="mt-0.5 truncate text-xs font-medium text-slate-500" title={location}>
        {location || "-"}
      </div>
      <div className="mt-1.5 flex min-w-0 flex-wrap gap-1.5">
        <span className="max-w-full truncate rounded-full border border-slate-100 bg-slate-50/60 px-2 py-0.5 text-[10.5px] font-medium text-slate-500">
          {propertyType}
        </span>
        <span className="max-w-full truncate rounded-full border border-slate-100 bg-white/70 px-2 py-0.5 text-[10.5px] font-medium text-slate-400">
          {reportType}
        </span>
      </div>
    </div>
  );
};

const propertyReportColumnBase = {
  id: "property_report",
  width: "200px",
  header: () => "Property / Report",
  cell: (order) => {
    const propertyType = displayPropertyType(order?.property_type) || "–";
    const reportType = order?.report_type || "–";
    return (
      <div className="flex flex-col">
        <span>{propertyType}</span>
        <span className="text-xs text-muted-foreground">{reportType}</span>
      </div>
    );
  },
};

const feeOnlyCell = (o) => (
  <div className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-600">{money(pickFee(o))}</div>
);

const dashboardFeeCell = (o) => (
  <div className="text-center">
    <div className="text-sm font-semibold tabular-nums text-slate-700">{money(pickFee(o))}</div>
  </div>
);

const datesColumnBase = {
  id: "dates",
  width: "200px",
  header: () => "Dates",
  cell: (order, { isAppraiser = false, onSetSiteVisit } = {}) => {
    const site = order?.site_visit_at ?? order?.site_visit_date ?? null;
    const rev = order?.review_due_at ?? order?.review_due_date ?? null;
    const fin = order?.final_due_at ?? order?.final_due_date ?? order?.due_date ?? null;
    return (
      <div className="space-y-1.5 text-[12px] leading-tight">
        <div className="flex items-center justify-between gap-2 whitespace-nowrap rounded-lg bg-slate-50/60 px-2 py-1" title={site || ""}>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Site</span>
          {isAppraiser && onSetSiteVisit ? (
            <SiteVisitPicker
              value={site}
              emptyLabel="Site: Not set"
              triggerVariant={site ? "ghost" : "outline"}
              displayFormatter={site ? formatCompactSiteVisit : undefined}
              buttonClassName={
                site
                  ? "h-6 rounded-full px-2 text-[12px] font-semibold tabular-nums text-slate-600 underline-offset-2 hover:bg-slate-100 hover:underline focus-visible:ring-slate-300"
                  : "h-6 rounded-full px-2 text-[12px] font-medium"
              }
              onChange={(iso) => onSetSiteVisit(order, iso)}
            />
          ) : site ? (
            <span className="text-[12px] font-semibold text-slate-600 tabular-nums">{fmtDate(site)}</span>
          ) : (
            <span className="text-[12px] font-medium text-slate-500">Not set</span>
          )}
        </div>
        <DueDateLine label="Review" value={rev} />
        <DueDateLine label="Final" value={fin} />
      </div>
    );
  },
};

const col = (key, width, header, cell, extras = {}) => ({ key, width, header, cell, ...extras });

export function getColumnsForRole(role, actions = {}, options = {}) {
  const normalizedRole = (role || "appraiser").toString().toLowerCase();
  const isDashboardVariant = options?.variant === "dashboard";
  const isAppraiser = normalizedRole === "appraiser";
  const isReviewer = normalizedRole === "reviewer";
  const {
    onSendToReview,
    onSendBackToAppraiser,
    onComplete,
    onClearReview,
    onRequestFinalApproval,
    onReadyForClient,
    onSetSiteVisit,
    permissions = {},
  } = actions || {};
  const handlers = {
    onSendToReview,
    onSendBackToAppraiser,
    onComplete,
    onClearReview,
    onRequestFinalApproval,
    onReadyForClient,
  };
  const orderStatusColumn = col("order",      isDashboardVariant ? "minmax(120px,0.78fr)" : "minmax(150px,0.82fr)",              () => "Order / Status",       (order) => orderCell(order), { locked: true });
  const clientColumn = col("client",    isDashboardVariant ? "minmax(130px,0.9fr)" : "minmax(150px,0.9fr)",              () => "Client / Appraiser",                clientCell);
  const addressColumn = col("address",  "minmax(200px,1fr)",  () => "Address",               addressCell);
  const propertySummaryColumn = col("propertySummary", isDashboardVariant ? "minmax(170px,1.15fr)" : "minmax(220px,1.35fr)", () => "Property Summary", propertySummaryCell);
  const propertyReportColumn = col("propReport",  propertyReportColumnBase.width,  propertyReportColumnBase.header, (order) => propertyReportColumnBase.cell(order));
  const feeColumn = col("fee",          isDashboardVariant ? "92px" : "104px",              () => "Fee",                   isDashboardVariant ? dashboardFeeCell : feeOnlyCell, { align: isDashboardVariant ? "center" : undefined });
  const datesColumn = col("dates",   isDashboardVariant ? "minmax(128px,0.82fr)" : "minmax(150px,0.82fr)",   isDashboardVariant ? () => "Dates" : datesColumnBase.header, (order) => datesColumnBase.cell(order, { isAppraiser, onSetSiteVisit }));

  const ACTIONS_COL_WIDTH = "w-[140px]";

  const actionsColumn = {
    key: "actions",
    id: "actions",
    width: isDashboardVariant ? "126px" : "128px",
    align: isDashboardVariant ? "center" : undefined,
    header: () => (
      <div className={`${ACTIONS_COL_WIDTH} flex justify-center text-xs font-medium text-muted-foreground`}>
        Actions
      </div>
    ),
    cell: (order) => {
      if (!order) return null;

      const smartActions = getSmartOrderActions({
        order,
        role: normalizedRole,
        permissions,
        handlers,
      });
      return <SmartActionsControl actions={smartActions} variant={isDashboardVariant ? "dashboard" : "table"} />;
    },
  };

  const columns = isDashboardVariant
    ? [
        orderStatusColumn,
        clientColumn,
        propertySummaryColumn,
        feeColumn,
        actionsColumn,
        datesColumn,
      ]
    : [
        orderStatusColumn,
        clientColumn,
        propertySummaryColumn,
        feeColumn,
        actionsColumn,
        datesColumn,
      ];

  return columns;
}

export default getColumnsForRole;
