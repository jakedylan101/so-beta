import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase environment variables are not set' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  const { user_id } = await req.json();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  if (!user_id) return new Response(JSON.stringify({ error: 'Missing user_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const { data, error } = await supabase.rpc('get_favorite_artist_sets', { user_id });
  if (error) return new Response(JSON.stringify({ error }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  return new Response(JSON.stringify({ data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
} 