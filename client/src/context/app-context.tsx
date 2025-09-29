import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser, getUserProfile } from '@/lib/auth';
import { queryClient } from '@/lib/queryClient';

interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  isNewUser?: boolean;
  onboarded?: boolean;
  genre_preferences?: string[];
}

interface AppContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  setUser: (user: User | null) => void;
}

const defaultContext: AppContextType = {
  user: null,
  isLoading: true,
  error: null,
  setUser: () => {},
};

// Create context with proper typing
const AppContext = createContext<AppContextType>(defaultContext);

// Named export for the hook
export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
}

interface AppContextProviderProps {
  children: ReactNode;
}

// Provider component
export function AppContextProvider({ children }: AppContextProviderProps) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Function to set user data manually (for dev login)
  const setUser = React.useCallback((userData: User | null) => {
    if (userData) {
      console.log('Manually setting user data:', userData);
      setUserState(userData);
      localStorage.setItem('userData', JSON.stringify(userData));
    } else {
      console.log('Clearing user data');
      setUserState(null);
      localStorage.removeItem('userData');
    }
  }, []);
  
  // Check for session on initial load to set auth state
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check for session from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('Initial session check found active session:', session.user.id);
          
          // Store token for API calls
          localStorage.setItem('authToken', session.access_token);
          
          // Set user from session user data
          setUserState({
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.user_metadata?.username,
            full_name: session.user.user_metadata?.full_name,
            avatar_url: session.user.user_metadata?.avatar_url,
            onboarded: session.user.user_metadata?.onboarded || false,
          });
        } else {
          console.log('No active session found in initial check');
          
          // Check if we have stored user data
          const storedUserData = localStorage.getItem('userData');
          if (storedUserData) {
            console.log('Found stored user data, restoring');
            try {
              const userData = JSON.parse(storedUserData);
              setUserState(userData);
            } catch (e) {
              console.error('Error parsing stored user data', e);
              localStorage.removeItem('userData');
            }
          }
        }
      } catch (error) {
        console.error('Error in initial session check:', error);
        setError(error as Error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, []);
  
  // Subscribe to auth changes
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Update user state when signed in or token refreshed
          if (session) {
            console.log('Session active, updating user state');
            
            // Store token for API calls
            localStorage.setItem('authToken', session.access_token);
            
            // Set user from session user data
            setUserState({
              id: session.user.id,
              email: session.user.email || '',
              username: session.user.user_metadata?.username,
              full_name: session.user.user_metadata?.full_name,
              avatar_url: session.user.user_metadata?.avatar_url,
              onboarded: session.user.user_metadata?.onboarded || false,
            });
          }
        } else if (event === 'SIGNED_OUT') {
          // Clear user data on sign out
          console.log('User signed out, clearing data');
          setUserState(null);
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
        }
      }
    );
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  
  // Store user data in localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('userData', JSON.stringify(user));
    }
  }, [user]);
  
  return (
    <AppContext.Provider value={{ user, isLoading, error, setUser }}>
      {children}
    </AppContext.Provider>
  );
}
