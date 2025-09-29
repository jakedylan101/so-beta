import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Hardcoded values for Render deployment if needed
const supabaseUrl = process.env.SUPABASE_URL || 'https://lpqdykkivhnhvfarhvbo.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwcWR5a2tpdmhuaHZmYXJodmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjM2MDUsImV4cCI6MjA2MzMzOTYwNX0.edKEGfsNqn7O325Lad3XprktHff8fvnwCLFXPgBKEio';

export async function GET(req: Request, context: { params: { userId: string } }) {
  const userId = context.params.userId;
  console.log("Stats API called for userId:", userId);
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  if (!userId) {
    console.error("Missing userId in request");
    return NextResponse.json(
      { error: 'Missing userId' },
      { status: 400 }
    );
  }

  try {
    console.log("Calling get_user_stats RPC for userId:", userId);
    
    // Call the RPC function to get user stats
    const { data, error } = await supabase.rpc('get_user_stats', { 
      user_id: userId 
    });
    
    if (error) {
      console.error("Error calling get_user_stats RPC:", error);
      
      // Fallback to user_profile_view if RPC fails
      console.log("Falling back to user_profile_view for userId:", userId);
      const { data: viewData, error: viewError } = await supabase
        .from('user_profile_view')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (viewError) {
        console.error("Error fetching from user_profile_view:", viewError);
        
        // Return default stats structure if both methods fail
        return NextResponse.json({
          totalSets: 0,
          likedSets: 0,
          savedSets: 0,
          comparisonsMade: 0,
          mostLoggedArtists: [],
          mostVisitedVenues: [],
          preferredGenres: []
        });
      }
      
      console.log("Fetched user_profile_view data:", viewData);
      
      // Normalize the view data to match expected structure
      const normalizedData = {
        totalSets: viewData?.sets_logged || 0,
        likedSets: (viewData?.logged_sets_liked || 0) + (viewData?.discovery_sets_liked || 0),
        savedSets: viewData?.sets_saved || 0,
        comparisonsMade: viewData?.comparisons_made || 0,
        // Keep any additional fields that might be useful
        ...viewData
      };
      
      return NextResponse.json(normalizedData);
    }
    
    console.log("RPC get_user_stats returned data:", data);
    
    // Normalize the RPC data to camelCase
    const normalizedData = {
      totalSets: data?.total_sets || 0,
      likedSets: data?.liked_sets || 0,
      savedSets: data?.saved_sets || 0,
      comparisonsMade: data?.comparisons_made || 0
    };
    
    return NextResponse.json(normalizedData);
  } catch (err) {
    console.error("Unhandled exception in stats API:", err);
    
    // Return default stats structure on error
    return NextResponse.json({
      totalSets: 0,
      likedSets: 0,
      savedSets: 0,
      comparisonsMade: 0,
      error: "Internal server error"
    }, { status: 500 });
  }
} 