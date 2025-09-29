// Simple standalone test for Supabase connection
// Run with: node server/test-supabase.js

const SUPABASE_URL = 'https://lpqdykkivhnhvfarhvbo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwcWR5a2tpdmhuaHZmYXJodmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc2MzYwNSwiZXhwIjoyMDYzMzM5NjA1fQ.vxzUultK7XDM683As7ruYyhBq0aqBkxwrD5UvsOnlRM';

async function testSupabaseConnection() {
  console.log('Testing Supabase connection with direct fetch...');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Key: ${SUPABASE_KEY.substring(0, 10)}...`);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/sets?select=id&limit=1`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Parsed error:', errorJson);
      } catch (e) {
        console.log('Could not parse error as JSON');
      }
      return;
    }

    const data = await response.json();
    console.log('Success! Data:', data);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

// Run the test
testSupabaseConnection();

// Export for potential use in other modules
export { testSupabaseConnection }; 