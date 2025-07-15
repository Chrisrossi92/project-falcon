import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import supabase from '@/lib/supabaseClient';
import { useSessionContext } from '@supabase/auth-helpers-react';

export default function Login() {
  const { session } = useSessionContext();
  const user = session?.user;
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
  <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
    <div className="login-container fade-in">
      {/* Logo with larger size */}
      <div className="flex justify-center mb-6">
  <img src="/assets/logo.png" alt="Falcon Logo" className="h-16 w-auto" />
</div>

        <h1 className="text-2xl mb-2 text-center">
          Sign in to Falcon
        </h1>

        <p className="mb-6 text-center">
          Use your work email to sign in.
        </p>

        {/* Supabase Auth Form */}
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
          className="space-y-4" // Add spacing between form elements
        />

        <p className="mt-4 text-center">
          <a href="/forgot-password" className="login-link">Forgot your password?</a>
        </p>
        <p className="mt-2 text-center">
          Don't have an account? <a href="/signup" className="login-link">Sign up</a>
        </p>
      </div>
    </div>
  );
}



