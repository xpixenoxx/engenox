// web/src/app/api/auth/callback/route.ts
// WorkOS OAuth callback handler

import { WorkOS } from '@workos-inc/node';
import { NextResponse } from 'next/server';

const workos = new WorkOS(process.env.WORKOS_API_KEY!);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state') || '/dashboard';
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url));
  }

  try {
    const { user, accessToken, refreshToken } = await workos.userManagement.authenticateWithCode({
      clientId: process.env.WORKOS_CLIENT_ID!,
      code,
    });

    const response = NextResponse.redirect(new URL(state, request.url));

    // Set session cookie (expires in 24 hours, refreshed by WorkOS)
    response.cookies.set('wos_session', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Auth callback error:', err);
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
  }
}