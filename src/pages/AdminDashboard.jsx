// src/pages/AdminDashboard.jsx
import React, { useMemo } from "react";
import DashboardTemplate from "@/templates/DashboardTemplate";
import LoadingBlock from "@/components/ui/LoadingBlock";
import ErrorCallout from "@/components/ui/ErrorCallout";
import AdminCalendar from "@/components/admin/AdminCalendar";
import OrdersTable from "@/features/orders/OrdersTable";
import { useOrders } from "@/lib/hooks/useOrders";
import DashboardSplit from "@/components/dashboard/DashboardSplit";
import UpcomingList from "@/components/dashboard/UpcomingList";
import KpiLink from "@/components/dashboard/KpiLink";
import SectionHeader from "@/components/ui/SectionHeader";

export default function AdminDashboard() {
  const { data = [], loading, error } = useOrders();

  const kpis = useMemo(() => {
    const total = data.length;
    const inReview = data.filter(
      (o) => String(o.status || "").toLowerCase() === "in_review"
    ).length;
    const ready = data.filter(
      (o) => String(o.status || "").toLowerCase() === "ready_to_send"
    ).length;

    return [
      <KpiLink key="total" label="Total Orders" value={total} filter={{}} />,
      <KpiLink
        key="inReview"
        label="In Review"
        value={inReview}
        filter={{ status: "in_review" }}
      />,
      <KpiLink
        key="ready"
        label="Ready to Send"
        value={ready}
        filter={{ status: "ready_to_send" }}
      />,
    ];
  }, [data]);

  return (
    <DashboardTemplate
      title="Admin Dashboard"
      subtitle="Overview of orders & events"
      kpis={kpis}
    >
      {error && (
        <ErrorCallout>Failed to load orders: {error.message}</ErrorCallout>
      )}

      {loading ? (
        <LoadingBlock label="Loading dashboard…" />
      ) : (
        <DashboardSplit
          modes={{
            calendar: { label: "calendar", render: () => <AdminCalendar /> },
            upcoming: {
              label: "upcoming",
              render: () => <UpcomingList orders={data} />,
            },
          }}
          initial="calendar"
          leftTitles={{ calendar: "Calendar", upcoming: "Upcoming Events" }}
          leftSubtitles={{
            calendar: "Site visits, review due, final due",
            upcoming: "Past 2 weeks → next 30 days",
          }}
          right={() => (
            <>
              <SectionHeader title="Orders" subtitle="Role-scoped by RLS" />
              <OrdersTable bare />
            </>
          )}
        />
      )}
    </DashboardTemplate>
  );
}









































