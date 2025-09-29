import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { apiRequest } from './queryClient';

// Export auth for direct access
export const auth = supabase.auth;

// Sign up with email and password (creates Supabase auth user)
// Define a type for signup parameters for better type safety
interface SignUpParams {
  username: string;
  email: string;
  password: string;
}

export async function signUp({ username, email, password }: SignUpParams) {
  console.log('[auth.ts] SignUp called with:', { email, username });
  
  try {
    console.log('[auth.ts] Calling supabase.auth.signUp...');
    
    // Log current auth session state
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('[auth.ts] Current auth state:', {
      hasSession: !!sessionData?.session,
      hasAccessToken: !!sessionData?.session?.access_token
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { username },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    }).catch(e => {
      console.error('[auth.ts] Supabase signUp threw error:', e);
      throw e;
    });
    
    console.log('[auth.ts] SignUp raw response:', { data, error });
    
    if (error) {
      console.error('[auth.ts] Supabase signup error:', error);
      throw error;
    }

    // Mark that we're in a signup flow
    localStorage.setItem('newSignup', 'true');
    localStorage.setItem('pendingOnboarding', 'true');

    // Store the session token if we got one
    if (data?.session?.access_token) {
      localStorage.setItem('authToken', data.session.access_token);
    }

    return { data, error };
  } catch (e) {
    console.error('[auth.ts] SignUp threw error:', e);
    throw e;
  }
}

// Sign in with email and password
export type SignInParams = {
  email: string;
  password: string;
};

export async function signIn({ email, password }: { email: string; password: string }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

// Sign out current user
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// Get current session
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { data, error };
}

// Get user profile from our API that combines auth user and profile data
export async function getUserProfile() {
  try {
    // First try to get an active Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('No session found in getUserProfile');
      
      // Check if we have a stored token as fallback
      const storedToken = localStorage.getItem('authToken');
      if (!storedToken) {
        // Clear any stale user data
        localStorage.removeItem('userData');
        return null;
      }
      
      console.log('Using stored token as fallback');
      
      // Try with stored token
      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      // Log complete response info for debugging
      console.log(`Token-based profile fetch response: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        console.log(`Profile fetch failed with status: ${response.status}`);
        // Clear invalid token
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        // Force a reload to reset app state if user was previously authenticated
        if (localStorage.getItem('wasAuthenticated') === 'true') {
          console.log('Previously authenticated, reloading page to reset state');
          localStorage.removeItem('wasAuthenticated');
          window.location.reload();
        }
        return null;
      }
      
      // Mark that user was successfully authenticated
      localStorage.setItem('wasAuthenticated', 'true');
      
      const data = await response.json();
      console.log('User profile fetched with stored token:', data);
      
      // Re-save the token to ensure it's available for other fetches
      localStorage.setItem('authToken', storedToken);
      
      return data;
    }
    
    console.log('Session found, getting user profile');
    const token = session.access_token;
    
    // Store the token for persistence and for fetch requests
    localStorage.setItem('authToken', token);
    
    const response = await fetch('/api/auth/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.error('Error fetching profile, status:', response.status);
      
      // Try to get response text for better debugging
      try {
        const errorText = await response.text();
        console.error('Error response:', errorText);
      } catch (e) {
        console.error('Could not get error text');
      }
      
      if (response.status === 401) {
        // Token is invalid or expired
        console.log('Token invalid, signing out');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        await signOut();
        return null;
      }
      throw new Error(`Failed to fetch user profile: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('User profile successfully fetched:', data);
    
    // Store user data for persistence
    localStorage.setItem('userData', JSON.stringify(data));
    
    return data;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    throw error;
  }
}

// React Query hooks
export function useUser() {
  return useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      try {
        // Check for onboarding completion flag early
        const onboardingComplete = localStorage.getItem('onboardingComplete') === 'true';
        
        // Clear authInProgress flag if it's still hanging around
        if (localStorage.getItem('authInProgress') === 'true') {
          console.log('Found stale authInProgress flag, clearing it');
          localStorage.removeItem('authInProgress');
        }

        // Check for an active Supabase session first
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('Active Supabase session found:', session.user.id);
          
          // Set token in localStorage for subsequent requests
          localStorage.setItem('authToken', session.access_token);
          
          // With a valid session, try to get the user profile
          try {
            const profile = await getUserProfile();
            
            // If we have a profile, check if we need to add isNewUser flag
            if (profile) {
              // Check for onboarding flags
              const pendingOnboarding = localStorage.getItem('pendingOnboarding') === 'true';
              const newSignup = localStorage.getItem('newSignup') === 'true';
              
              // Store the profile data for fallback
              localStorage.setItem('userData', JSON.stringify(profile));
              
              // If onboarding was just completed, ensure it's properly reflected
              if (onboardingComplete) {
                console.log('useUser: Onboarding was completed, marking user as onboarded');
                return {
                  ...profile,
                  onboarded: true,
                  isNewUser: false
                };
              }
              
              // If user needs onboarding, set isNewUser flag
              if (pendingOnboarding || newSignup || !profile.onboarded) {
                console.log('useUser: User needs onboarding', { 
                  pendingOnboarding, 
                  newSignup, 
                  profileOnboarded: profile.onboarded 
                });
                
                return {
                  ...profile,
                  isNewUser: true
                };
              }
              
              return profile;
            }
          } catch (profileError) {
            console.error('Error fetching profile with active session:', profileError);
            // Continue to fallback mechanisms
          }
        } else {
          console.log('No active Supabase session found');
          
          // Clear auth flags since we don't have an active session
          localStorage.removeItem('authToken');
        }
        
        // Try to fetch user profile even without session (might use token from localStorage)
        const storedToken = localStorage.getItem('authToken');
        if (storedToken) {
          try {
            // Try to validate token
            const { data } = await supabase.auth.getUser(storedToken);
            if (data?.user) {
              console.log('Valid stored token found, user:', data.user.id);
              
              // Try to fetch user profile with the stored token
              const profile = await getUserProfile();
              if (profile) {
                console.log('Got profile with stored token:', profile.id);
                return profile;
              }
            } else {
              // Invalid token, clear it
              localStorage.removeItem('authToken');
              localStorage.removeItem('userData');
            }
          } catch (tokenError) {
            console.error('Error validating stored token:', tokenError);
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
          }
        }
        
        // Final fallback - check if we have userData in localStorage
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          try {
            const userData = JSON.parse(storedUserData);
            console.log('Using stored user data as final fallback');
            return userData;
          } catch (e) {
            console.error('Error parsing stored user data:', e);
            localStorage.removeItem('userData');
          }
        }
        
        return null;
      } catch (error) {
        console.error('Error in useUser query:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { email: string; password: string; username: string }) => {
      try {
        const result = await signUp(data);
        console.log("SignUp mutation successful:", result);
        return result;
      } catch (error) {
        console.error("SignUp mutation failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("SignUp mutation onSuccess handler with data:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      // Force a refetch to ensure we have the most up-to-date user data
      queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
    },
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      try {
        const result = await signIn(data);
        console.log("SignIn mutation successful:", result);
        return result;
      } catch (error) {
        console.error("SignIn mutation failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("SignIn mutation onSuccess handler with data:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      // Force a refetch to ensure we have the most up-to-date user data
      queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      return await signOut();
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/user'], null);
      queryClient.invalidateQueries();
    },
  });
}