'use server';

import { cookies } from 'next/headers';

export async function login(key: string) {
  const correctKey = process.env.LOGIN_KEY;
  
  // If LOGIN_KEY is not set in env, we might want to fail safe or log error.
  // Assuming it is set as per user request.
  if (!correctKey) {
      console.error("LOGIN_KEY environment variable is not set");
      return { success: false, message: 'System configuration error' };
  }

  if (key === correctKey) {
    // Set cookie valid for 7 days
    (await cookies()).set('auth_session', 'valid', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
        sameSite: 'lax',
    });
    return { success: true };
  }

  return { success: false, message: 'Invalid Access Key' };
}

export async function checkAuth() {
    const cookieStore = await cookies();
    const auth = cookieStore.get('auth_session');
    // Also check if LOGIN_KEY is set. If not set, maybe bypass auth? 
    // But user explicitly asked for verification. So we stick to auth check.
    return { isAuthenticated: auth?.value === 'valid' };
}
