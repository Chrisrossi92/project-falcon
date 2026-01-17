import OrderStatusBadge from "@/components/orders/table/OrderStatusBadge";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const fmtDate = (d) =>
  !d ? "-" : isNaN(new Date(d)) ? "-" : new Date(d).toLocaleDateString();

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

const orderCell = (o) => (
  <div className="text-sm">
    <div className="font-medium leading-tight">
      {o?.id ? (
        <Link
          to={`/orders/${o.id}`}
          onClick={(e) => e.stopPropagation()}
          className="hover:underline"
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
    <div className="font-medium truncate">{o.client_name ?? "–"}</div>
    <div className="text-xs text-muted-foreground truncate">{o.appraiser_name ?? "–"}</div>
  </div>
);

const addressCell = (o) => (
  <div className="text-sm min-w-0">
    <div className="truncate" title={o.address_line1 || ""}>{o.address_line1 || "-"}</div>
    <div className="text-xs text-muted-foreground truncate" title={cityLine(o)}>{cityLine(o) || "-"}</div>
  </div>
);

const propertyReportColumnBase = {
  id: "property_report",
  width: "200px",
  header: () => "Property / Report",
  cell: (order) => {
    const propertyType = order?.property_type || "–";
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
  <div className="text-sm whitespace-nowrap font-medium">{money(pickFee(o))}</div>
);

const datesColumnBase = {
  id: "dates",
  width: "200px",
  header: () => "Dates",
  cell: (order) => {
    const rev = order?.review_due_at ?? null;
    const fin = order?.final_due_at ?? null;
    return (
      <div className="text-[12px] leading-tight whitespace-nowrap">
        <div className="text-rose-600" title={rev || ""}>Rev:&nbsp;{fmtDate(rev)}</div>
        <div className="text-rose-600 mt-1" title={fin || ""}>Final:&nbsp;{fmtDate(fin)}</div>
      </div>
    );
  },
};

const col = (key, width, header, cell, extras = {}) => ({ key, width, header, cell, ...extras });

export function getColumnsForRole(role, actions = {}) {
  const normalizedRole = (role || "appraiser").toString().toLowerCase();
  const isAppraiser = normalizedRole === "appraiser";
  const isReviewer = normalizedRole === "reviewer";
  const { onSendToReview, onSendBackToAppraiser, onComplete, onReadyForClient } = actions || {};
  const orderStatusColumn = col("order",      "180px",              () => "Order / Stat.",       (order) => orderCell(order), { locked: true });
  const clientColumn = col("client",    "200px",              () => "Client / Appraiser",                clientCell);
  const addressColumn = col("address",  "minmax(200px,1fr)",  () => "Address",               addressCell);
  const propertyReportColumn = col("propReport",  propertyReportColumnBase.width,  propertyReportColumnBase.header, (order) => propertyReportColumnBase.cell(order));
  const feeColumn = col("fee",          "140px",              () => "Fee",                   feeOnlyCell);
  const datesColumn = col("dates",   datesColumnBase.width,   datesColumnBase.header, (order) => datesColumnBase.cell(order));

  const ACTIONS_COL_WIDTH = "w-[140px]";

  const actionsColumn = {
    key: "actions",
    id: "actions",
    width: "140px",
    header: () => (
      <div className={`${ACTIONS_COL_WIDTH} flex justify-center text-xs font-medium text-muted-foreground`}>
        Actions
      </div>
    ),
    cell: (order) => {
      if (!order) return null;

      const button = isAppraiser ? (
        <Button
          size="sm"
          disabled={!onSendToReview}
          onClick={() => onSendToReview?.(order)}
        >
          Send to Review
        </Button>
      ) : isReviewer ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              Send / Update
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent
              side="top"
              align="center"
              sideOffset={4}
              className="z-50"
            >
              <DropdownMenuItem
                onClick={() => onSendBackToAppraiser?.(order)}
                disabled={!onSendBackToAppraiser}
              >
                Send back to appraiser
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onReadyForClient?.(order)}
                disabled={!onReadyForClient}
              >
                Mark ready for client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              Send / Update
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent
              side="top"
              align="center"
              sideOffset={4}
              className="z-50"
            >
              <DropdownMenuItem onClick={() => onSendToReview?.(order)}>
                Send to review
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onSendBackToAppraiser?.(order)}
              >
                Send back to appraiser
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onComplete?.(order)}>
                Mark complete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
      );

      return (
        <div className={`${ACTIONS_COL_WIDTH} flex justify-center`}>
          {button}
        </div>
      );
    },
  };

  const columns = [
    orderStatusColumn,
    clientColumn,
    addressColumn,
    propertyReportColumn,
    feeColumn,
    actionsColumn,
    datesColumn,
  ];

  return columns;
}

export default getColumnsForRole;
