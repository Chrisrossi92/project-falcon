import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';
import UserCard from '@/components/users/UserCard';
import { Link } from 'react-router-dom';

export default function UsersDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setUsers(data);
      }

      setLoading(false);
    };

    fetchUsers();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Team Members</h1>
        <Link
          to="/users/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          + Add User
        </Link>
      </div>

      {loading && <p>Loading users...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}

      {!loading && users.length === 0 && (
        <p className="text-gray-600">No users found.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {users.map(user => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}




