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
  // --- lead collection + email delivery (all optional; features no-op if unset) ---
  ADMIN_KEY?: string; // secret: gates the /api/leads dashboard. If unset, the dashboard is disabled.
  RESEND_API_KEY?: string; // secret: enables emailing the CV to the person. If unset, no email is sent.
  RESEND_FROM?: string; // var: the From address for the CV email (needs a verified Resend domain for real inboxes).
  EMAIL_REPLY_TO?: string; // var: optional Reply-To (e.g. your own address).
  LEAD_WEBHOOK_URL?: string; // secret: POSTs each new lead to a Google Sheet Apps Script (or any webhook). No-op if unset.
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
const leadKey = (e: string): string => `lead:${emailKey(e)}`;
const genCountKey = (e: string): string => `genc:${emailKey(e)}`;

async function getTries(env: Env, email: string): Promise<number> {
  return num((await env.FREE.get(triesKey(email))) ?? undefined, 0);
}
async function setTries(env: Env, email: string, n: number): Promise<void> {
  await env.FREE.put(triesKey(email), String(Math.max(0, n)));
}
async function getGenCount(env: Env, email: string): Promise<number> {
  return num((await env.FREE.get(genCountKey(email))) ?? undefined, 0);
}
async function bumpGenCount(env: Env, email: string): Promise<void> {
  await env.FREE.put(genCountKey(email), String((await getGenCount(env, email)) + 1));
}
// Returns the current try balance and whether this call created a brand-new lead.
async function ensureInit(env: Env, email: string): Promise<{ tries: number; isNew: boolean }> {
  const initFlag = `init:${emailKey(email)}`;
  let isNew = false;
  if (!(await env.FREE.get(initFlag))) {
    isNew = true;
    await env.FREE.put(initFlag, '1');
    await env.FREE.put(leadKey(email), new Date().toISOString()); // lead list (export via /api/leads)
    await setTries(env, email, num(env.INITIAL_FREE_TRIES, 1));
  }
  return { tries: await getTries(env, email), isNew };
}

// POST a new lead to a Google Sheet Apps Script webhook (or any URL). Best-effort; failures are swallowed.
async function forwardLead(env: Env, email: string): Promise<void> {
  if (!env.LEAD_WEBHOOK_URL) return;
  try {
    await fetch(env.LEAD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailKey(email), at: new Date().toISOString(), source: 'aiengineercv' }),
    });
  } catch {
    /* best-effort: never block the user on lead forwarding */
  }
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Email the generated CV to the person via Resend. Returns true if the send succeeded.
// No-ops (returns false) when RESEND_API_KEY is unset. Reaching arbitrary inboxes needs a
// Resend-verified domain in RESEND_FROM; the default onboarding sender only reaches your own address.
async function emailCv(env: Env, to: string, cv: string): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  const from = env.RESEND_FROM || 'AIEngineerCV <onboarding@resend.dev>';
  const appUrl = 'https://sebuzdugan.github.io/AIEngineerCV/';
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0e1113;line-height:1.5">
  <p>Here's your AI-engineer CV, generated by <a href="${appUrl}">AIEngineerCV</a>. Paste the Markdown below into the app to edit, restyle, or export as PDF.</p>
  <pre style="white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;background:#f5f6f7;border:1px solid #e3e5e7;border-radius:8px;padding:16px;overflow:auto">${escapeHtml(cv)}</pre>
  <p style="color:#7d858b;font-size:12px">You received this because you requested a free CV generation at ${appUrl}.</p>
</div>`;
  const body: Record<string, unknown> = {
    from,
    to,
    subject: 'Your AI Engineer CV',
    text: `Here's your AI-engineer CV, generated by AIEngineerCV.\n\n${cv}\n\n— Edit or export it at ${appUrl}`,
    html,
  };
  if (env.EMAIL_REPLY_TO) body.reply_to = env.EMAIL_REPLY_TO;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---- routes ----
async function unlock(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const { email } = await readBody<{ email?: string }>(req);
  if (!isEmail(email)) return json(req, env, { error: 'invalid_email' }, 400);
  if (isDisposable(email)) return json(req, env, { error: 'disposable_email', message: 'Please use a permanent email address.' }, 400);
  if (await rateLimited(env, 'unlock', clientIp(req), 4)) return json(req, env, { error: 'rate_limited' }, 429);
  const { tries, isNew } = await ensureInit(env, email);
  if (isNew) ctx.waitUntil(forwardLead(env, email)); // push to your sheet/webhook without blocking the response
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
    await bumpGenCount(env, auth.email); // for the leads dashboard: how many CVs this person generated
    const emailed = await emailCv(env, auth.email, cv); // best-effort copy to their inbox
    return json(req, env, { cv, tries: remaining, emailed });
  } catch (e) {
    await setTries(env, auth.email, remaining + 1); // refund on failure
    return json(req, env, { error: 'generation_failed', message: String((e as Error).message), tries: remaining + 1 }, 502);
  }
}

