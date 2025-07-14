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

const ProtectedRoutes = () => {
  const { user, loading } = useSession();

  if (loading) return <div className="p-6">Checking session...</div>;

  return (
    <Routes>
      {/* 🔓 Public route */}
      <Route path="/login" element={<Login />} />

      {/* 🔐 Protected app */}
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
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:clientId" element={<ClientDetail />} />
          <Route path="clients/new" element={<EditClient />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:userId" element={<UserDetail />} />
          <Route path="users/new" element={<UserDetail />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
          <Route path="/orders/new" element={<NewOrder />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" />} />
      )}
    </Routes>
  );
};

export default ProtectedRoutes;



