// src/components/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  return (
    <aside className="w-56 bg-white shadow-md min-h-screen px-4 py-6">
      <div className="text-xl font-bold mb-8">Falcon Platform</div>
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

