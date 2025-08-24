// src/layout/Layout.jsx
import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSession } from '@/lib/hooks/useSession';
import FloatingActivityLog from '../components/FloatingActivityLog';
import supabase from '@/lib/supabaseClient';
import { LoadingState } from '@/components/ui/Loaders'; // ✅
import NotificationBell from '@/components/notifications/NotificationBell';


const Layout = () => {
  const { user, loading } = useSession();
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) return <LoadingState label="Loading session…" />; // ✅

  // Role helpers (defensive)
  const role = user?.role ?? 'user';
  const isAdmin = role === 'admin';
  const isReviewer = role === 'reviewer';

  const navItems = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/orders', label: 'Orders' },
    ...(isAdmin ? [{ to: '/clients', label: 'Clients' }] : []),
    // Team: admin-only (optional — tighten access)
    ...(isAdmin ? [{ to: '/users', label: 'Team' }] : []),
    // Reviewer: visible to admin & reviewer
    ...((isAdmin || isReviewer) ? [{ to: '/reviewer', label: 'Reviewer' }] : []),
    // Keep your existing rule: hide Calendar for reviewers
    ...(role !== 'reviewer' ? [{ to: '/calendar', label: 'Calendar' }] : []),
    { to: '/settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="text-lg font-semibold">Falcon Platform</div>
          <nav className="flex items-center gap-2">
          <NotificationBell />
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded px-3 py-2 hover:bg-blue-100 ${
                    isActive ? 'bg-blue-500 text-white' : 'text-gray-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button onClick={logout} className="rounded px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4">
        <Outlet />
      </main>

      {/* Floating activity log (can be toggled off later) */}
      <FloatingActivityLog />
    </div>
  );
};

export default Layout;




