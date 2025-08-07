import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '@/lib/supabaseClient';
import { useSession } from '@/lib/hooks/useSession';

const UserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: sessionUser } = useSession();
  const isSelf = sessionUser?.id === userId;

  const [user, setUser] = useState({
    name: '',
    email: '',
    role: '',
    split: '',
    display_name: '',
    avatar_url: '',
    bio: '',
    status: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const isNew = userId === 'new';

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

    const basePayload = {
      name: user.name,
      email: user.email,
      role: user.role,
      split: parseFloat(user.split || 0),
    };

    const socialPayload = isSelf
      ? {
          display_name: user.display_name || null,
          avatar_url: user.avatar_url || null,
          bio: user.bio || null,
          status: user.status || null,
        }
      : {};

    const payload = { ...basePayload, ...socialPayload };

    const action = isNew
      ? supabase.from('users').insert([payload])
      : supabase.from('users').update(payload).eq('id', userId);

    const { error } = await action;
    setSaving(false);

    if (error) setError(error);
    else navigate('/users');
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

      {/* Core Fields (always editable) */}
      <label className="block">
        <span className="text-sm font-medium">Full Name</span>
        <input
          name="name"
          value={user.name || ''}
          onChange={handleChange}
          className="mt-1 block w-full border px-3 py-2 rounded"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          name="email"
          value={user.email || ''}
          onChange={handleChange}
          className="mt-1 block w-full border px-3 py-2 rounded"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Role</span>
        <select
          name="role"
          value={user.role || ''}
          onChange={handleChange}
          className="mt-1 block w-full border px-3 py-2 rounded"
        >
          <option value="">-- Select --</option>
          <option value="admin">Admin</option>
          <option value="appraiser">Appraiser</option>
          <option value="reviewer">Reviewer</option>
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Split (%)</span>
        <input
          type="number"
          name="split"
          value={user.split || ''}
          onChange={handleChange}
          className="mt-1 block w-full border px-3 py-2 rounded"
        />
      </label>

      {/* Editable only if admin is editing self */}
      {isSelf && (
        <>
          <hr className="my-4" />
          <h2 className="text-lg font-semibold text-gray-800">My Public Profile</h2>

          <label className="block">
            <span className="text-sm font-medium">Display Name</span>
            <input
              name="display_name"
              value={user.display_name || ''}
              onChange={handleChange}
              className="mt-1 block w-full border px-3 py-2 rounded"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Avatar URL</span>
            <input
              name="avatar_url"
              value={user.avatar_url || ''}
              onChange={handleChange}
              className="mt-1 block w-full border px-3 py-2 rounded"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Bio</span>
            <textarea
              name="bio"
              value={user.bio || ''}
              onChange={handleChange}
              rows={2}
              className="mt-1 block w-full border px-3 py-2 rounded"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Status</span>
            <input
              name="status"
              value={user.status || ''}
              onChange={handleChange}
              className="mt-1 block w-full border px-3 py-2 rounded"
            />
          </label>
        </>
      )}

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {saving ? 'Saving...' : isNew ? 'Add User' : 'Save Changes'}
        </button>

        {!isNew && (
          <button
            type="button"
            onClick={handleDelete}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Delete
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate('/users')}
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default UserDetail;


