// src/pages/Calendar.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import CalendarFiltersBar from "@/components/calendar/CalendarFiltersBar";
import CalendarLegend from "@/components/calendar/CalendarLegend";
import TwoWeekCalendar from "@/components/calendar/TwoWeekCalendar";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import CalendarDayDetailRail from "@/components/calendar/CalendarDayDetailRail";
import { WorkspaceContextTile } from "@/components/workspace/WorkspaceContext";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import WorkspaceBadge from "@/components/workspace/WorkspaceBadge";
import { FalconPageMotion } from "@/components/motion";
import { FalconErrorState, FalconLoadingState, FalconSkeleton } from "@/components/state";
import supabase from "@/lib/supabaseClient";
import { useCurrentUserAppContext } from "@/features/auth/useCurrentUserAppContext";
import { useOperationsMode } from "@/lib/operations/OperationsModeProvider";
import { getOperationsScopeForMode } from "@/lib/operations/operationsMode";
import { getWorkspacePageChrome } from "@/lib/workspace/workspaceIdentity";
import { listCompanyAssignableUsers } from "@/features/company-members/assignableUsersApi";
import {
  calendarEventsFromOrder,
  filterCalendarEventsByRange,
  normalizeCalendarEventType,
} from "@/lib/calendar/normalizeCalendarEvent";
import { DEFAULT_CALENDAR_POLICY } from "@/lib/policies/defaultCalendarPolicy";
import { applyOperationalOrderUserNamesToRows } from "@/lib/utils/userDisplayName";

function sameId(a, b) {
  if (!a || !b) return false;
  return String(a) === String(b);
}

const LENS_LABELS = {
  all: "All schedule",
  mine: "My work",
  site: "Site visits",
  review: "Review handoffs",
  final: "Client due",
};

function roleContextLabel({ isAdmin, isReviewer, role }) {
  if (isAdmin) return "Company schedule";
  if (isReviewer) return "Review schedule";
  if (role === "appraiser") return "Assigned schedule";
  return "Personal schedule";
}

