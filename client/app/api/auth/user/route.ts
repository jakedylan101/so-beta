import { createClient } from '@supabase/supabase-js';

// Hardcoded values from environment variables for direct use
const supabaseUrl = 'https://lpqdykkivhnhvfarhvbo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwcWR5a2tpdmhuaHZmYXJodmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2NzQ1ODQsImV4cCI6MjA2MTI1MDU4NH0.6XZdnbDV_XRuTNVNbgw3-x5aOx1fnuZpi_WQ7BwHLVo';

export async function GET(req: Request) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get user profile data
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    // If profile doesn't exist, this is a new user
    if (profileError.code === 'PGRST116') {
      const userData = {
        id: user.id,
        email: user.email,
        username: user.email?.split('@')[0] || `user_${user.id.substring(0, 8)}`,
        isNewUser: true,
        onboarded: false,
        genre_preferences: []
      };

      return new Response(JSON.stringify(userData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: profileError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Combine auth user and profile data
  const userData = {
    id: user.id,
    email: user.email,
    username: profile.username,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    isNewUser: !profile.onboarded,
    onboarded: profile.onboarded,
    genre_preferences: profile.genre_preferences
  };

  return new Response(JSON.stringify(userData), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
} 