import { dummyUser } from '../auth/user';

export async function POST(req: Request) {
  // Simulate onboarding completion by updating the in-memory dummyUser
  dummyUser.onboarded = true;
  dummyUser.isNewUser = false;
  // Optionally update genre_preferences if sent in the request
  try {
    const body = await req.json();
    if (body.genres) {
      dummyUser.genre_preferences = body.genres;
    }
  } catch {}
  return new Response(
    JSON.stringify(dummyUser),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
} 