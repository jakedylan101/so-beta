import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { userId: string } }) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('[LovedArtists] Missing Supabase environment variables');
    return NextResponse.json({ error: 'Supabase environment variables are not set' }, { status: 500 });
  }
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { userId } = params;

  console.log(`[LovedArtists] Fetching loved artists for user: ${userId}`);

  const { data: session, error: sessionError } = await supabase.auth.getUser();

  if (sessionError) {
    console.error('[LovedArtists] Auth error:', sessionError.message);
    return NextResponse.json({ error: 'Unauthorized', details: sessionError.message }, { status: 401 });
  }

  if (!session?.user?.id) {
    console.error('[LovedArtists] No user found in session');
    return NextResponse.json({ error: 'Unauthorized - No active session' }, { status: 401 });
  }

  // Enforce RLS - ensure the user can only access their own data
  if (session.user.id !== userId) {
    console.error(`[LovedArtists] User ID mismatch - Session: ${session.user.id}, Requested: ${userId}`);
    return NextResponse.json({ error: 'Forbidden - You can only access your own data' }, { status: 403 });
  }

  // Call the RPC function to get loved artists
  const { data, error } = await supabase.rpc('get_loved_artists_by_user', {
    input_user_id: userId,
  });

  if (error) {
    console.error('[LovedArtists] RPC failed:', error.message, error.details, error.hint);
    return NextResponse.json({ 
      error: 'Failed to fetch loved artists', 
      details: error.message,
      code: error.code
    }, { status: 500 });
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    console.log(`[LovedArtists] No loved artists found for user: ${userId}`);
    return NextResponse.json([]);
  }

  console.log(`[LovedArtists] Successfully fetched ${data.length} loved artists for user: ${userId}`);
  return NextResponse.json(data);
} 