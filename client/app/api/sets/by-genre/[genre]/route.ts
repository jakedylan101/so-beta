import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request, context: { params: { genre: string } }) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase environment variables are not set' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  const genre = context.params.genre;
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  if (!genre) return new Response(JSON.stringify({ error: 'Missing genre' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .ilike('genre', `%${genre}%`)
    .order('created_at', { ascending: false });

  if (error) return new Response(JSON.stringify({ error }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  return new Response(JSON.stringify({ data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
} 