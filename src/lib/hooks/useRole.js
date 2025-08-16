// src/lib/hooks/useRole.js
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'

export function useRole() {
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (mounted) { setRole(null); setLoading(false) } ; return }

        // Try to fetch by the auth linkage
        let { data, error, status } = await supabase
          .from('users')
          .select('id, role, email')
          .eq('auth_id', user.id)
          .maybeSingle() // ← avoids 406 on 0 or >1

        // If missing, self-create a minimal row then re-read
        if (!data && !error) {
          const up = await supabase
            .from('users')
            .upsert([{
              id: user.id,
              auth_id: user.id,
              email: user.email,
              name: user.user_metadata?.name || (user.email || '').split('@')[0] || 'User',
              role: 'appraiser',
              status: 'active'
            }], { onConflict: 'auth_id' })
          if (up.error) throw up.error

          const re = await supabase
            .from('users')
            .select('id, role, email')
            .eq('auth_id', user.id)
            .maybeSingle()
          data = re.data; error = re.error
        }

        if (error) throw error
        const normalized = (data?.role || '').toString().trim().toLowerCase()
        if (mounted) setRole(normalized || null)
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to fetch role')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  return { role, loading, error }
}


