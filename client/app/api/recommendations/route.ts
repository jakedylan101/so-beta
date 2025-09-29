import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Supabase environment variables are not set' }, { status: 500 });
  }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { user_id } = await req.json();

  if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });

  const { data, error } = await supabase.rpc('get_personalized_recommendations', { user_id });
  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json({ data });
} 