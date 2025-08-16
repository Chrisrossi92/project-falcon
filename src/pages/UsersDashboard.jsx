import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import supabase from '@/lib/supabaseClient'
import { useRole } from '@/lib/hooks/useRole'

export default function UsersDashboard() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { role, loading: roleLoading } = useRole()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('users')
          .select('id, name, display_name, email, role, avatar_url, status')
          .order('name', { ascending: true })
        if (error) throw error
        if (mounted) setUsers(data || [])
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load users')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Team Members</h1>

        {/* ✅ Admins see Manage Roles link */}
        {!roleLoading && ['admin','manager'].includes((role || '').toLowerCase()) && (
          <Link
            to="/admin/users"
            className="inline-flex items-center px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Manage Roles
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {users.map(u => (
          <div key={u.id} className="border rounded-xl p-4 bg-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center font-semibold">
                {(u.display_name || u.name || u.email || '?')
                  .split(' ')
                  .map(s => s[0]?.toUpperCase())
                  .slice(0,2)
                  .join('')}
              </div>
              <div>
                <div className="font-medium">{u.display_name || u.name || u.email}</div>
                <div className="text-sm text-gray-500">{u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : '—'}</div>
              </div>
            </div>

            <div className="mt-4">
              <Link
                to={`/users/${u.id}`}
                className="inline-flex items-center px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Edit Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}





