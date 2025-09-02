// src/components/orders/OrdersTable.jsx
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card.jsx";
import { fetchOrdersForList } from "@/lib/api/orders";

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString();
}

function fmtMoney(n) {
  if (n == null) return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return "—";
  return num.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function OrdersTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchOrdersForList({ limit: 1000, ascending: false });
      setRows(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(10)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="h-4 w-40 bg-muted rounded mb-2" />
            <div className="h-3 w-64 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">No orders found.</div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((o) => {
        const title =
          o.display_title ??
          `${o.order_no ?? "Order"} • ${o.client_name ?? "—"}`;
        const subtitle =
          o.display_subtitle ??
          o.address ??
          o.property_type ??
          "—";

        return (
          <Card key={o.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{title}</div>
              <div className="text-sm text-muted-foreground">{subtitle}</div>
            </div>

            <div className="text-right text-sm text-muted-foreground">
              <div>Due: {fmtDate(o.due_date)}</div>
              <div>Fee: {fmtMoney(o.fee_amount)}</div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

















