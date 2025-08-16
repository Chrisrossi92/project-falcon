// src/pages/AdminUsers.jsx
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import supabase from '@/lib/supabaseClient'

const ROLES = ['owner', 'admin', 'manager', 'appraiser', 'reviewer']

function RoleSelect({ value, onChange }) {
  return (
    <select
      className="border rounded px-2 py-1 text-sm"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      {ROLES.map(r => (
        <option key={r} value={r}>{r}</option>
      ))}
    </select>
  )
}

export default function AdminUsers() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        // Load team
        const { data, error } = await supabase
          .from('users')
          .select('id, email, name, display_name, phone, role, status')
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

  const onChangeRole = async (id, role) => {
    setSavingId(id)
    setError(null)
    setOk(null)
    try {
      const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', id)
      if (error) throw error
      setRows(prev => prev.map(r => r.id === id ? { ...r, role } : r))
      setOk('Role updated')
    } catch (e) {
      setError(e.message || 'Update failed')
    } finally {
      setSavingId(null)
      setTimeout(() => setOk(null), 1200)
    }
  }

  if (loading) return <div className="p-4 text-sm">Loading…</div>
  if (error) return <div className="p-4 text-sm text-red-600">Error: {error}</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Team & Roles</h1>
        <Link to="/dashboard" className="text-sm underline">Back to Dashboard</Link>
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
              <th className="text-left px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.display_name || u.name || '—'}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.phone || '—'}</td>
                <td className="px-3 py-2">
                  <RoleSelect
                    value={u.role}
                    onChange={(val) => onChangeRole(u.id, val)}
                  />
                </td>
                <td className="px-3 py-2">{u.status || 'active'}</td>
                <td className="px-3 py-2">
                  {savingId === u.id && <span className="text-xs">Saving…</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

