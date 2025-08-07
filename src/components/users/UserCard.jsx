import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/lib/hooks/useSession';

export default function UserCard({ user }) {
  const navigate = useNavigate();
  const { user: sessionUser } = useSession();

  const {
    id,
    name,
    display_name,
    role,
    avatar_url,
  } = user;

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const avatar = avatar_url
    ? avatar_url
    : `https://api.dicebear.com/7.x/initials/svg?seed=${display_name || name}`;

  const isSelf = sessionUser?.id === id;
  const isAdmin = sessionUser?.role === 'admin';

  const handleClick = () => {
    if (isAdmin) {
      navigate(`/users/${id}`);
    } else if (isSelf) {
      navigate(`/profile/edit`);
    } else {
      navigate(`/users/view/${id}`);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-4 w-full max-w-md h-44 flex flex-col justify-between hover:shadow-lg transition">
      <div className="flex items-center gap-4 mb-2">
        <img
          src={avatar}
          alt="User Avatar"
          className="w-14 h-14 rounded-full border object-cover"
        />
        <div>
          <h2 className="text-lg font-semibold leading-tight">
            {display_name || name}
          </h2>
          <p className="text-xs text-gray-500 capitalize">{role}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleClick}
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 text-sm"
        >
          {isAdmin ? 'Edit Details' : isSelf ? 'Edit My Profile' : 'View Profile'}
        </button>
      </div>
    </div>
  );
}



