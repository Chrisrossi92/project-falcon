import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import { useSession } from '@/lib/hooks/useSession';
import UsersTable from "@/components/users/UsersTable";

const Users = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("name");

      if (error) setError("Failed to load users.");
      else setUsers(data);

      setLoading(false);
    };

    fetchUsers();
  }, []);

  if (!user) return <p className="p-4">Loading user profile...</p>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Users</h1>
        {user.role === "admin" && (
          <button
            onClick={() => navigate("/users/new")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Add User
          </button>
        )}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : users.length === 0 ? (
        <p className="text-gray-600">No users found.</p>
      ) : (
        <UsersTable users={users} />
      )}
    </div>
  );
};

export default Users;



