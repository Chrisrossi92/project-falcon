// App.jsx
import React from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import supabase from './lib/supabaseClient';
import ProtectedRoutes from './routes';
import { Toaster } from 'react-hot-toast'; // ✅ Add this

function App() {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <Toaster position="top-right" reverseOrder={false} /> {/* ✅ Add this */}
      <ProtectedRoutes />
    </SessionContextProvider>
  );
}

export default App;























