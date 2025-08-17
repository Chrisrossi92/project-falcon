// src/pages/AdminUsers.jsx
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import supabase from '@/lib/supabaseClient'

const ROLES = ['owner', 'admin', 'manager', 'reviewer', 'appraiser']
const STATUSES = ['active', 'inactive']

function RoleSelect({ value, onChange }) {
  return (
    <select className="border rounded px-2 py-1 text-sm" value={value ?? ''} onChange={(e)=>onChange(e.target.value)}>
      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
    </select>
  )
}

function StatusSelect({ value, onChange }) {
  return (
    <select className="border rounded px-2 py-1 text-sm" value={value ?? 'active'} onChange={(e)=>onChange(e.target.value)}>
      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  )
}

export default function AdminUsers() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, email, name, display_name, phone, role, status, split')
          .order('name', { ascending: true })
        if (error) throw error
        if (mounted) setRows(data || [])
      } catch (e) {
        setError(e.message || 'Failed to load users')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const saveRow = async (id, patch) => {
    setBusy(id)
    setOk(null); setError(null)
    try {
      const { error } = await supabase.from('users').update(patch).eq('id', id)
      if (error) throw error
      setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
      setOk('Saved')
      setTimeout(()=>setOk(null), 1200)
    } catch (e) {
      setError(e.message || 'Save failed')
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <div className="p-4 text-sm">Loading…</div>
  if (error) return <div className="p-4 text-sm text-red-600">Error: {error}</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Team & Roles</h1>
        <Link to="/users" className="text-sm underline">Back to User Hub</Link>
      </div>

      {ok && <div className="text-sm text-green-700">{ok}</div>}

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Phone</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-left px-3 py-2">Fee Split (%)</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.display_name || u.name || '—'}</td>
                <td className="px-3 py-2">
                  <input
                    className="border rounded px-2 py-1 w-60"
                    defaultValue={u.email || ''}
                    onBlur={e => e.target.value !== (u.email || '') && saveRow(u.id, { email: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2">{u.phone || '—'}</td>
                <td className="px-3 py-2">
                  <RoleSelect value={u.role} onChange={(role)=>saveRow(u.id, { role })} />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0} max={100} step={1}
                    className="border rounded px-2 py-1 w-24"
                    defaultValue={u.split ?? 50}
                    onBlur={e => {
                      const v = e.target.value === '' ? null : Number(e.target.value)
                      if (v !== u.split) saveRow(u.id, { split: v })
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <StatusSelect value={u.status || 'active'} onChange={(status)=>saveRow(u.id, { status })} />
                </td>
                <td className="px-3 py-2">{busy === u.id && <span className="text-xs">Saving…</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


