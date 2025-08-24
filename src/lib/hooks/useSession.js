// src/lib/hooks/useSession.js
import { internalUseUser } from '@/context/UserContext';

export const useSession = () => {
  const { user, loading } = internalUseUser();
  const role = (user?.role || '').toString().toLowerCase();

  return {
    user,
    loading,
    isLoggedIn: !!user,
    isAdmin: role === 'admin' || role === 'owner' || role === 'manager',
    isReviewer: role === 'reviewer',
    isAppraiser: role === 'appraiser',
  };
};

