// src/components/SidebarLink.jsx
import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const SidebarLink = ({ to, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`block px-4 py-2 rounded-lg font-medium transition-all duration-200 
        ${isActive 
          ? 'bg-blue-100 text-blue-800 shadow-inner' 
          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}
    >
      {label}
    </Link>
  );
};

export default SidebarLink;

