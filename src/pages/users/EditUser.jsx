import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '@/lib/supabaseClient';
import { useSession } from '@/lib/hooks/useSession';

const EditUser = () => {
  const { user: sessionUser } = useSession();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (error) {
        setError(error.message);
      } else {
        setUser(data);
      }
    };

    if (sessionUser?.id) fetchUser();
  }, [sessionUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('users')
      .update({
        display_name: user.display_name || null,
        avatar_url: user.avatar_url || null,
        bio: user.bio || null,
        status: user.status || null,
      })
      .eq('id', sessionUser.id);

    setSaving(false);

    if (error) {
      alert('Failed to save: ' + error.message);
    } else {
      navigate('/users'); // or `/profile`
    }
  };

  if (!user) return <p className="p-4">Loading profile...</p>;
  if (error) return <p className="text-red-600 p-4">Error: {error}</p>;

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-6 bg-white shadow rounded space-y-4">
      <h1 className="text-2xl font-bold">Edit My Profile</h1>

      <fieldset disabled className="space-y-2 text-sm text-gray-600">
        <div>
          <span className="block font-medium">Full Name</span>
          <div className="mt-1">{user.name}</div>
        </div>
        <div>
          <span className="block font-medium">Email</span>
          <div className="mt-1">{user.email}</div>
        </div>
        <div>
          <span className="block font-medium">Role</span>
          <div className="mt-1 capitalize">{user.role}</div>
        </div>
        <div>
          <span className="block font-medium">Fee Split</span>
          <div className="mt-1">{user.split ? `${user.split}%` : '—'}</div>
        </div>
      </fieldset>

      <hr className="my-4" />

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
          placeholder="https://..."
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
          placeholder="🧠 Working on Dayton Portfolio"
          className="mt-1 block w-full border px-3 py-2 rounded"
        />
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
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

export default EditUser;




