import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSignIn, useSignUp } from '@/lib/auth';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import analytics from '@/services/analytics';
import { createClient } from '@supabase/supabase-js';

// Form validation schemas
const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const signupSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }).max(20, { message: 'Username must be less than 20 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

interface AuthFormProps {
  onSuccess?: () => void;
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const { toast } = useToast();
  const { mutateAsync: signIn, isPending: isSigningIn } = useSignIn();
  const { mutateAsync: signUp, isPending: isSigningUp } = useSignUp();

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Signup form
  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
    mode: "onChange"  // Enable validation on change
  });

  // Handle login submission
  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      console.log('[AuthForm] Logging in with:', data.email);
      
      // DIRECT APPROACH - Create a fresh client instance
      console.log('[AuthForm] Using direct Supabase client approach for login');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Create a fresh client with minimal config
      const directClient = createClient(supabaseUrl, supabaseKey);
      
      // Make the signin call directly
      const { data: result, error } = await directClient.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });
      
      if (error) {
        console.error('[AuthForm] Direct login error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Invalid email or password. Please try again.',
          variant: 'destructive',
        });
        return;
      }
      
      console.log('[AuthForm] Direct login successful:', result);
      
      // Store the session token if we got one
      if (result?.session?.access_token) {
        localStorage.setItem('authToken', result.session.access_token);
      }
      
      // Check for user data in the result
      if (result?.user) {
        console.log('[AuthForm] User found in login result:', result.user.id);
        
        // Track successful login in analytics
        analytics.trackSignIn('email', result.user.id);
        
        // Set user properties in analytics
        analytics.setUserProperties({
          user_id: result.user.id,
          email: data.email
        });
      }
      
      // Ensure query client has the latest user data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      // Explicitly refetch to ensure we get the latest data
      queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: 'Success',
        description: 'Logged in successfully!',
        variant: 'default',
      });
      
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error('[AuthForm] Login error:', e);
      
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Invalid email or password. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle signup submission
  const onSignupSubmit = async (data: SignupFormValues) => {
    try {
      console.log('[AuthForm] Starting signup process...', {
        data,
        mutationFn: !!signUp,
        isSigningUp
      });

      // DIRECT APPROACH - Create a fresh client instance
      console.log('[AuthForm] Using direct Supabase client approach');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Create a fresh client with minimal config
      const directClient = createClient(supabaseUrl, supabaseKey);
      
      // Make the signup call directly
      const { data: result, error } = await directClient.auth.signUp({
        email: data.email,
        password: data.password,
        options: { 
          data: { username: data.username },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        console.error('[AuthForm] Direct signup error:', error);
        
        // If user already exists, switch to login tab and pre-fill email
        if (error.message?.includes('already exists')) {
          toast({
            title: 'Account Exists',
            description: 'This email is already registered. Please sign in instead.',
            variant: 'default',
          });
          setActiveTab('login');
          loginForm.setValue('email', data.email);
          return;
        }
        
        toast({
          title: 'Error',
          description: error.message || 'Failed to create account. Please try again.',
          variant: 'destructive',
        });
        return;
      }
      
      console.log('[AuthForm] Direct signup successful:', result);
      
      if (result?.user) {
        console.log('[AuthForm] Signup successful, user:', result.user);
        
        // Store the session token if we got one
        if (result?.session?.access_token) {
          localStorage.setItem('authToken', result.session.access_token);
        }
        
        // Mark as a new signup with pending onboarding
        localStorage.setItem('newSignup', 'true');
        localStorage.setItem('pendingOnboarding', 'true');
        
        // Track successful sign up in analytics
        analytics.trackSignUp('email', result.user.id);
        
        // Set user properties in analytics
        analytics.setUserProperties({
          user_id: result.user.id,
          email: data.email,
          username: data.username,
          sign_up_date: new Date().toISOString()
        });

        // IMPORTANT: Explicitly set the user data in query client with proper flags
        console.log('[AuthForm] Explicitly setting user data with onboarding flags');
        const userData = {
          id: result.user.id,
          email: result.user.email || data.email,
          username: data.username,
          isNewUser: true,
          onboarded: false,
        };
        
        // Set this data directly in query client
        queryClient.setQueryData(['/api/auth/user'], userData);
        localStorage.setItem('userData', JSON.stringify(userData));
      }
      
      // Ensure query client has the latest user data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      // Explicitly refetch to ensure we get the latest data
      await queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      
      // First show a success toast
      toast({
        title: 'Success',
        description: 'Account created successfully! Let\'s set up your music preferences.',
        variant: 'default',
      });
      
      console.log('[AuthForm] Calling onSuccess callback to close modal');
      if (onSuccess) {
        // Call onSuccess to close the auth modal
        onSuccess();
        
        // Force a small delay to ensure state updates before continuing
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('[AuthForm] Modal should be closed, checking if onboarding should open');
        // Force a refetch of user data to trigger onboarding modal
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        await queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      }
      
    } catch (e) {
      console.error('[AuthForm] Signup error:', e);
      
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to create account. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">SoundOff</CardTitle>
        <CardDescription className="text-center">
          Log, rank, relive your music; discover where the beat takes you next
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs 
          defaultValue="login" 
          value={activeTab} 
          onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input placeholder="••••••••" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isSigningIn}>
                  {isSigningIn ? 'Logging in...' : 'Login'}
                </Button>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="signup">
            <Form {...signupForm}>
              <form 
                onSubmit={signupForm.handleSubmit(async (data) => {
                  console.log('[AuthForm] Form submit event triggered');
                  console.log('[AuthForm] Form data:', {
                    email: data.email,
                    username: data.username,
                    hasPassword: !!data.password
                  });
                  
                  await onSignupSubmit(data);
                })} 
                className="space-y-4"
              >
                <FormField
                  control={signupForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="soundofflover" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={signupForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input placeholder="••••••••" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSigningUp}
                >
                  {isSigningUp ? 'Creating account...' : 'Create account'}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-center text-sm text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </div>
      </CardFooter>
    </Card>
  );
}