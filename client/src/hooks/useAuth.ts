import { useEffect, useState, useCallback, useRef } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useToast } from '@/hooks/use-toast'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: Error | null
}

const SESSION_CHECK_TIMEOUT = 2000; // 2 seconds timeout for initial session check
const RECOVERY_INTERVAL = 1000; // 1 second between recovery attempts
const MAX_RECOVERY_ATTEMPTS = 3;

export function useAuth() {
  const { toast } = useToast()
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  })
  
  // Refs for cleanup and state tracking
  const timeoutRef = useRef<number>();
  const recoveryAttempts = useRef(0);
  const mounted = useRef(true);
  const isRecovering = useRef(false);

  // Session recovery mechanism
  const recoverSession = useCallback(async () => {
    if (!mounted.current || isRecovering.current) return;
    
    try {
      isRecovering.current = true;
      console.log('[Auth] Attempting session recovery');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (session?.user) {
        console.log('[Auth] Session recovered successfully');
        setAuthState(prev => ({
          ...prev,
          session,
          user: session.user,
          loading: false,
          error: null
        }));
        
        // Cache recovered session
        localStorage.setItem('lastKnownUser', JSON.stringify({
          id: session.user.id,
          email: session.user.email,
          timestamp: Date.now(),
        }));
      } else {
        console.warn('[Auth] No session found during recovery');
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: new Error('No session available')
        }));
      }
    } catch (error) {
      console.error('[Auth] Recovery attempt failed:', error);
      recoveryAttempts.current++;
      
      if (recoveryAttempts.current < MAX_RECOVERY_ATTEMPTS) {
        // Schedule another recovery attempt
        setTimeout(recoverSession, RECOVERY_INTERVAL);
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error as Error
        }));
        toast({
          title: "Session Error",
          description: "Unable to restore your session. Please try logging in again.",
          variant: "destructive",
        });
      }
    } finally {
      isRecovering.current = false;
    }
  }, [toast]);

  // Get initial session with improved error handling
  useEffect(() => {
    const getInitialSession = async () => {
      try {
        // Set timeout for initial session check
        timeoutRef.current = window.setTimeout(() => {
          if (mounted.current && authState.loading) {
            console.error('[Auth] Initial session check timeout');
            recoverSession();
          }
        }, SESSION_CHECK_TIMEOUT);

        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error;
        
        if (!mounted.current) return;

        if (session?.user) {
          console.log('[Auth] Initial session established:', session.user.id);
          setAuthState(prev => ({
            ...prev,
            session,
            user: session.user,
            loading: false,
          }));

          localStorage.setItem('lastKnownUser', JSON.stringify({
            id: session.user.id,
            email: session.user.email,
            timestamp: Date.now(),
          }));
        } else {
          console.log('[Auth] No initial session found');
          setAuthState(prev => ({
            ...prev,
            loading: false,
          }));
        }
      } catch (error) {
        console.error('[Auth] Initial session error:', error);
        if (!mounted.current) return;
        
        // Attempt recovery on initial failure
        recoverSession();
      } finally {
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
        }
      }
    };

    getInitialSession();

    // Enhanced auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] State changed:', event, session?.user?.id);
        
        if (!mounted.current) return;
        
        if (session?.user) {
          setAuthState(prev => ({
            ...prev,
            session,
            user: session.user,
            loading: false,
            error: null,
          }));

          localStorage.setItem('lastKnownUser', JSON.stringify({
            id: session.user.id,
            email: session.user.email,
            timestamp: Date.now(),
          }));
        } else {
          // Verify session loss with a getSession call
          const { data: { session: verifySession } } = await supabase.auth.getSession();
          
          if (verifySession?.user) {
            // Session exists but event didn't have it - recover
            console.warn('[Auth] Session verification mismatch - recovering');
            recoverSession();
          } else {
            // Confirmed no session
            setAuthState(prev => ({
              ...prev,
              session: null,
              user: null,
              loading: false,
            }));
            localStorage.removeItem('lastKnownUser');
          }
        }
      }
    );

    // Cleanup
    return () => {
      mounted.current = false;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, [recoverSession]);

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;

      // Verify session exists after signup
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!session) {
        throw new Error('No session after signup');
      }

      return data;
    } catch (error) {
      console.error('[Auth] Signup error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Verify session after signin
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!session) {
        throw new Error('No session after signin');
      }

      return data;
    } catch (error) {
      console.error('[Auth] Signin error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear local storage
      localStorage.removeItem('lastKnownUser');
      
      // Verify signout
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.warn('[Auth] Session persisted after signout - forcing cleanup');
        setAuthState(prev => ({
          ...prev,
          session: null,
          user: null,
          loading: false,
        }));
      }
    } catch (error) {
      console.error('[Auth] Signout error:', error);
      throw error;
    }
  };

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
  };
} 