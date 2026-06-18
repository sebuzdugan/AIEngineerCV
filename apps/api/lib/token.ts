// Stateless HMAC token that proves "this email verified a code". It only authenticates identity -
// the number of remaining tries is always read from Redis, so a forged/edited token can't grant
// tries. Uses node crypto, no dependency.

import crypto from 'node:crypto';
import { env, TOKEN_TTL_SECONDS } from './config';

function hmac(payload: string): string {
  return crypto.createHmac('sha256', env('TOKEN_SECRET')).update(payload).digest('base64url');
}

export function sign(email: string, ttl = TOKEN_TTL_SECONDS): string {
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const payload = Buffer.from(JSON.stringify({ email, exp })).toString('base64url');
  return `${payload}.${hmac(payload)}`;
}

export function verify(token: string | undefined): { email: string } | null {
  if (!token || typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = hmac(payload);
  // constant-time compare
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const { email, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      email: string;
      exp: number;
    };
    if (!email || exp < Math.floor(Date.now() / 1000)) return null;
    return { email };
  } catch {
    return null;
  }
}
