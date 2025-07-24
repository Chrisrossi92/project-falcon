// src/lib/hooks/useSession.js
import { internalUseUser } from '@/context/UserContext';

/**
 * useSession is a centralized hook to access the authenticated user and loading state.
 * It ensures consistent handling of session-dependent logic across the app.
 */
export const useSession = () => {
  const { user, loading } = internalUseUser();
  console.log('Current user:', user); // Add this
  return {
    user,
    loading,
    isLoggedIn: !!user,
    isAdmin: user?.role === 'admin',
    isAppraiser: user?.role === 'appraiser',
    isReviewer: user?.role === 'reviewer',
  };
};
