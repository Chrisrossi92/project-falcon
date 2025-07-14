import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSession } from '@/lib/hooks/useSession';
import FloatingActivityLog from '../components/FloatingActivityLog'; // ✅ Ensure correct path
import supabase from '@/lib/supabaseClient';

const Layout = () => {
  const { user, loading } = useSession();
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) return null;

  const navItems = [
  { to: '/dashboard', label: 'Dashboard' }, // ✅ Add this
  { to: '/orders', label: 'Orders' },
  ...(user.role === 'admin' ? [{ to: '/clients', label: 'Clients' }] : []),
  ...(user.role === 'admin' ? [{ to: '/users', label: 'Users' }] : []),
  ...(user.role !== 'reviewer' ? [{ to: '/calendar', label: 'Calendar' }] : []),
];

  return (
    <div className="min-h-screen flex bg-gray-100 relative">
      <aside className="w-64 bg-white shadow-md p-4 z-10">
        <h1 className="text-xl font-bold mb-6">Falcon Platform</h1>
        <nav className="flex flex-col space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded hover:bg-blue-100 ${
                  isActive ? 'bg-blue-500 text-white' : 'text-gray-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="mt-10 text-sm text-gray-600 hover:underline"
        >
          Log out
        </button>
      </aside>

      <main className="flex-1 p-6">
        <Outlet />
      </main>

      {/* ✅ Activity log floating outside main layout */}
      <FloatingActivityLog />
    </div>
  );
};

export default Layout;


