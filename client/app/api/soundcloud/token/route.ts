import { NextResponse } from 'next/server';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function GET() {
  const now = Date.now() / 1000;

  if (cachedToken && tokenExpiry > now) {
    return NextResponse.json({ access_token: cachedToken });
  }

  const client_id = process.env.SOUNDCLOUD_CLIENT_ID || '';
  const client_secret = process.env.SOUNDCLOUD_CLIENT_SECRET || '';

  const res = await fetch('https://api.soundcloud.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id,
      client_secret
    }).toString()
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('SoundCloud token error:', data);
    return new NextResponse('Token fetch failed', { status: 500 });
  }

  cachedToken = data.access_token;
  tokenExpiry = now + data.expires_in - 30; // buffer to avoid edge expiry

  return NextResponse.json({ access_token: cachedToken });
} 