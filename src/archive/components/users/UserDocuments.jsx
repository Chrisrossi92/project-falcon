// src/components/UserDocuments.jsx
import React, { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'

export default function UserDocuments({ userId }) {
  const [rows, setRows] = useState([])
  const [kind, setKind] = useState('resume')
  const [title, setTitle] = useState('')

  useEffect(() => {
    supabase.from('user_documents').select('*').eq('user_id', userId).order('uploaded_at', { ascending: false })
      .then(({ data }) => setRows(data || []))
  }, [userId])

  const upload = async (file) => {
    const path = `users/${userId}/${crypto.randomUUID()}-${file.name}`
    const { error: upErr } = await supabase.storage.from('user-docs').upload(path, file, { upsert: false })
    if (upErr) throw upErr

    const { data, error } = await supabase
      .from('user_documents')
      .insert({ user_id: userId, kind, title: title || file.name, storage_path: path })
      .select('*').single()
    if (error) throw error

    setRows(prev => [data, ...prev])
    setTitle('')
  }

  const remove = async (id, path) => {
    await supabase.from('user_documents').delete().eq('id', id)
    await supabase.storage.from('user-docs').remove([path])
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const download = async (path) => {
    const { data, error } = await supabase.storage.from('user-docs').createSignedUrl(path, 300)
    if (!error) window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="space-y-3">
      <div className="font-medium">Documents</div>

      <div className="flex flex-wrap gap-2 items-center">
        <select className="border rounded px-2 py-1" value={kind} onChange={e=>setKind(e.target.value)}>
          {['resume','w9','eando','cert','other'].map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <input className="border rounded px-2 py-1 w-64" placeholder="Title (optional)" value={title} onChange={e=>setTitle(e.target.value)} />
        <input type="file" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>

      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="flex items-center gap-3">
            <div className="w-24">{r.kind}</div>
            <div className="w-80 truncate">{r.title}</div>
            <button className="text-sm text-blue-600" onClick={()=>download(r.storage_path)}>Open</button>
            <button className="text-sm text-red-600" onClick={()=>remove(r.id, r.storage_path)}>Delete</button>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-gray-500">No documents yet.</div>}
      </div>
    </div>
  )
}