function dateContextLabel(date) {
  if (!date) return "No day selected";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "Selected day";
  return value.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function viewContextLabel(view, weeks) {
  if (view === "month") return "Month view";
  return `${weeks || 2}-week view`;
}

function activeOrdersLabel(count, loading) {
  if (loading) return "Loading";
  return `${count} active ${count === 1 ? "order" : "orders"}`;
}

export default function CalendarPage() {
  const { operationsMode } = useOperationsMode();
  const operationsScope = getOperationsScopeForMode(operationsMode);
  const pageChrome = getWorkspacePageChrome(operationsMode, "calendar");
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
              "operations_scope",
              "site_visit_at",
              "review_due_at",
              "final_due_at",
              "due_date",
            ].join(", ")
          );

        if (operationsScope) {
          q = q.eq("operations_scope", operationsScope);
        }

        if (isReviewer) {
          q = q.eq("reviewer_id", userId || null).eq("status", "in_review");
        } else if (!isAdmin) {
          q = q.eq("appraiser_id", userId || null);
        }

        const { data, error } = await q;
        if (error) throw error;

        let rows = data || [];
        if (rows.some((row) => row?.appraiser_id || row?.reviewer_id)) {
          try {
            const users = await listCompanyAssignableUsers("all");
            rows = applyOperationalOrderUserNamesToRows(rows, users);
          } catch (nameError) {
            console.warn("[CalendarPage] failed to load operational user names", nameError);
          }
        }

        if (ok) setOrders(rows);
      } catch (e) {
        if (ok) setError(e?.message || "Failed to load calendar");
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [appContextLoading, isAdmin, isReviewer, operationsScope, userId]);

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

  const companyLabel = appContext?.company_name || "Current company";
  const roleLabel = roleContextLabel({ isAdmin, isReviewer, role: calendarRole });
  const viewLabel = viewContextLabel(view, weeks);
  const lensLabel = LENS_LABELS[lens] || "All schedule";
  const selectedDayLabel = dateContextLabel(selectedDay);
  const loadedOrderCount = orders.length;
  const activeOrdersContext = activeOrdersLabel(loadedOrderCount, loading);
  const boardLabel = view === "month" ? "Month calendar" : `${weeks || 2}-week calendar`;
  const boardDescription = view === "month"
    ? "Scan active site visits, review handoffs, and client due dates across the selected month."
    : "Review the near-term schedule across the selected operational range.";

  const openOrder = useCallback((orderId) => {
    if (orderId) window.open(`/orders/${orderId}`, "_self");
  }, []);

  return (
    <FalconPageMotion className="space-y-4 p-4 lg:p-6">
      <section
        className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm ring-1 ring-slate-100 lg:px-6"
        aria-labelledby="calendar-workspace-heading"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <WorkspaceBadge operationsMode={operationsMode} />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {pageChrome.eyebrow || "Scheduling Coordination"}
              </span>
            </div>
            <h1
              id="calendar-workspace-heading"
              className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950"
            >
              {pageChrome.title || "Calendar Workspace"}
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              {pageChrome.description || "Coordinate site visits, review handoffs, and client due dates across active orders."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Calendar workspace context">
            <WorkspaceContextTile
              label="Company"
              value={companyLabel}
              className="rounded-xl shadow-[0_1px_0_rgba(15,23,42,0.03)]"
              labelClassName="tracking-[0.12em] text-slate-400"
              valueClassName="max-w-[14rem] font-semibold text-slate-800"
            />
            <WorkspaceContextTile
              label="Work view"
              value={roleLabel}
              className="rounded-xl shadow-[0_1px_0_rgba(15,23,42,0.03)]"
              labelClassName="tracking-[0.12em] text-slate-400"
              valueClassName="max-w-[14rem] font-semibold text-slate-800"
            />
            <WorkspaceContextTile
              label="Orders"
              value={activeOrdersContext}
              className="rounded-xl shadow-[0_1px_0_rgba(15,23,42,0.03)]"
              labelClassName="tracking-[0.12em] text-slate-400"
              valueClassName="max-w-[14rem] font-semibold text-slate-800"
            />
          </div>
        </div>
      </section>

      <section
        className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm ring-1 ring-slate-100"
        aria-labelledby="calendar-controls-heading"
      >
        <div className="mb-3 flex flex-col gap-3 px-1 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2
              id="calendar-controls-heading"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
            >
              Scheduling Controls
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Adjust the view and lens without changing the underlying active-order schedule.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500" aria-label="Current calendar view">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-600">
              {viewLabel}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-600">
              {lensLabel}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-600">
              {selectedDayLabel}
            </span>
          </div>
        </div>

        <CalendarFiltersBar
          view={view} setView={setView}
          weeks={weeks} setWeeks={setWeeks}
          showWeekends={showWeekends} setShowWeekends={setShowWeekends}
          lens={lens}
          setLens={setLens}
        />

        <div className="px-1 pt-1">
          <CalendarLegend />
        </div>
      </section>

      {loading && (
        <FalconLoadingState
          title="Loading active schedule"
          description="Loading active schedule..."
          className="rounded-xl"
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <FalconSkeleton height="2rem" />
            <FalconSkeleton height="2rem" />
            <FalconSkeleton height="2rem" />
          </div>
        </FalconLoadingState>
      )}

      {error && (
        <FalconErrorState
          title="Calendar could not load."
          description={error}
          className="rounded-xl"
        />
      )}

      <section
        className="space-y-4"
        aria-label="Calendar schedule board and selected day details"
      >
        <WorkspaceSection
          as="div"
          className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm ring-1 ring-slate-100"
          title="Schedule Board"
          titleId="calendar-board-heading"
          description={boardDescription}
          headerClassName="mb-3 px-1"
          titleClassName="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
          meta={
            <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {boardLabel}
            </span>
          }
        >
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[44rem] lg:min-w-0">
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
          </div>
        </WorkspaceSection>

        <CalendarDayDetailRail
          selectedDay={selectedDay}
          events={selectedDayEvents}
          onOpenOrder={openOrder}
        />
      </section>
    </FalconPageMotion>
  );
}