// ---- admin: your lead list (email dashboard) ----
interface Lead {
  email: string;
  firstSeen: string;
  generated: number;
  triesLeft: number;
}

async function collectLeads(env: Env): Promise<Lead[]> {
  const leads: Lead[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.FREE.list({ prefix: 'lead:', cursor });
    for (const k of page.keys) {
      const email = k.name.slice('lead:'.length);
      const [firstSeen, generated, triesLeft] = await Promise.all([
        env.FREE.get(k.name),
        getGenCount(env, email),
        getTries(env, email),
      ]);
      leads.push({ email, firstSeen: firstSeen ?? '', generated, triesLeft });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  // newest first
  leads.sort((a, b) => (a.firstSeen < b.firstSeen ? 1 : a.firstSeen > b.firstSeen ? -1 : 0));
  return leads;
}

function leadsCsv(leads: Lead[]): string {
  const esc = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = [['email', 'first_seen', 'generated', 'tries_left']];
  for (const l of leads) rows.push([l.email, l.firstSeen, String(l.generated), String(l.triesLeft)]);
  return rows.map((r) => r.map(esc).join(',')).join('\r\n');
}

function leadsHtml(leads: Lead[], key: string): string {
  const totalGen = leads.reduce((n, l) => n + l.generated, 0);
  const rows = leads
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.email)}</td><td>${escapeHtml(l.firstSeen)}</td><td class="n">${l.generated}</td><td class="n">${l.triesLeft}</td></tr>`,
    )
    .join('');
  const csvHref = `?key=${encodeURIComponent(key)}&format=csv`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AIEngineerCV — leads</title>
<style>
  body{margin:0;background:#0a0c0d;color:#dfe3e5;font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
  .wrap{max-width:880px;margin:0 auto;padding:28px 20px}
  h1{font-size:16px;color:#9fe870;letter-spacing:.12em;text-transform:uppercase;margin:0 0 4px}
  .sub{color:#9aa1a6;font-size:12px;margin-bottom:18px}
  a.btn{display:inline-block;margin-bottom:18px;padding:7px 12px;border:1px solid #2f5a32;border-radius:8px;color:#bfe8c2;text-decoration:none}
  a.btn:hover{background:#10220f}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #1c2124}
  th{color:#7d858b;font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:.08em}
  td.n,th.n{text-align:right}
  tr:hover td{background:#0e1311}
  .empty{color:#7d858b;padding:24px 0}
</style></head><body><div class="wrap">
<h1>Your leads</h1>
<div class="sub">${leads.length} email${leads.length === 1 ? '' : 's'} collected · ${totalGen} CV${totalGen === 1 ? '' : 's'} generated</div>
<a class="btn" href="${csvHref}">⬇ Download CSV</a>
${
  leads.length
    ? `<table><thead><tr><th>Email</th><th>First seen (UTC)</th><th class="n">CVs</th><th class="n">Tries left</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<div class="empty">No leads yet. They appear here as soon as someone unlocks a free try.</div>'
}
</div></body></html>`;
}

async function leads(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const key = url.searchParams.get('key') ?? req.headers.get('X-Admin-Key') ?? '';
  // If no ADMIN_KEY is configured, the dashboard stays closed (never open to the public).
  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
    return new Response('unauthorized', { status: 401, headers: { 'Content-Type': 'text/plain' } });
  }
  const format = url.searchParams.get('format') ?? 'html';
  const all = await collectLeads(env);
  if (format === 'json') return json(req, env, { count: all.length, leads: all });
  if (format === 'csv') {
    return new Response(leadsCsv(all), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="aiengineercv-leads.csv"',
      },
    });
  }
  return new Response(leadsHtml(all, key), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
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
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req, env) });
    const path = new URL(req.url).pathname;
    try {
      // Admin dashboard is a GET so you can open it in a browser.
      if (path === '/api/leads') return await leads(req, env);
      if (req.method === 'POST') {
        if (path === '/api/unlock') return await unlock(req, env, ctx);
        if (path === '/api/generate') return await generate(req, env);
        if (path === '/api/grant-follow') return await grantFollow(req, env);
      }
      if (path === '/' || path === '/health') return json(req, env, { ok: true, service: 'aiengineercv-free' });
      return json(req, env, { error: 'not_found' }, 404);
    } catch (e) {
      return json(req, env, { error: 'server_error', message: String((e as Error).message ?? e) }, 500);
    }
  },
};
