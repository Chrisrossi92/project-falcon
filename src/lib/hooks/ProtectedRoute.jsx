import { Navigate } from 'react-router-dom';
import { useSession } from '@/lib/hooks/useSession';

const ProtectedRoute = ({ children, roles = [], redirectTo = '/login' }) => {
  const { user, loading, isLoggedIn } = useSession();

  if (loading) {
    return <div>Loading...</div>; // Or a spinner from lucide-react
  }

  if (!isLoggedIn) {
    return <Navigate to={redirectTo} replace />;
  }

  if (roles.length && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />; // Or a custom unauthorized page
  }

  return children;
};

export default ProtectedRoute;