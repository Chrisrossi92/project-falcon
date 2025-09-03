// src/components/LicenseEditor.jsx
import React, { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'

export default function LicenseEditor({ userId }) {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ state:'', number:'', type:'', expires_at:'' })

  useEffect(() => {
    supabase.from('appraiser_licenses')
      .select('*').eq('user_id', userId).order('expires_at', { ascending: true })
      .then(({ data }) => setRows(data || []))
  }, [userId])

  const add = async () => {
    const payload = { ...form, user_id: userId }
    const { data, error } = await supabase.from('appraiser_licenses').insert(payload).select('*').single()
    if (!error) setRows(prev => [...prev, data])
    setForm({ state:'', number:'', type:'', expires_at:'' })
  }

  const del = async (id) => {
    await supabase.from('appraiser_licenses').delete().eq('id', id)
    setRows(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-3">
      <div className="font-medium">Licenses</div>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="flex items-center gap-2">
            <div className="w-24">{r.state}</div>
            <div className="w-48">{r.number}</div>
            <div className="w-48">{r.type || '—'}</div>
            <div className="w-40">{r.expires_at || '—'}</div>
            <button className="text-sm text-red-600" onClick={()=>del(r.id)}>Delete</button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <input className="border rounded px-2 py-1 w-24" placeholder="State" value={form.state} onChange={e=>setForm(f=>({...f, state:e.target.value}))}/>
        <input className="border rounded px-2 py-1 w-48" placeholder="Number" value={form.number} onChange={e=>setForm(f=>({...f, number:e.target.value}))}/>
        <input className="border rounded px-2 py-1 w-48" placeholder="Type" value={form.type} onChange={e=>setForm(f=>({...f, type:e.target.value}))}/>
        <input className="border rounded px-2 py-1 w-40" type="date" value={form.expires_at || ''} onChange={e=>setForm(f=>({...f, expires_at:e.target.value}))}/>
        <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={add}>Add</button>
      </div>
    </div>
  )
}

// TODO: wire license mgmt