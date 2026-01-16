import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string, role: string, yearOfBirth?: number, postalAddress?: string, city?: string, state?: string, zone?: string, country?: string, latitude?: number, longitude?: number) => Promise<{ error: any; isDuplicate?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user role and check if blocked when session changes
        if (session?.user) {
          setTimeout(async () => {
            // Check if user is blocked
            const { data: profileData } = await supabase
              .from('profiles')
              .select('blocked_at')
              .eq('id', session.user.id)
              .single();
            
            if (profileData?.blocked_at) {
              // User is blocked, sign them out
              await supabase.auth.signOut();
              setUserRole(null);
              return;
            }

            const { data } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id);
            
            // Check if user has super_admin role, otherwise use first role
            const roles = data?.map(r => r.role) ?? [];
            const role = roles.includes('super_admin') ? 'super_admin' 
                       : roles.includes('admin') ? 'admin'
                       : roles[0] ?? null;
            setUserRole(role);
          }, 0);
        } else {
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .then(({ data }) => {
            const roles = data?.map(r => r.role) ?? [];
            const role = roles.includes('super_admin') ? 'super_admin' 
                       : roles.includes('admin') ? 'admin'
                       : roles[0] ?? null;
            setUserRole(role);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phone: string, role: string, yearOfBirth?: number, postalAddress?: string, city?: string, state?: string, zone?: string, country?: string, latitude?: number, longitude?: number) => {
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const redirectUrl = `${baseUrl}/dashboard`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          phone: phone,
          role: role,
          year_of_birth: yearOfBirth,
          postal_address: postalAddress,
          city: city,
          state: state,
          zone: zone,
          country: country,
          latitude: latitude,
          longitude: longitude,
          profile_completed: true
        }
      }
    });

    // Check if user already exists (Supabase returns success but with identities array empty for existing users)
    const isDuplicate = !error && data.user && (!data.user.identities || data.user.identities.length === 0);

    return { error, isDuplicate };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      // Log session start
      await (supabase.from('session_logs') as any).insert({
        user_id: data.user.id,
        login_at: new Date().toISOString(),
      });
      navigate('/dashboard');
    }

    return { error };
  };

  const signOut = async () => {
    try {
      // Update session log with logout time (best effort, don't block logout)
      if (user) {
        try {
          const { data: latestSession } = await (supabase
            .from('session_logs') as any)
            .select('id, login_at')
            .eq('user_id', user.id)
            .is('logout_at', null)
            .order('login_at', { ascending: false })
            .limit(1)
            .single();

          if (latestSession) {
            const loginAt = new Date(latestSession.login_at);
            const logoutAt = new Date();
            const durationMinutes = Math.round((logoutAt.getTime() - loginAt.getTime()) / 60000);

            await (supabase
              .from('session_logs') as any)
              .update({
                logout_at: logoutAt.toISOString(),
                session_duration_minutes: durationMinutes,
              })
              .eq('id', latestSession.id);
          }
        } catch (sessionLogError) {
          // Ignore session log errors - don't block logout
          console.warn('Failed to update session log:', sessionLogError);
        }
      }

      // Attempt Supabase signout - may fail if session already expired
      const { error } = await supabase.auth.signOut();
      
      // Even if signOut fails (e.g., session_not_found), clear local state
      if (error) {
        console.warn('SignOut warning:', error.message);
      }
    } catch (err) {
      // Catch any unexpected errors
      console.warn('SignOut error:', err);
    } finally {
      // Always clear local state and redirect, regardless of Supabase response
      setUser(null);
      setSession(null);
      setUserRole(null);
      navigate('/auth');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};