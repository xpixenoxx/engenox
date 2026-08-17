// web/src/app/api/auth/login/route.ts
// Login redirect to WorkOS

import { WorkOS } from '@workos-inc/node';
import { NextResponse } from 'next/server';

const workos = new WorkOS(process.env.WORKOS_API_KEY!);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirect = searchParams.get('redirect') || '/dashboard';

  const authorizationUrl = workos.userManagement.getAuthorizationUrl({
    clientId: process.env.WORKOS_CLIENT_ID!,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    state: redirect,
    provider: 'AuthKit',
  });

  return NextResponse.redirect(authorizationUrl);
}