import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Hardcoded Supabase credentials for Render deployment
const supabaseUrl = 'https://lpqdykkivhnhvfarhvbo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwcWR5a2tpdmhuaHZmYXJodmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjM2MDUsImV4cCI6MjA2MzMzOTYwNX0.edKEGfsNqn7O325Lad3XprktHff8fvnwCLFXPgBKEio';

export async function GET(req: Request, { params }: { params: { userId: string } }) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { userId } = params;

  // Validate UUID
  const uuidSchema = z.string().uuid();
  const parseResult = uuidSchema.safeParse(userId);

  if (!parseResult.success) {
    console.error(`[SavedSets] Invalid userId format: ${userId}`);
    return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 });
  }

  console.log(`[SavedSets] Fetching saved sets for user: ${userId}`);

  const { data: session, error: sessionError } = await supabase.auth.getUser();

  if (sessionError) {
    console.error('[SavedSets] Auth error:', sessionError.message);
    return NextResponse.json({ error: 'Unauthorized', details: sessionError.message }, { status: 401 });
  }

  if (!session?.user?.id) {
    console.error('[SavedSets] No user found in session');
    return NextResponse.json({ error: 'Unauthorized - No active session' }, { status: 401 });
  }

  // Enforce RLS - ensure the user can only access their own data
  if (session.user.id !== userId) {
    console.error(`[SavedSets] User ID mismatch - Session: ${session.user.id}, Requested: ${userId}`);
    return NextResponse.json({ error: 'Forbidden - You can only access your own data' }, { status: 403 });
  }

  // Query sets where userId is in the saved_by_user_ids array
  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .contains('saved_by_user_ids', [userId])
    .order('event_date', { ascending: false });

  if (error) {
    console.error('[SavedSets] Error fetching saved sets:', error.message);
    return NextResponse.json({ 
      error: 'Failed to fetch saved sets', 
      details: error.message 
    }, { status: 500 });
  }

  console.log(`[SavedSets] Successfully fetched ${data?.length || 0} saved sets for user: ${userId}`);
  return NextResponse.json(data || []);
} 