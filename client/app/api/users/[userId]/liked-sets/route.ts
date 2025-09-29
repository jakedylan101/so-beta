import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export async function GET(req: Request, { params }: { params: { userId: string } }) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('[LikedSets] Missing Supabase environment variables');
    return NextResponse.json({ error: 'Supabase environment variables are not set' }, { status: 500 });
  }
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { userId } = params;

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

  // Call the RPC function to get liked sets
  const { data, error } = await supabase.rpc('get_liked_sets', {
    user_id: userId,
  });

  if (error) {
    console.error('[LikedSets] RPC failed:', error.message, error.details, error.hint);
    return NextResponse.json({ 
      error: 'Failed to fetch liked sets', 
      details: error.message,
      code: error.code
    }, { status: 500 });
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    console.log(`[LikedSets] No liked sets found for user: ${userId}`);
    return NextResponse.json([]);
  }

  console.log(`[LikedSets] Successfully fetched ${data.length} liked sets for user: ${userId}`);
  return NextResponse.json(data);
} 