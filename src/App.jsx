// App.jsx
import React, { useEffect } from 'react';
import { SessionContextProvider, useUser } from '@supabase/auth-helpers-react';
import supabase from './lib/supabaseClient';
import ProtectedRoutes from './routes';
import { Toaster } from 'react-hot-toast';
import { ensureNotificationPrefs } from '@/lib/bootstrap/ensureNotificationPrefs';

function AppInner() {
  const user = useUser();

  useEffect(() => {
    if (user) {
      ensureNotificationPrefs();
    }
  }, [user]);

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <ProtectedRoutes />
    </>
  );
}

export default function App() {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <AppInner />
    </SessionContextProvider>
  );
}
























