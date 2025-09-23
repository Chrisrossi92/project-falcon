import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import supabase from "@/lib/supabaseClient";
import AvatarBadge from "@/components/ui/AvatarBadge";
import { useRole } from "@/lib/hooks/useRole";

function isUuid(v) {
  return typeof v === "string" && /^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);
}

export default function UserDetail() {
  const nav = useNavigate();
  const { id: routeId } = useParams();
  const { isAdmin, role } = useRole() || {};
  const isAdminish = !!(isAdmin || String(role || "").toLowerCase() === "admin");

  const [effectiveId, setEffectiveId] = useState(null);
  const [u, setU] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Resolve an ID to load:
  // 1) use :id from the route if provided and valid
  // 2) else, fall back to current auth user id
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // If route had an id and it's valid, use it
        if (routeId && routeId !== "undefined" && isUuid(routeId)) {
          if (active) setEffectiveId(routeId);
          return;
        }

        // Fallback: current signed-in user
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        const selfId = data?.user?.id || null;

        if (!selfId) {
          // No id anywhere — send them back to Users list with a friendly message
          if (active) setErr("No user selected and no signed-in user found.");
          return;
        }

        if (active) setEffectiveId(selfId);
      } catch (e) {
        if (active) setErr(e?.message || String(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [routeId]);

  // Once we have an effective id, load the user row
  useEffect(() => {
    if (!effectiveId) return; // wait until we resolved an id
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const { data, error } = await supabase
          .from("users")
          .select(
            "id, email, display_name, full_name, name, role, status, fee_split, avatar_url, display_color, created_at, updated_at"
          )
          .eq("id", effectiveId)
          .single();
        if (error) throw error;
        if (active) setU(data || null);
      } catch (e) {
        if (active) {
          setErr(e?.message || String(e));
          setU(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [effectiveId]);

  // Hard gate while resolving
  if (loading) return null;

  if (err) {
    return (
      <div className="p-4 text-sm text-red-600 space-y-3">
        <div>Failed to load user: {err}</div>
        <button className="px-3 py-1.5 border rounded text-sm" onClick={() => nav("/users")}>
          ← Back to Users
        </button>
      </div>
    );
  }

  if (!u) {
    return (
      <div className="p-4 text-sm text-amber-700 space-y-3">
        <div>User not found.</div>
        <button className="px-3 py-1.5 border rounded text-sm" onClick={() => nav("/users")}>
          ← Back to Users
        </button>
      </div>
    );
  }

  const display = u.display_name || u.full_name || u.name || u.email || "—";

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AvatarBadge
            name={display}
            email={u.email}
            id={u.id}
            color={u.display_color}
            src={u.avatar_url}
            size={56}
            ring
          />
          <div>
            <div className="text-lg font-semibold">{display}</div>
            <div className="text-sm text-gray-600">{u.email || "—"}</div>
            <div className="text-xs text-gray-500">
              Role: <span className="font-medium text-gray-700">{u.role || "—"}</span>
              {" • "}
              Status: <span className="font-medium text-gray-700">{u.status || "active"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/users" className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">
            ← Back
          </Link>
          {isAdminish && (
            <Link
              to={`/users/${u.id}`}
              className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50"
              title="Edit user"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm font-medium mb-2">Profile</div>
          <dl className="text-sm">
            <div className="flex justify-between py-1">
              <dt className="text-gray-500">Display Name</dt>
              <dd className="text-gray-800">{u.display_name || "—"}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-gray-500">Full Name</dt>
              <dd className="text-gray-800">{u.full_name || "—"}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-gray-500">Email</dt>
              <dd className="text-gray-800">{u.email || "—"}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-gray-500">Fee Split</dt>
              <dd className="text-gray-800">
                {u.fee_split != null ? String(u.fee_split) : "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm font-medium mb-2">Meta</div>
          <dl className="text-sm">
            <div className="flex justify-between py-1">
              <dt className="text-gray-500">User ID</dt>
              <dd className="text-gray-800 break-all">{u.id}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-gray-500">Created</dt>
              <dd className="text-gray-800">
                {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
              </dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-gray-500">Updated</dt>
              <dd className="text-gray-800">
                {u.updated_at ? new Date(u.updated_at).toLocaleString() : "—"}
              </dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-gray-500">Avatar Color</dt>
              <dd className="text-gray-800">{u.display_color || "—"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}






