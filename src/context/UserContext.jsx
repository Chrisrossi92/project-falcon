import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '@/lib/supabaseClient';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async () => {
    setLoading(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session || !session.user) {
      setUser(null);
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email)
      .single();

    if (profileError || !profile) {
      console.error('Failed to fetch profile:', profileError);
      setUser(null);
    } else {
      setUser(profile);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadUserProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUserProfile();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const internalUseUser = () => useContext(UserContext);






