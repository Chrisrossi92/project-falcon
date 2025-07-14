import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '@/lib/hooks/useSession';

const ProtectedRoute = ({ roles = [], redirectTo = '/login' }) => {
  const { user, loading, isLoggedIn } = useSession();

  if (loading) {
    return <div>Loading...</div>; // Or spinner
  }

  if (!isLoggedIn) {
    return <Navigate to={redirectTo} replace />;
  }

  if (roles.length && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />; // Or unauthorized page
  }

  return <Outlet />;
};

export default ProtectedRoute;