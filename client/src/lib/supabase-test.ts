import { createClient } from '@supabase/supabase-js';

console.log('[supabase-test.ts] Starting test...');

// Basic client initialization with minimal config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[supabase-test.ts] Variables:', {
  url: supabaseUrl,
  keyPrefix: supabaseKey?.substring(0, 6)
});

// Create very basic client
const supabaseTest = createClient(supabaseUrl, supabaseKey);
console.log('[supabase-test.ts] Client created');

// Test function that runs immediately
(async function testSupabase() {
  console.log('[supabase-test.ts] Starting test function');
  
  try {
    // Test 1: Simple auth check
    console.log('[supabase-test.ts] Testing auth.getSession()...');
    const { data: session, error: sessionError } = await supabaseTest.auth.getSession();
    
    if (sessionError) {
      console.error('[supabase-test.ts] Session error:', sessionError);
    } else {
      console.log('[supabase-test.ts] Session check successful:', {
        hasSession: !!session.session
      });
    }
    
    // Test 2: Simple table query
    console.log('[supabase-test.ts] Testing database query...');
    const { data: genres, error: queryError } = await supabaseTest.from('set_genres').select('*').limit(1);
    
    if (queryError) {
      console.error('[supabase-test.ts] Query error:', queryError);
    } else {
      console.log('[supabase-test.ts] Query successful:', genres);
    }
    
    console.log('[supabase-test.ts] All tests complete');
  } catch (e) {
    console.error('[supabase-test.ts] Test function exception:', e);
  }
})();

export { supabaseTest }; 