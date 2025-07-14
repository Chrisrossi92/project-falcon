
// src/pages/UserDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../lib/supabaseClient';

const UserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const isNew = userId === 'new';

  const [user, setUser] = useState({
    name: '',
    email: '',
    role: '',
    split: ''
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isNew) {
      const fetchUser = async () => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        if (error) setError(error);
        else setUser(data);
        setLoading(false);
      };
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [userId, isNew]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...user,
      split: parseFloat(user.split || 0)
    };
    const { id, ...cleanedPayload } = payload;
    const action = isNew
      ? supabase.from('users').insert([cleanedPayload]).select()
      : supabase.from('users').update(cleanedPayload).eq('id', userId).select();
    const { error } = await action;
    if (error) setError(error);
    else navigate('/users');
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (!error) navigate('/users');
  };

  if (loading) return <p className="p-4">Loading user...</p>;
  if (error) return <p className="p-4 text-red-600">Error: {error.message}</p>;

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-6 bg-white shadow rounded space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? 'Add New User' : `Edit ${user.name}`}</h1>

      <label className="block">
        <span className="text-sm font-medium">Name</span>
        <input name="name" value={user.name || ''} onChange={handleChange} className="mt-1 block w-full border px-3 py-2 rounded" />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input name="email" value={user.email || ''} onChange={handleChange} className="mt-1 block w-full border px-3 py-2 rounded" />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Role</span>
        <select name="role" value={user.role || ''} onChange={handleChange} className="mt-1 block w-full border px-3 py-2 rounded">
          <option value="">-- Select --</option>
          <option value="admin">Admin</option>
          <option value="appraiser">Appraiser</option>
          <option value="reviewer">Reviewer</option>
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Split (%)</span>
        <input type="number" name="split" value={user.split || ''} onChange={handleChange} className="mt-1 block w-full border px-3 py-2 rounded" />
      </label>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          {saving ? 'Saving...' : isNew ? 'Add User' : 'Save Changes'}
        </button>
        {!isNew && (
          <button type="button" onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            Delete
          </button>
        )}
        <button type="button" onClick={() => navigate('/users')} className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400">
          Cancel
        </button>
      </div>
    </form>
  );
};

export default UserDetail;
