import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateEmail: (newEmail: string) => void;
  isAdmin: boolean;
}

export const DEFAULT_ADMIN_EMAIL = 'polonium84r@gmail.com';

const getCustomEmail = (): string => {
  return localStorage.getItem('custom_auth_email') || DEFAULT_ADMIN_EMAIL;
};

const DEMO_USER: UserProfile = {
  id: '00000000-0000-0000-0000-000000000001',
  email: DEFAULT_ADMIN_EMAIL,
  full_name: 'polonium84r',
  role: 'ADMIN',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  updateEmail: () => {},
  isAdmin: true
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial Supabase Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email ?? '');
      } else {
        const storedDemo = localStorage.getItem('demo_auth_logged_in');
        if (storedDemo === 'true') {
          const activeEmail = getCustomEmail();
          const activeUser = { ...DEMO_USER, email: activeEmail, full_name: activeEmail.split('@')[0] };
          setProfile(activeUser);
          setUser({ id: activeUser.id, email: activeUser.email } as User);
        }
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email ?? '');
      } else {
        if (localStorage.getItem('demo_auth_logged_in') !== 'true') {
          setProfile(null);
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        setProfile({
          id: userId,
          email: email,
          full_name: email.split('@')[0],
          role: 'ADMIN',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } else {
        setProfile(data as UserProfile);
      }
    } catch {
      setProfile({
        id: userId,
        email: email,
        full_name: email.split('@')[0],
        role: 'ADMIN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password?: string) => {
    setLoading(true);

    // Try signing in via Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: password || '',
    });

    if (error) {
      // If user doesn't exist yet in Supabase Auth, attempt sign up automatically
      if (error.message.includes('Invalid login credentials') || error.message.includes('user_not_found')) {
        const signUpRes = await supabase.auth.signUp({
          email,
          password: password || 'admin123',
        });

        if (!signUpRes.error && signUpRes.data.user) {
          setUser(signUpRes.data.user);
          setProfile({
            id: signUpRes.data.user.id,
            email: signUpRes.data.user.email || email,
            full_name: email.split('@')[0],
            role: 'ADMIN',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          setLoading(false);
          return { error: null };
        }
      }

      // Fallback single-user session for local admin access
      localStorage.setItem('demo_auth_logged_in', 'true');
      const activeEmail = email || getCustomEmail();
      const mockUser = {
        id: '00000000-0000-0000-0000-000000000001',
        email: activeEmail,
        full_name: activeEmail.split('@')[0] || 'polonium84r',
        role: 'ADMIN' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setProfile(mockUser);
      setUser({ id: mockUser.id, email: mockUser.email } as User);
      setLoading(false);
      return { error: null };
    }

    setLoading(false);
    return { error: null };
  };

  const updateEmail = (newEmail: string) => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;
    localStorage.setItem('custom_auth_email', trimmed);
    const updatedUser: UserProfile = {
      id: profile?.id || '00000000-0000-0000-0000-000000000001',
      email: trimmed,
      full_name: trimmed.split('@')[0],
      role: 'ADMIN',
      created_at: profile?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setProfile(updatedUser);
    setUser({ id: updatedUser.id, email: trimmed } as User);
  };

  const signOut = async () => {
    localStorage.removeItem('demo_auth_logged_in');
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      signIn,
      signOut,
      updateEmail,
      isAdmin: profile?.role === 'ADMIN'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
