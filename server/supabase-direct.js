// Supabase client using direct fetch for reliability
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lpqdykkivhnhvfarhvbo.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwcWR5a2tpdmhuaHZmYXJodmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc2MzYwNSwiZXhwIjoyMDYzMzM5NjA1fQ.vxzUultK7XDM683As7ruYyhBq0aqBkxwrD5UvsOnlRM';

// Check if the key is present, if not show a warning
if (!SUPABASE_KEY) {
  console.error('⚠️ WARNING: Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error('   Database operations may fail. Add this key to your .env file.');
}

// Simple wrapper for Supabase REST API
const supabaseDirect = {
  from: (table) => ({
    select: (columns = '*') => ({
      limit: (limit) => ({
        execute: async () => {
          try {
            const response = await fetch(
              `${SUPABASE_URL}/rest/v1/${table}?select=${columns}&limit=${limit}`,
              {
                headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`
                }
              }
            );
            
            if (!response.ok) {
              const errorText = await response.text();
              let errorDetails;
              try {
                errorDetails = JSON.parse(errorText);
              } catch (e) {
                errorDetails = { message: errorText };
              }
              
              return {
                data: null,
                error: {
                  message: `Supabase API error: ${response.status} ${response.statusText}`,
                  details: errorDetails,
                  status: response.status
                }
              };
            }
            
            const data = await response.json();
            return { data, error: null };
          } catch (error) {
            return {
              data: null,
              error: {
                message: `Fetch error: ${error.message}`,
                details: error,
                status: 500
              }
            };
          }
        }
      }),
      eq: (column, value) => ({
        execute: async () => {
          try {
            const response = await fetch(
              `${SUPABASE_URL}/rest/v1/${table}?select=${columns}&${column}=eq.${value}`,
              {
                headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`
                }
              }
            );
            
            if (!response.ok) {
              const errorText = await response.text();
              let errorDetails;
              try {
                errorDetails = JSON.parse(errorText);
              } catch (e) {
                errorDetails = { message: errorText };
              }
              
              return {
                data: null,
                error: {
                  message: `Supabase API error: ${response.status} ${response.statusText}`,
                  details: errorDetails,
                  status: response.status
                }
              };
            }
            
            const data = await response.json();
            return { data, error: null };
          } catch (error) {
            return {
              data: null,
              error: {
                message: `Fetch error: ${error.message}`,
                details: error,
                status: 500
              }
            };
          }
        }
      })
    }),
    insert: (rows) => ({
      execute: async () => {
        try {
          const response = await fetch(
            `${SUPABASE_URL}/rest/v1/${table}`,
            {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify(Array.isArray(rows) ? rows : [rows])
            }
          );
          
          if (!response.ok) {
            const errorText = await response.text();
            let errorDetails;
            try {
              errorDetails = JSON.parse(errorText);
            } catch (e) {
              errorDetails = { message: errorText };
            }
            
            return {
              data: null,
              error: {
                message: `Supabase API error: ${response.status} ${response.statusText}`,
                details: errorDetails,
                status: response.status
              }
            };
          }
          
          const data = await response.json();
          return { data, error: null };
        } catch (error) {
          return {
            data: null,
            error: {
              message: `Fetch error: ${error.message}`,
              details: error,
              status: 500
            }
          };
        }
      }
    })
  })
};

console.log('Initialized direct Supabase client');

// Simple test
(async () => {
  try {
    console.log('Testing direct Supabase client...');
    const { data, error } = await supabaseDirect.from('sets').select('id').limit(1).execute();
    
    if (error) {
      console.error('Test failed:', error);
    } else {
      console.log('Test successful:', data);
    }
  } catch (err) {
    console.error('Test exception:', err);
  }
})();

// Use ES modules export
export default supabaseDirect; 