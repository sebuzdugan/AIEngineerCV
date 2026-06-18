// Redis (Upstash REST) for codes, try counts, follow claims, and rate limits. Supports both the
// Upstash-native and Vercel-KV env var names.

import { Redis } from '@upstash/redis';
import { CODE_TTL_SECONDS, MAX_TRIES_CAP, type Platform } from './config';

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export const redis = new Redis({ url: url!, token: token! });

const emailKey = (email: string): string => email.trim().toLowerCase();

// ---- email codes ----
export async function setCode(email: string, code: string): Promise<void> {
  await redis.set(`code:${emailKey(email)}`, code, { ex: CODE_TTL_SECONDS });
}
export async function checkCode(email: string, code: string): Promise<boolean> {
  const stored = await redis.get<string>(`code:${emailKey(email)}`);
  if (stored && String(stored) === String(code)) {
    await redis.del(`code:${emailKey(email)}`);
    return true;
  }
  return false;
}

// ---- tries ----
const triesKey = (email: string): string => `tries:${emailKey(email)}`;
const initKey = (email: string): string => `init:${emailKey(email)}`;

/** Initialize a brand-new email with the free allowance exactly once. Returns current tries. */
export async function ensureInit(email: string, initial: number): Promise<number> {
  const isNew = await redis.setnx(initKey(email), '1');
  if (isNew) await redis.set(triesKey(email), initial);
  return Number((await redis.get<number>(triesKey(email))) ?? 0);
}
export async function getTries(email: string): Promise<number> {
  return Number((await redis.get<number>(triesKey(email))) ?? 0);
}
export async function spendTry(email: string): Promise<number> {
  const left = await redis.decr(triesKey(email));
  if (left < 0) await redis.set(triesKey(email), 0);
  return Math.max(0, left);
}
export async function refundTry(email: string): Promise<void> {
  await redis.incr(triesKey(email));
}

// ---- honor-system follow claims ----
export async function claimFollow(email: string, platform: Platform, bonus: number): Promise<{ granted: boolean; tries: number }> {
  const granted = (await redis.setnx(`follow:${emailKey(email)}:${platform}`, '1')) === 1;
  if (granted) {
    const left = await redis.incrby(triesKey(email), bonus);
    if (left > MAX_TRIES_CAP) await redis.set(triesKey(email), MAX_TRIES_CAP);
  }
  return { granted, tries: await getTries(email) };
}
export async function claimedFollows(email: string): Promise<Platform[]> {
  const platforms: Platform[] = ['x', 'youtube', 'medium'];
  const flags = await Promise.all(platforms.map((p) => redis.get(`follow:${emailKey(email)}:${p}`)));
  return platforms.filter((_, i) => flags[i]);
}

// ---- rate limiting (per IP, fixed 60s window) ----
export async function rateLimited(bucket: string, ip: string, perMin: number): Promise<boolean> {
  const key = `rl:${bucket}:${ip}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 60);
  return n > perMin;
}
