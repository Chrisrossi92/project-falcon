import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';
import AdminDashboard from './AdminDashboard';
import AppraiserDashboard from './AppraiserDashboard';

export default function Dashboard() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        console.error('Error fetching user:', error);
        setRole(null);
        setLoading(false);
        return;
      }

      // If using metadata
      const userRole = user.user_metadata?.role;

      // Alternatively, fetch from 'users' table:
      // const { data, error } = await supabase.from('users').select('role').eq('id', user.id).single();
      // const userRole = data?.role;

      setRole(userRole);
      setLoading(false);
    };

    fetchRole();
  }, []);

  if (loading) return <div className="p-4 text-gray-500">Loading dashboard...</div>;

  if (role === 'admin') return <AdminDashboard />;
  if (role === 'appraiser') return <AppraiserDashboard />;

  return <div className="p-4 text-red-500">Unauthorized or unknown role.</div>;
}
