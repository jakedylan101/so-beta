/**
 * supabase.ts
 *
 * Single source of truth for Supabase clients.
 *
 * ─────────────────────────────────────────────────────────
 * ‣ `supabase`        → Browser‑safe client (anon key, session persisted)
 * ‣ `supabaseAdmin`   → Server‑only client (service‑role key)
 * ‣ `getUserClient()` → Helper for server routes when you already
 *                      have the caller's JWT
 * ─────────────────────────────────────────────────────────
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Debug environment variables
console.log('Supabase configuration:');
console.log('URL:', process.env.VITE_SUPABASE_URL);
console.log('ANON key available:', !!process.env.VITE_SUPABASE_ANON_KEY);
console.log('SERVICE_ROLE key available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

/* ─── Environment ─────────────────────────────────────── */
// Using VITE_ prefixed variables with fallbacks
const URL  = process.env.VITE_SUPABASE_URL || 'https://lpqdykkivhnhvfarhvbo.supabase.co';
const ANON = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwcWR5a2tpdmhuaHZmYXJodmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjM2MDUsImV4cCI6MjA2MzMzOTYwNX0.edKEGfsNqn7O325Lad3XprktHff8fvnwCLFXPgBKEio';
const SRV  = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwcWR5a2tpdmhuaHZmYXJodmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc2MzYwNSwiZXhwIjoyMDYzMzM5NjA1fQ.vxzUultK7XDM683As7ruYyhBq0aqBkxwrD5UvsOnlRM';

// Debug logging for initialization
console.log('Supabase configuration:');
console.log('URL:', URL);
console.log('ANON key available:', !!ANON);
console.log('SERVICE_ROLE key available:', !!SRV);

/* ─── Browser‑side / default client (anon key) ────────── */
/*  This is the ONLY client that should be imported in React components. */
export const supabase: SupabaseClient = createClient(URL, ANON, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/* ─── Server‑side admin client (service role) ─────────── */
/*  NEVER expose this to the browser; import only in API routes, cron jobs, etc. */
export const supabaseAdmin: SupabaseClient | null =
  typeof window === 'undefined'
    ? createClient(URL, SRV, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

/* ─── Helper: user‑scoped client (server) ────────────────────────── */
/**
 * Returns a short‑lived client whose Authorization header is pre‑populated
 * with the supplied JWT.  Ideal for API routes where you already extracted
 * the token from cookies / headers and need to perform one or two queries.
 */
export function getUserClient(jwt: string): SupabaseClient {
  return createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth:   { autoRefreshToken: false, persistSession: false },
  });
}

/* ─── Utility so that server files can rely on a non‑null admin client ─── */
export const admin = ((c) => {
  if (!c) throw new Error('supabaseAdmin is null – imported in the browser?');
  return c;
})(supabaseAdmin!);

// Log Supabase configuration
console.log('------------------------------------------------------------');
console.log('SUPABASE CLIENT CONFIGURATION:');
console.log(`- URL: ${URL}`);
console.log('- Anon key is available: ' + (ANON ? 'Yes' : 'No'));
console.log('- Service role key is available: ' + (SRV ? 'Yes' : 'No'));

console.log('Supabase clients initialized (auth + admin + user)');