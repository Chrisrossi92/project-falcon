// src/components/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useRole } from '@/lib/hooks/useRole'; // DB-backed role lookup

const Sidebar = () => {
  const { role, loading, error } = useRole();

  return (
    <aside className="w-56 bg-white shadow-md min-h-screen px-4 py-6">
      <div className="text-xl font-bold mb-8">Falcon Platform</div>

      {/* If role is still loading, keep the nav usable */}
      {error && (
        <div className="mb-3 text-sm text-red-600">Role error: {String(error)}</div>
      )}

      <ul className="space-y-2">
        <li>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `block px-4 py-2 rounded hover:bg-gray-200 ${
                isActive ? 'bg-gray-300 font-semibold' : ''
              }`
            }
          >
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/orders"
            className={({ isActive }) =>
              `block px-4 py-2 rounded hover:bg-gray-200 ${
                isActive ? 'bg-gray-300 font-semibold' : ''
              }`
            }
          >
            Orders
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/clients"
            className={({ isActive }) =>
              `block px-4 py-2 rounded hover:bg-gray-200 ${
                isActive ? 'bg-gray-300 font-semibold' : ''
              }`
            }
          >
            Clients
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/users"
            className={({ isActive }) =>
              `block px-4 py-2 rounded hover:bg-gray-200 ${
                isActive ? 'bg-gray-300 font-semibold' : ''
              }`
            }
          >
            Users
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `block px-4 py-2 rounded hover:bg-gray-200 ${
                isActive ? 'bg-gray-300 font-semibold' : ''
              }`
            }
          >
            Calendar
          </NavLink>
        </li>

        {/* Admin section (only for admin/manager) */}
        {!loading && ['admin', 'manager'].includes(role) && (
          <>
            <li className="pt-4 text-xs uppercase tracking-wide text-gray-500">
              Admin
            </li>
            <li>
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `block px-4 py-2 rounded hover:bg-gray-200 ${
                    isActive ? 'bg-gray-300 font-semibold' : ''
                  }`
                }
              >
                Team &amp; Roles
              </NavLink>
            </li>
          </>
        )}
      </ul>

      <div className="mt-10">
        <NavLink to="/login" className="text-sm text-gray-500 hover:underline">
          Log out
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;


