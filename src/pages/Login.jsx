import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import supabase from '@/lib/supabaseClient';
import { useSessionContext } from '@supabase/auth-helpers-react';

export default function Login() {
  const { session } = useSessionContext();
  const user = session?.user;
  const navigate = useNavigate(); // ✅ required

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-6 text-center text-gray-800">
          Sign in to Falcon
        </h1>

        {/* ✅ DEBUG FALLBACK */}
        <p className="text-sm text-center text-gray-500 mb-4">
          If you see this, the Login component is rendering properly.
        </p>

        {/* ✅ DEBUG BORDER */}
        <div style={{ border: '2px dashed red', padding: '1rem' }}>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            theme="light"
            providers={[]} // Email/password only
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Your work email',
                  password_label: 'Your password',
                  button_label: 'Sign In',
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}



