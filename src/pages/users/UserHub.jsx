import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '@/lib/hooks/useSession';
import supabase from '@/lib/supabaseClient';

const UserHub = () => {
  const { userId } = useParams();
  const { user: sessionUser } = useSession();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const isSelf = sessionUser?.id === userId;
  const isAdmin = sessionUser?.role === 'admin';

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) setError(error.message);
      else setUser(data);
    };

    if (userId) fetchUser();
  }, [userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({
        display_name: user.display_name || null,
        avatar_url: user.avatar_url || null,
        bio: user.bio || null,
        status: user.status || null,
      })
      .eq('id', userId);

    setSaving(false);
    if (!error) alert('Profile updated.');
    else alert('Failed to save: ' + error.message);
  };

  if (error) return <p className="text-red-600 p-4">Error: {error}</p>;
  if (!user) return <p className="p-4">Loading user...</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow space-y-4">
      <div className="flex items-center gap-4">
        <img
          src={
            user.avatar_url ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${user.display_name || user.name}`
          }
          alt="Avatar"
          className="w-20 h-20 rounded-full border object-cover"
        />
        <div>
          <h1 className="text-2xl font-bold">
            {user.display_name || user.name}
          </h1>
          <p className="text-gray-500 capitalize">{user.role}</p>
          {user.status && <p className="italic text-gray-700 mt-1">“{user.status}”</p>}
        </div>
      </div>

      {user.bio && (
        <div>
          <h3 className="font-semibold text-sm text-gray-600 mb-1">Bio</h3>
          <p className="text-sm text-gray-800">{user.bio}</p>
        </div>
      )}

      <hr className="my-4" />

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="block font-medium text-gray-600">Full Name</span>
          <p>{user.name}</p>
        </div>
        <div>
          <span className="block font-medium text-gray-600">Email</span>
          <p>{user.email}</p>
        </div>
        <div>
          <span className="block font-medium text-gray-600">Role</span>
          <p className="capitalize">{user.role}</p>
        </div>
        {isAdmin || isSelf ? (
          <div>
            <span className="block font-medium text-gray-600">Split</span>
            <p>{user.split ? `${user.split}%` : '—'}</p>
          </div>
        ) : null}
      </div>

      {isSelf && (
        <>
          <hr className="my-4" />
          <h3 className="font-semibold text-lg">Edit My Profile</h3>
          <div className="space-y-3">
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

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-2"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default UserHub;
