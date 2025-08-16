import { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'

export default function useIsAdmin() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsAdmin(false); setLoading(false); return }
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      if (!mounted) return
      setIsAdmin(!error && data && ['admin','manager'].includes(data.role))
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [])

  return { isAdmin, loading }
}
