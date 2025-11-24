import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (employeeCodeOrUsername: string, password: string) => {
    try {
      // Check if input is an email
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employeeCodeOrUsername);

      if (isEmail) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: employeeCodeOrUsername,
          password
        });

        if (error) {
          toast.error('Invalid credentials');
          return { error };
        }

        toast.success('Welcome back!');
        return { data };
      }

      // Check if it's admin login (using email)
      if (employeeCodeOrUsername === 'admin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'admin@temp.local',
          password
        });

        if (error) {
          toast.error('Invalid credentials');
          return { error };
        }

        toast.success('Welcome back, Admin!');
        return { data };
      }

      // Otherwise, login with employee code using edge function
      const { data, error } = await supabase.functions.invoke('login-with-employee-code', {
        body: { employeeCode: employeeCodeOrUsername, password }
      });

      if (error || data?.error) {
        toast.error('Invalid employee code or password');
        return { error: error || data?.error };
      }

      // Set the session from the edge function response
      if (data?.session) {
        await supabase.auth.setSession(data.session);
        toast.success('Welcome back!');
        return { data };
      }

      return { error: { message: 'Login failed' } };
    } catch (err) {
      toast.error('Failed to sign in');
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      // Clear all local storage first
      localStorage.clear();
      sessionStorage.clear();
      
      // Try to sign out from Supabase
      await supabase.auth.signOut();
      
      // Reset state
      setUser(null);
      setSession(null);
      
      toast.success('Signed out successfully');
    } catch (error) {
      // Even if signOut fails, clear local state
      setUser(null);
      setSession(null);
      console.error('Sign out error:', error);
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signOut
  };
};
