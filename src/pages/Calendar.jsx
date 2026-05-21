// src/pages/Calendar.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import CalendarFiltersBar from "@/components/calendar/CalendarFiltersBar";
import CalendarLegend from "@/components/calendar/CalendarLegend";
import TwoWeekCalendar from "@/components/calendar/TwoWeekCalendar";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import CalendarDayDetailRail from "@/components/calendar/CalendarDayDetailRail";
import supabase from "@/lib/supabaseClient";
import { useCurrentUserAppContext } from "@/features/auth/useCurrentUserAppContext";
import {
  calendarEventsFromOrder,
  filterCalendarEventsByRange,
  normalizeCalendarEventType,
} from "@/lib/calendar/normalizeCalendarEvent";
import { DEFAULT_CALENDAR_POLICY } from "@/lib/policies/defaultCalendarPolicy";

function sameId(a, b) {
  if (!a || !b) return false;
  return String(a) === String(b);
}

export default function CalendarPage() {
  const [view, setView] = useState("month"); // 'month' | '2w'
  const [weeks, setWeeks] = useState(2);
  const [showWeekends, setShowWeekends] = useState(DEFAULT_CALENDAR_POLICY.weekendsVisibleDefault);

  const [lens, setLens] = useState("all");

  const [anchor, setAnchor] = useState(new Date());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const { context: appContext, loading: appContextLoading } = useCurrentUserAppContext();
  const userId = appContext?.user_id || null;
  const isAdmin = Boolean(appContext?.is_owner || appContext?.is_admin_role);
  const isReviewer = !isAdmin && Boolean(appContext?.is_reviewer_role);
  const calendarRole = appContext?.is_owner
    ? "owner"
    : isAdmin
    ? "admin"
    : isReviewer
    ? "reviewer"
    : appContext?.is_appraiser_role
    ? "appraiser"
    : String(appContext?.primary_role_key || appContext?.role_keys?.[0] || "appraiser").toLowerCase();

  useEffect(() => {
    if (appContextLoading) return;

    let ok = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        let q = supabase
          .from("v_orders_active_frontend_v4")
          .select(
            [
              "id",
              "order_id",
              "order_number",
              "address",
              "address_line1",
              "city",
              "state",
              "postal_code",
              "zip",
              "client_name",
              "appraiser_id",
              "appraiser_name",
              "reviewer_id",
              "reviewer_name",
              "status",
              "site_visit_at",
              "review_due_at",
              "final_due_at",
              "due_date",
            ].join(", ")
          );

        if (isReviewer) {
          q = q.eq("reviewer_id", userId || null).eq("status", "in_review");
        } else if (!isAdmin) {
          q = q.eq("appraiser_id", userId || null);
        }

        const { data, error } = await q;
        if (error) throw error;
        if (ok) setOrders(data || []);
      } catch (e) {
        if (ok) setError(e?.message || "Failed to load calendar");
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [appContextLoading, isAdmin, isReviewer, userId]);

  const deriveEvents = useCallback(
    (start, end) => {
      if (!start || !end) return [];
      const events = [];

      orders.forEach((o) => {
        events.push(...calendarEventsFromOrder(o));
      });

      return filterCalendarEventsByRange(events, start, end);
    },
    [orders]
  );

  const filterByLens = useCallback(
    (list) =>
      (list || []).filter((ev) => {
        const t = normalizeCalendarEventType(ev.type || ev.eventType || ev.event_type);
        if (lens === "site") return t === "site";
        if (lens === "review") return t === "review";
        if (lens === "final") return t === "final";
        if (lens === "mine") {
          return (
            sameId(ev.appraiserId || ev.appraiser_id, userId) ||
            sameId(ev.reviewerId || ev.reviewer_id, userId)
          );
        }
        return true;
      }),
    [lens, userId]
  );

  const applyCalendarFocus = useCallback(
    (list) => filterByLens(list),
    [filterByLens]
  );

  const monthEvents = useMemo(() => {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
    return applyCalendarFocus(deriveEvents(start, end)).map((ev) => ({
      ...ev,
      start: new Date(ev.start),
    }));
  }, [anchor, applyCalendarFocus, deriveEvents]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const start = new Date(selectedDay);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDay);
    end.setHours(23, 59, 59, 999);
    return applyCalendarFocus(deriveEvents(start, end)).map((ev) => ({
      ...ev,
      start: new Date(ev.start),
    })).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [applyCalendarFocus, deriveEvents, selectedDay]);

  const openOrder = useCallback((orderId) => {
    if (orderId) window.open(`/orders/${orderId}`, "_self");
  }, []);

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm ring-1 ring-slate-100">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Scheduling Workspace
        </div>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">
          Operational Schedule
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Coordinate site visits, review handoffs, and client due dates across the active workload.
        </p>
      </div>

      <CalendarFiltersBar
        view={view} setView={setView}
        weeks={weeks} setWeeks={setWeeks}
        showWeekends={showWeekends} setShowWeekends={setShowWeekends}
        lens={lens}
        setLens={setLens}
      />

      <CalendarLegend />

      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {view === "month" ? (
            <CalendarGrid
              anchor={anchor}
              events={monthEvents}
              onPrev={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
              onNext={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
              onSelectOrder={openOrder}
              onSelectDay={setSelectedDay}
              selectedDay={selectedDay}
              role={calendarRole}
            />
          ) : (
            <TwoWeekCalendar
              getEvents={async (start, end) => applyCalendarFocus(deriveEvents(start, end))}
              weeks={weeks}
              showWeekends={showWeekends}
              showWeekdayHeader
              compact
              role={calendarRole}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              onEventClick={(ev) => openOrder(ev?.orderId)}
            />
          )}
        </div>

        <CalendarDayDetailRail
          selectedDay={selectedDay}
          events={selectedDayEvents}
          onOpenOrder={openOrder}
        />
      </div>
    </div>
  );
}


