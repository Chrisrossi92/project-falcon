// lib/hooks/useRole.js
import { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import { useSession } from './useSession';

export const useRole = () => {
  const { user } = useSession();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .limit(1);  // Use limit(1) to avoid PGRST116 on multiples

      if (error) {
        console.error('Error fetching role:', error);
        setError(error.message);
      } else if (data.length === 0) {
        console.warn('No role found for user ID:', user.id, ' - Defaulting to "user"');
        setRole('user');  // Default to 'user' for login to work; adjust if needed (e.g., null to block)
      } else {
        if (data.length > 1) {
          console.warn('Multiple roles found for user ID:', user.id, ' - Using first.');
        }
        setRole(data[0]?.role || 'user');  // Default if role is null
      }
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  return { role, loading, error };
};