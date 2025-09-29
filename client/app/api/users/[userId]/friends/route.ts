import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export async function GET(req: Request, { params }: { params: { userId: string } }) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('[Friends] Missing Supabase environment variables');
    return NextResponse.json({ error: 'Supabase environment variables are not set' }, { status: 500 });
  }
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { userId } = params;

  // Validate UUID
  const uuidSchema = z.string().uuid();
  const parseResult = uuidSchema.safeParse(userId);

  if (!parseResult.success) {
    console.error(`[Friends] Invalid userId format: ${userId}`);
    return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 });
  }

  console.log(`[Friends] Fetching friends for user: ${userId}`);

  const { data: session, error: sessionError } = await supabase.auth.getUser();

  if (sessionError) {
    console.error('[Friends] Auth error:', sessionError.message);
    return NextResponse.json({ error: 'Unauthorized', details: sessionError.message }, { status: 401 });
  }

  if (!session?.user?.id) {
    console.error('[Friends] No user found in session');
    return NextResponse.json({ error: 'Unauthorized - No active session' }, { status: 401 });
  }

  // Enforce RLS - ensure the user can only access their own data
  if (session.user.id !== userId) {
    console.error(`[Friends] User ID mismatch - Session: ${session.user.id}, Requested: ${userId}`);
    return NextResponse.json({ error: 'Forbidden - You can only access your own data' }, { status: 403 });
  }

  // Call the RPC function to get friends
  const { data, error } = await supabase.rpc('get_friends', {
    user_id: userId,
  });

  if (error) {
    console.error('[Friends] RPC failed:', error.message, error.details, error.hint);
    return NextResponse.json({ 
      error: 'Failed to fetch friends', 
      details: error.message,
      code: error.code
    }, { status: 500 });
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    console.log(`[Friends] No friends found for user: ${userId}`);
    return NextResponse.json([]);
  }

  console.log(`[Friends] Successfully fetched ${data.length} friends for user: ${userId}`);
  return NextResponse.json(data);
}

export async function POST(req: Request, { params }: { params: { userId: string } }) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('[Friends] Missing Supabase environment variables');
    return NextResponse.json({ error: 'Supabase environment variables are not set' }, { status: 500 });
  }
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { userId } = params;

  // Validate UUID
  const uuidSchema = z.string().uuid();
  const parseResult = uuidSchema.safeParse(userId);

  if (!parseResult.success) {
    console.error(`[Friends] Invalid userId format: ${userId}`);
    return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 });
  }

  // Get request body
  let body;
  try {
    body = await req.json();
  } catch (e) {
    console.error('[Friends] Failed to parse request body:', e);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Validate body
  if (!body.email && !body.username) {
    console.error('[Friends] Missing email or username in request body');
    return NextResponse.json({ error: 'Either email or username must be provided' }, { status: 400 });
  }

  console.log(`[Friends] Adding friend for user: ${userId} with ${body.email ? 'email' : 'username'}: ${body.email || body.username}`);

  const { data: session, error: sessionError } = await supabase.auth.getUser();

  if (sessionError) {
    console.error('[Friends] Auth error:', sessionError.message);
    return NextResponse.json({ error: 'Unauthorized', details: sessionError.message }, { status: 401 });
  }

  if (!session?.user?.id) {
    console.error('[Friends] No user found in session');
    return NextResponse.json({ error: 'Unauthorized - No active session' }, { status: 401 });
  }

  // Enforce RLS - ensure the user can only access their own data
  if (session.user.id !== userId) {
    console.error(`[Friends] User ID mismatch - Session: ${session.user.id}, Requested: ${userId}`);
    return NextResponse.json({ error: 'Forbidden - You can only access your own data' }, { status: 403 });
  }

  // Call the RPC function to add friend
  const { data, error } = await supabase.rpc('add_friend', {
    requester_id: userId,
    friend_email: body.email || null,
    friend_username: body.username || null,
  });

  if (error) {
    console.error('[Friends] RPC failed:', error.message, error.details, error.hint);
    return NextResponse.json({ 
      error: 'Failed to add friend', 
      details: error.message,
      code: error.code
    }, { status: 500 });
  }

  console.log(`[Friends] Successfully added friend request for user: ${userId}`);
  return NextResponse.json({ success: true, data });
} 