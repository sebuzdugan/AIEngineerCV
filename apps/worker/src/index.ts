// AIEngineerCV free-try backend on Cloudflare Workers.
// One free generation per email (collected, no code), honor-system follows for more, IP rate
// limits. The OpenRouter key lives in a Worker secret and never reaches the browser. Tries live in
// KV, so the HMAC token can't be forged to mint tries.

export interface Env {
  FREE: KVNamespace;
  OPENROUTER_API_KEY: string;
  TOKEN_SECRET: string;
  OPENROUTER_MODEL?: string;
  ALLOWED_ORIGINS?: string;
  INITIAL_FREE_TRIES?: string;
  FOLLOW_BONUS?: string;
  MAX_TRIES_CAP?: string;
  IP_DAILY_CAP?: string;
  GLOBAL_DAILY_CAP?: string;
}

const PLATFORMS = ['x', 'youtube', 'medium'] as const;
type Platform = (typeof PLATFORMS)[number];

const enc = new TextEncoder();
const num = (v: string | undefined, d: number): number => (v && !Number.isNaN(Number(v)) ? Number(v) : d);
const emailKey = (e: string): string => e.trim().toLowerCase();
const isEmail = (s: unknown): s is string =>
  typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;

// ---- CORS + JSON ----
function corsHeaders(req: Request, env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim());
  const origin = req.headers.get('Origin') ?? '';
  const h: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
  if (allowed.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}
function json(req: Request, env: Env, obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req, env) },
  });
}
async function readBody<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}
function clientIp(req: Request): string {
  return req.headers.get('CF-Connecting-IP') ?? req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ?? 'unknown';
}

// ---- HMAC token (Web Crypto) ----
function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const byte of b) s += String.fromCharCode(byte);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlToString(s: string): string {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
}
async function hmac(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return b64url(sig);
}
async function signToken(env: Env, email: string, ttlSec = 60 * 60 * 24): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = b64url(enc.encode(JSON.stringify({ email, exp })));
  return `${payload}.${await hmac(env.TOKEN_SECRET, payload)}`;
}
async function verifyToken(env: Env, token: string | undefined): Promise<{ email: string } | null> {
  if (!token || typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  if ((await hmac(env.TOKEN_SECRET, payload)) !== sig) return null;
  try {
    const { email, exp } = JSON.parse(b64urlToString(payload)) as { email: string; exp: number };
    if (!email || exp < Math.floor(Date.now() / 1000)) return null;
    return { email };
  } catch {
    return null;
  }
}

// ---- KV helpers ----
const triesKey = (e: string): string => `tries:${emailKey(e)}`;

async function getTries(env: Env, email: string): Promise<number> {
  return num((await env.FREE.get(triesKey(email))) ?? undefined, 0);
}
async function setTries(env: Env, email: string, n: number): Promise<void> {
  await env.FREE.put(triesKey(email), String(Math.max(0, n)));
}
async function ensureInit(env: Env, email: string): Promise<number> {
  const initFlag = `init:${emailKey(email)}`;
  if (!(await env.FREE.get(initFlag))) {
    await env.FREE.put(initFlag, '1');
    await env.FREE.put(`lead:${emailKey(email)}`, new Date().toISOString()); // lead list (export via KV)
    await setTries(env, email, num(env.INITIAL_FREE_TRIES, 1));
  }
  return getTries(env, email);
}
async function rateLimited(env: Env, bucket: string, ip: string, perMin: number): Promise<boolean> {
  const key = `rl:${bucket}:${ip}`;
  const n = num((await env.FREE.get(key)) ?? undefined, 0) + 1;
  await env.FREE.put(key, String(n), { expirationTtl: 60 });
  return n > perMin;
}

// ---- daily caps (abuse + cost protection) ----
function dayKey(): string {
  return new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
}
async function readDaily(env: Env, key: string): Promise<number> {
  return num((await env.FREE.get(key)) ?? undefined, 0);
}
async function bumpDaily(env: Env, key: string): Promise<void> {
  await env.FREE.put(key, String((await readDaily(env, key)) + 1), { expirationTtl: 172800 }); // ~2 days
}

// Common throwaway/disposable email domains (small, high-signal list).
const DISPOSABLE = new Set([
  'mailinator.com', 'tempmail.com', 'temp-mail.org', '10minutemail.com', 'guerrillamail.com',
  'sharklasers.com', 'yopmail.com', 'trashmail.com', 'getnada.com', 'dispostable.com',
  'maildrop.cc', 'throwawaymail.com', 'fakeinbox.com', 'mintemail.com', 'mailnesia.com',
  'tempr.email', 'moakt.com', 'emailondeck.com', 'spam4.me', 'mohmal.com',
]);
function isDisposable(email: string): boolean {
  return DISPOSABLE.has((email.split('@')[1] ?? '').toLowerCase());
}

// ---- scope guard (light; full guardrail runs in the browser) ----
interface Profile {
  identity?: { name?: string };
  skills?: unknown[];
  experience?: unknown[];
  screening?: { buildsAiSystems?: boolean };
}
function looksInScope(p: Profile | undefined): boolean {
  if (!p || !p.identity?.name) return false;
  return (p.skills?.length ?? 0) > 0 || (p.experience?.length ?? 0) > 0 || p.screening?.buildsAiSystems === true;
}

const SYSTEM = `You are an expert AI-engineering recruiter and resume writer. Turn the given Profile JSON into a polished, role-targeted CV in Markdown for an AI engineer.

Rules:
- Output ONLY the CV in Markdown. No preamble, no commentary.
- Bullet formula: <strong action verb> + <specific named system> + <named tech/techniques> + <quantified outcome>.
- Group skills by category. Lead with what is most relevant to the target role/seniority/company-type.
- Sections (omit empties): Header (name, headline, location, contact, links), Summary (2-3 lines), Skills, Experience, Projects, Publications, Education, Certifications.

ANTI-HALLUCINATION (non-negotiable):
- NEVER invent experience, employers, dates, metrics, or skills. Use only what the Profile contains.
- NEVER fabricate a number. If a bullet has no metric in the Profile, write it WITHOUT a metric. Do not estimate, guess, or add percentages.
- Reframe and sharpen wording only; never change facts.`;

async function generateCv(env: Env, profile: Profile): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://sebuzdugan.github.io/AIEngineerCV/',
      'X-Title': 'AIEngineerCV',
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat-v3-0324',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Profile JSON:\n\n${JSON.stringify(profile).slice(0, 20000)}\n\nReturn the CV in Markdown only.` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const cv = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (!cv) throw new Error('Empty completion');
  return cv.replace(/^```(?:markdown)?\s*/i, '').replace(/\s*```$/i, '');
}

