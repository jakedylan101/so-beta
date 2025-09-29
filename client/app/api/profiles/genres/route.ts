import { createClient } from '@supabase/supabase-js';

// Hardcoded values from environment variables for direct use
const supabaseUrl = 'https://lpqdykkivhnhvfarhvbo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwcWR5a2tpdmhuaHZmYXJodmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2NzQ1ODQsImV4cCI6MjA2MTI1MDU4NH0.6XZdnbDV_XRuTNVNbgw3-x5aOx1fnuZpi_WQ7BwHLVo';

export async function POST(req: Request) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { genres } = await req.json();

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

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      genre_preferences: genres,
      onboarded: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);

  if (updateError) {
    // If update fails, try to insert
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        username: user.email?.split('@')[0] || `user_${user.id.substring(0, 8)}`,
        genre_preferences: genres,
        onboarded: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('genre_preferences')
    .eq('id', user.id)
    .single();

  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ genres: profile.genre_preferences || [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
} 