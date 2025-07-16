// src/routes/index.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Orders from '../pages/Orders';
import Clients from '../pages/Clients';
import Users from '../pages/Users';
import Calendar from '../pages/Calendar';
import Login from '../pages/Login';
import EditClient from '../pages/EditClient';
import UserDetail from '../pages/UserDetail';
import OrderDetail from '../pages/OrderDetail';
import OrderDetailForm from '../pages/OrderDetailForm';
import AdminDashboard from '../pages/AdminDashboard';
import AppraiserDashboard from '../pages/AppraiserDashboard';
import ClientDetail from '../pages/ClientDetail';
import Layout from '../layout/Layout';
import { useSession } from '@/lib/hooks/useSession';
import NewOrder from '@/pages/NewOrder';
import ProtectedRoute from '@/lib/hooks/ProtectedRoute'; // Add this (adjust alias if needed)

const ProtectedRoutes = () => {
  const { user, loading } = useSession();

  if (loading) return <div className="p-6">Checking session...</div>;

  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />
      {/* Protected app */}
      {user ? (
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route
            path="dashboard"
            element={user.role === 'admin' ? <AdminDashboard /> : <AppraiserDashboard />}
          />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="orders/:id/edit" element={<OrderDetailForm />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
          <Route path="/orders/new" element={<NewOrder />} />

          {/* Role-guarded routes */}
          <Route
            path="clients"
            element={
              <ProtectedRoute roles={['admin']}>
                <Clients />
              </ProtectedRoute>
            }
          />
          <Route
            path="clients/:clientId"
            element={
              <ProtectedRoute roles={['admin']}>
                <ClientDetail />
              </ProtectedRoute>
            }
          />
          <Route
  path="clients/edit/:clientId"
  element={
    <ProtectedRoute roles={['admin']}>
      <EditClient />
    </ProtectedRoute>
  }
/>
          <Route
            path="users"
            element={
              <ProtectedRoute roles={['admin']}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="users/:userId"
            element={
              <ProtectedRoute roles={['admin']}>
                <UserDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="users/new"
            element={
              <ProtectedRoute roles={['admin']}>
                <UserDetail />
              </ProtectedRoute>
            }
          />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" />} />
      )}
    </Routes>
  );
};

export default ProtectedRoutes;