// ---- routes ----
async function unlock(req: Request, env: Env): Promise<Response> {
  const { email } = await readBody<{ email?: string }>(req);
  if (!isEmail(email)) return json(req, env, { error: 'invalid_email' }, 400);
  if (isDisposable(email)) return json(req, env, { error: 'disposable_email', message: 'Please use a permanent email address.' }, 400);
  if (await rateLimited(env, 'unlock', clientIp(req), 4)) return json(req, env, { error: 'rate_limited' }, 429);
  const tries = await ensureInit(env, email);
  const follows = (await Promise.all(PLATFORMS.map((p) => env.FREE.get(`follow:${emailKey(email)}:${p}`)))).map(
    (v, i) => (v ? PLATFORMS[i] : null),
  );
  return json(req, env, { token: await signToken(env, email), tries, follows: follows.filter(Boolean) });
}

async function generate(req: Request, env: Env): Promise<Response> {
  const { token, profile } = await readBody<{ token?: string; profile?: Profile }>(req);
  const auth = await verifyToken(env, token);
  if (!auth) return json(req, env, { error: 'unauthorized', message: 'Unlock with your email first.' }, 401);
  if (await rateLimited(env, 'gen', clientIp(req), 6)) return json(req, env, { error: 'rate_limited', message: 'Slow down a moment.' }, 429);
  if (!looksInScope(profile)) return json(req, env, { error: 'out_of_scope', message: 'Add some AI/ML skills or experience first.' }, 422);

  // Daily caps: protect your credits + blunt fake-email farming from a single network.
  const day = dayKey();
  const globalKey = `global:${day}`;
  const ipKey = `ipday:${clientIp(req)}:${day}`;
  if ((await readDaily(env, globalKey)) >= num(env.GLOBAL_DAILY_CAP, 500))
    return json(req, env, { error: 'daily_capacity', message: 'The free demo hit its daily limit. Add your own key, or try again tomorrow.' }, 503);
  if ((await readDaily(env, ipKey)) >= num(env.IP_DAILY_CAP, 3))
    return json(req, env, { error: 'ip_daily_cap', message: 'Daily free limit reached for your network. Add your own key, or come back tomorrow.' }, 429);

  if ((await getTries(env, auth.email)) <= 0)
    return json(req, env, { error: 'no_tries', tries: 0, message: 'No free tries left. Follow for more, or add your own key.' }, 402);

  // Count this attempt against the daily caps, then spend the per-email try.
  await bumpDaily(env, globalKey);
  await bumpDaily(env, ipKey);
  await setTries(env, auth.email, (await getTries(env, auth.email)) - 1); // spend first
  const remaining = await getTries(env, auth.email);
  try {
    const cv = await generateCv(env, profile!);
    return json(req, env, { cv, tries: remaining });
  } catch (e) {
    await setTries(env, auth.email, remaining + 1); // refund on failure
    return json(req, env, { error: 'generation_failed', message: String((e as Error).message), tries: remaining + 1 }, 502);
  }
}

async function grantFollow(req: Request, env: Env): Promise<Response> {
  const { token, platform } = await readBody<{ token?: string; platform?: string }>(req);
  const auth = await verifyToken(env, token);
  if (!auth) return json(req, env, { error: 'unauthorized' }, 401);
  if (!PLATFORMS.includes(platform as Platform)) return json(req, env, { error: 'bad_platform' }, 400);
  const fkey = `follow:${emailKey(auth.email)}:${platform}`;
  const already = await env.FREE.get(fkey);
  let granted = false;
  if (!already) {
    await env.FREE.put(fkey, '1');
    const cap = num(env.MAX_TRIES_CAP, 12);
    await setTries(env, auth.email, Math.min(cap, (await getTries(env, auth.email)) + num(env.FOLLOW_BONUS, 2)));
    granted = true;
  }
  return json(req, env, { granted, tries: await getTries(env, auth.email), bonus: granted ? num(env.FOLLOW_BONUS, 2) : 0 });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req, env) });
    const path = new URL(req.url).pathname;
    if (req.method !== 'POST' || path === '/' || path === '/health') {
      return json(req, env, { ok: true, service: 'aiengineercv-free' });
    }
    try {
      if (path === '/api/unlock') return await unlock(req, env);
      if (path === '/api/generate') return await generate(req, env);
      if (path === '/api/grant-follow') return await grantFollow(req, env);
      return json(req, env, { error: 'not_found' }, 404);
    } catch (e) {
      return json(req, env, { error: 'server_error', message: String((e as Error).message ?? e) }, 500);
    }
  },
};
