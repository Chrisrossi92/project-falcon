import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import supabase from '@/lib/supabaseClient'
import { useRole } from '@/lib/hooks/useRole'

/**
 * Usage:
 * <ProtectedRoute>...</ProtectedRoute>               // auth only
 * <ProtectedRoute roles={['admin','manager']}>...</ProtectedRoute> // role-gated
 */
export default function ProtectedRoute({ children, roles }) {
  const [authLoading, setAuthLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const { role, loading: roleLoading } = useRole()

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setAuthed(!!data.session)
      setAuthLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session)
    })
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [])

  if (authLoading || (roles && roleLoading)) return null

  if (!authed) return <Navigate to="/login" replace />

  if (roles && !roles.map(r => r.toLowerCase()).includes((role || '').toLowerCase())) {
    // Not authorized for this route
    return <Navigate to="/dashboard" replace />
  }

  return children
}
