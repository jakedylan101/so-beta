import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Hardcoded Supabase credentials for Render deployment
const supabaseUrl = 'https://lpqdykkivhnhvfarhvbo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwcWR5a2tpdmhuaHZmYXJodmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjM2MDUsImV4cCI6MjA2MzMzOTYwNX0.edKEGfsNqn7O325Lad3XprktHff8fvnwCLFXPgBKEio';

export async function GET(req: Request, { params }: { params: { userId: string } }) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { userId } = params;

  // Read bearer token from incoming request and set it on the Supabase client
  // so that server-side auth checks (getUser) work when the client sends
  // an Authorization: Bearer <token> header.
  const authHeader = req.headers.get('authorization') || '';
  const incomingToken = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : authHeader;

  if (!incomingToken) {
    console.error('[LikedSets] Missing Authorization token in request');
    return NextResponse.json({ error: 'Unauthorized - missing token' }, { status: 401 });
  }

  // Attach token to supabase client for server-side auth checks
  try {
    // supabase.auth.setAuth is available to set the access token for the client
    // during server-side handling.
    // @ts-ignore
    supabase.auth.setAuth(incomingToken);
  } catch (err) {
    console.warn('[LikedSets] Failed to set auth token on Supabase client', err);
  }

  // Validate UUID
  const uuidSchema = z.string().uuid();
  const parseResult = uuidSchema.safeParse(userId);

  if (!parseResult.success) {
    console.error(`[LikedSets] Invalid userId format: ${userId}`);
    return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 });
  }

  console.log(`[LikedSets] Fetching liked sets for user: ${userId}`);

  const { data: session, error: sessionError } = await supabase.auth.getUser();

  if (sessionError) {
    console.error('[LikedSets] Auth error:', sessionError.message);
    return NextResponse.json({ error: 'Unauthorized', details: sessionError.message }, { status: 401 });
  }

  if (!session?.user?.id) {
    console.error('[LikedSets] No user found in session');
    return NextResponse.json({ error: 'Unauthorized - No active session' }, { status: 401 });
  }

  // Enforce RLS - ensure the user can only access their own data
  if (session.user.id !== userId) {
    console.error(`[LikedSets] User ID mismatch - Session: ${session.user.id}, Requested: ${userId}`);
    return NextResponse.json({ error: 'Forbidden - You can only access your own data' }, { status: 403 });
  }

  // Get sets liked via user_logged_sets
  const { data: loggedLiked, error: err1 } = await supabase
    .from('user_logged_sets')
    .select('set_id')
    .eq('user_id', userId)
    .eq('liked', true);

  // Get sets liked via user_liked_sets
  const { data: discoveryLiked, error: err2 } = await supabase
    .from('user_liked_sets')
    .select('set_id')
    .eq('user_id', userId);

  if (err1 || err2) {
    console.error('[LikedSets] Error fetching liked sets:', err1 || err2);
    return NextResponse.json({ 
      error: 'Failed to fetch liked sets', 
      details: err1?.message || err2?.message 
    }, { status: 500 });
  }

  // Combine and deduplicate set IDs
  const likedSetIds = [...new Set([
    ...(loggedLiked ?? []).map((r) => r.set_id),
    ...(discoveryLiked ?? []).map((r) => r.set_id),
  ])];

  if (likedSetIds.length === 0) {
    console.log(`[LikedSets] No liked sets found for user: ${userId}`);
    return NextResponse.json([]);
  }

  // Fetch the full set details
  const { data: sets, error } = await supabase
    .from('sets')
    .select('*')
    .in('id', likedSetIds)
    .order('event_date', { ascending: false });

  if (error) {
    console.error('[LikedSets] Error fetching set details:', error.message);
    return NextResponse.json({ 
      error: 'Failed to fetch set details', 
      details: error.message 
    }, { status: 500 });
  }

  console.log(`[LikedSets] Successfully fetched ${sets?.length || 0} liked sets for user: ${userId}`);
  return NextResponse.json(sets || []);
} 