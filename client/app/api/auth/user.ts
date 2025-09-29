export let dummyUser = {
  id: 'dummy-user-id',
  email: 'dummy@example.com',
  username: 'dummyuser',
  onboarded: false,
  isNewUser: true,
  genre_preferences: [],
};

export async function GET(req: Request) {
  console.log('GET /api/auth/user - Returning dummy user with isNewUser=true, onboarded=false');
  return new Response(
    JSON.stringify(dummyUser),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
} 