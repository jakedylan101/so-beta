import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export async function DELETE(
  req: Request,
  { params }: { params: { userId: string; friendId: string } }
) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('[Friends] Missing Supabase environment variables');
    return NextResponse.json({ error: 'Supabase environment variables are not set' }, { status: 500 });
  }
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { userId, friendId } = params;

  // Validate UUIDs
  const uuidSchema = z.string().uuid();
  const userIdResult = uuidSchema.safeParse(userId);
  const friendIdResult = uuidSchema.safeParse(friendId);

  if (!userIdResult.success || !friendIdResult.success) {
    console.error(`[Friends] Invalid ID format: userId=${userId}, friendId=${friendId}`);
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }

  console.log(`[Friends] Removing friend: ${friendId} for user: ${userId}`);

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

  // Call the RPC function to remove friend
  const { data, error } = await supabase.rpc('remove_friend', {
    user_id: userId,
    friend_id: friendId,
  });

  if (error) {
    console.error('[Friends] RPC failed:', error.message, error.details, error.hint);
    return NextResponse.json({ 
      error: 'Failed to remove friend', 
      details: error.message,
      code: error.code
    }, { status: 500 });
  }

  console.log(`[Friends] Successfully removed friend: ${friendId} for user: ${userId}`);
  return NextResponse.json({ success: true });
} 