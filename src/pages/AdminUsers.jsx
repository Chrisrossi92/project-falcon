// src/pages/AdminUsers.jsx
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  listUsers,
  updateRole,
  updateFeeSplit,
  updateStatus,
  updateEmail,
} from "@/lib/services/adminUserService";

/** Central, explicit choices (extend as you add roles/statuses) */
const ROLE_OPTIONS = ["admin", "manager", "reviewer", "appraiser"];
const STATUS_OPTIONS = ["active", "inactive", "disabled"];

/** Small input helpers */
function TextInput(props) {
  return (
    <input
      {...props}
      className={
        "border rounded-md px-2 py-1 text-sm w-full " +
        (props.className ? props.className : "")
      }
    />
  );
}

function Select({ value, onChange, options, className }) {
  return (
    <select
      value={value ?? ""}
      onChange={onChange}
      className={
        "border rounded-md px-2 py-1 text-sm w-full " +
        (className ? className : "")
      }
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function FeeSplitInput({ value, onChange }) {
  return (
    <input
      type="number"
      min={0}
      max={100}
      step="1"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      className="border rounded-md px-2 py-1 text-sm w-20 text-right"
      placeholder="%"
    />
  );
}

/** One row with local edit state + Save/Reset actions */
function UserRow({ u, onRefresh }) {
  const [email, setEmail] = useState(u.email || "");
  const [role, setRole] = useState(u.role || "appraiser");
  const [feeSplit, setFeeSplit] = useState(
    typeof u.fee_split === "number" ? u.fee_split : ""
  );
  const [status, setStatus] = useState(u.status || "active");

  const [saving, setSaving] = useState(false);

  const dirty = useMemo(() => {
    const emailChanged = (u.email || "") !== (email || "");
    const roleChanged = (u.role || "appraiser") !== (role || "appraiser");
    const splitChanged =
      (typeof u.fee_split === "number" ? u.fee_split : "") !==
      (feeSplit === "" ? "" : Number(feeSplit));
    const statusChanged = (u.status || "active") !== (status || "active");
    return { emailChanged, roleChanged, splitChanged, statusChanged };
  }, [u, email, role, feeSplit, status]);

  async function onSave() {
    if (saving) return;
    const ops = [];
    try {
      setSaving(true);

      if (dirty.emailChanged) {
        ops.push(updateEmail(u.id, (email || "").trim()));
      }
      if (dirty.roleChanged) {
        ops.push(updateRole(u.id, role));
      }
      if (dirty.splitChanged) {
        if (feeSplit === "" || isNaN(Number(feeSplit))) {
          throw new Error("Fee split must be a number between 0 and 100.");
        }
        const n = Number(feeSplit);
        if (n < 0 || n > 100) {
          throw new Error("Fee split must be between 0 and 100.");
        }
        ops.push(updateFeeSplit(u.id, n));
      }
      if (dirty.statusChanged) {
        ops.push(updateStatus(u.id, status));
      }

      if (ops.length === 0) {
        toast("No changes to save.");
        return;
      }

      await Promise.all(ops);
      toast.success("Saved!");
      await onRefresh?.();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function onReset() {
    setEmail(u.email || "");
    setRole(u.role || "appraiser");
    setFeeSplit(typeof u.fee_split === "number" ? u.fee_split : "");
    setStatus(u.status || "active");
  }

  return (
    <tr className="border-b last:border-b-0">
      <td className="px-3 py-2 text-sm">{u.display_name || u.name || "—"}</td>
      <td className="px-3 py-2 text-sm">
        <TextInput value={email} onChange={(e) => setEmail(e.target.value)} />
      </td>
      <td className="px-3 py-2 text-sm">
        <Select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={ROLE_OPTIONS}
        />
      </td>
      <td className="px-3 py-2 text-sm">
        <FeeSplitInput value={feeSplit} onChange={setFeeSplit} />
      </td>
      <td className="px-3 py-2 text-sm">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={STATUS_OPTIONS}
        />
      </td>
      <td className="px-3 py-2 text-sm text-right whitespace-nowrap">
        <Button
          variant="outline"
          className="mr-2"
          onClick={onReset}
          disabled={saving}
        >
          Reset
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </td>
    </tr>
  );
}

export default function AdminUsers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [q, setQ] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const data = await listUsers({ includeInactive });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr(e?.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const needle = q.toLowerCase();
    return rows.filter((u) => {
      const hay =
        `${u.display_name || ""} ${u.name || ""} ${u.email || ""} ${u.role || ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q]);

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Team & Roles</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            Include inactive
          </label>
          <TextInput
            placeholder="Search name/email/role…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 260 }}
          />
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-700 text-xs uppercase">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Fee Split</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-gray-600">
                  Loading users…
                </td>
              </tr>
            ) : err ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-red-600">
                  Failed to load: {err}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-gray-600">
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <UserRow key={u.id} u={u} onRefresh={load} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}




