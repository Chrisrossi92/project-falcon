import React, { useState } from 'react'; // Remove useEffect if not needed elsewhere
import supabase from '@/lib/supabaseClient';
import AdminDashboard from './AdminDashboard';
import AppraiserDashboard from './AppraiserDashboard';
import { useRole } from '@/lib/hooks/useRole'; // Import the new hook

export default function Dashboard() {
  const { role, loading, error } = useRole(); // Use the hook here

  if (loading) return <div>Loading dashboard...</div>;

  if (error) return <div>Error fetching role: {error}</div>;

  if (role === 'admin') return <AdminDashboard />;

  if (role === 'appraiser') return <AppraiserDashboard />;

  return <div>Unauthorized or unknown role.</div>;
}
