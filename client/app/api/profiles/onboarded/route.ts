import { createClient } from '@supabase/supabase-js';

// Hardcoded values from environment variables for direct use
const supabaseUrl = 'https://lpqdykkivhnhvfarhvbo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwcWR5a2tpdmhuaHZmYXJodmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2NzQ1ODQsImV4cCI6MjA2MTI1MDU4NH0.6XZdnbDV_XRuTNVNbgw3-x5aOx1fnuZpi_WQ7BwHLVo';

export async function POST(req: Request) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { onboarded } = await req.json();

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
    .update({ onboarded })
    .eq('id', user.id);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
} 