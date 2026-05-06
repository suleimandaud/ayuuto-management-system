import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshProfile() {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        setSession(null);
        setProfile(null);
        return;
      }

      const currentSession = sessionData.session;
      setSession(currentSession);

      if (!currentSession?.user) {
        setProfile(null);
        return;
      }

      const user = currentSession.user;

      // Try to create/link profile using SQL function.
      // If this fails, the app will continue instead of staying on Loading.
      const { error: rpcError } = await supabase.rpc('sync_my_member_profile');

      if (rpcError) {
        console.error('sync_my_member_profile error:', rpcError);
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error);
        setProfile(null);
        return;
      }

      if (data) {
        setProfile(data as Profile);
        return;
      }

      // Fallback: create profile from email if RPC did not create it.
      const fallbackProfile = {
        id: user.id,
        full_name: user.user_metadata?.full_name ?? '',
        email: user.email ?? null,
        phone: user.phone ?? null,
        role: 'member' as const,
      };

      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .upsert(fallbackProfile, { onConflict: 'id' })
        .select('*')
        .single();

      if (createError) {
        console.error('Profile create error:', createError);
        setProfile(null);
        return;
      }

      setProfile(createdProfile as Profile);
    } catch (err) {
      console.error('refreshProfile crashed:', err);
      setSession(null);
      setProfile(null);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      await refreshProfile();
      if (mounted) setLoading(false);
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      // Delay refresh to avoid auth callback issues.
      setTimeout(async () => {
        if (nextSession?.user) {
          await refreshProfile();
        } else {
          setProfile(null);
        }

        if (mounted) setLoading(false);
      }, 0);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      refreshProfile,
      signOut,
    }),
    [session, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return ctx;
}