import { createClient } from '@supabase/supabase-js';

// Hardcoded values from environment variables for direct use
const supabaseUrl = 'https://lpqdykkivhnhvfarhvbo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwcWR5a2tpdmhuaHZmYXJodmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjM2MDUsImV4cCI6MjA2MzMzOTYwNX0.edKEGfsNqn7O325Lad3XprktHff8fvnwCLFXPgBKEio';

export async function POST(req: Request) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { winner_id, loser_id } = await req.json();

    if (!winner_id || !loser_id) {
      return new Response(JSON.stringify({ error: 'Missing winner_id or loser_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Insert into comparisons table with all required fields
    const { error: insertError } = await supabase.from('comparisons').insert({
      user_id: user.id,
      set_a_id: winner_id,
      set_b_id: loser_id,
      winner_set_id: winner_id
    });

    if (insertError) {
      console.error("Failed to insert comparison:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ message: 'Vote submitted successfully' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error("Error processing vote:", err);
    return new Response(JSON.stringify({ error: 'Unexpected server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
} 