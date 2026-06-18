import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ALLOWED_ORIGINS } from './config';

/** Apply CORS. Returns true if the request was a preflight and is already handled. */
export function cors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = (req.headers.origin as string) || '';
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

export function clientIp(req: VercelRequest): string {
  const fwd = (req.headers['x-forwarded-for'] as string) || '';
  return fwd.split(',')[0]?.trim() || (req.socket?.remoteAddress ?? 'unknown');
}

export function body<T = Record<string, unknown>>(req: VercelRequest): T {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as T;
    } catch {
      return {} as T;
    }
  }
  return (req.body ?? {}) as T;
}

export const isEmail = (s: unknown): s is string =>
  typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
