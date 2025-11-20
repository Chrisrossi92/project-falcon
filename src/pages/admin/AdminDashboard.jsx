import React, { useEffect, useMemo, useState } from "react";
import DashboardTemplate from "@/templates/DashboardTemplate";
import KpiLink from "@/components/dashboard/KpiLink";
import DashboardCalendarPanel from "@/components/dashboard/DashboardCalendarPanel";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function AdminDashboard() {
  const [total, setTotal] = useState(0);
  const [inProg, setInProg] = useState(0);
  const [due, setDue] = useState({ d1: 0, d2: 0, d7: 0 });

  useEffect(() => {
    (async () => {
      const { count: totalCount } = await supabase.from("orders").select("id", { count: "exact", head: true });
      setTotal(totalCount ?? 0);

      const INPROG = ["IN_PROGRESS", "In progress", "in_progress", "In Progress"];
      const { count: progCount } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", INPROG);
      setInProg(progCount ?? 0);

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const iso = (d) => d.toISOString();
      const add = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

      const [d1Res, d2Res, d7Res] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true })
          .neq("status", "COMPLETE")
          .gte("final_due_at", iso(today)).lte("final_due_at", iso(add(today, 1))),
        supabase.from("orders").select("id", { count: "exact", head: true })
          .neq("status", "COMPLETE")
          .gte("final_due_at", iso(today)).lte("final_due_at", iso(add(today, 2))),
        supabase.from("orders").select("id", { count: "exact", head: true })
          .neq("status", "COMPLETE")
          .gte("final_due_at", iso(today)).lte("final_due_at", iso(add(today, 7))),
      ]);

      setDue({
        d1: d1Res?.count ?? 0,
        d2: d2Res?.count ?? 0,
        d7: d7Res?.count ?? 0,
      });
    })();
  }, []);

  const kpis = useMemo(
    () => [
      <KpiLink key="k1" label="Total Orders" value={total} to="/orders" />,
      <KpiLink key="k2" label="In Progress" value={inProg} to="/orders?status=in_progress" />,
      <div key="k3" className="flex gap-2">
        <KpiLink label="Due in 1 Day" value={due.d1} to="/orders?due=1" />
        <KpiLink label="Due in 2 Days" value={due.d2} to="/orders?due=2" />
        <KpiLink label="Due in 7 Days" value={due.d7} to="/orders?due=7" />
      </div>,
    ],
    [total, inProg, due]
  );

  return (
    <DashboardTemplate title="Admin Dashboard" subtitle="Calendar and queue" kpis={kpis}>
      <div className="space-y-4">
        <section className="rounded-xl border bg-white p-3">
          <DashboardCalendarPanel fixedHeader />
        </section>

        {/* Active orders only */}
        <section className="rounded-xl border bg-white">
          <UnifiedOrdersTable
            role="admin"
            pageSize={15}
            filters={{
              activeOnly: true,
              page: 0,
              pageSize: 15,
              orderBy: "order_number",
              ascending: false,
            }}
          />
        </section>
      </div>
    </DashboardTemplate>
  );
}





















































