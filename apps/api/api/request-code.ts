import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, clientIp, body, isEmail } from '../lib/http';
import { rateLimited, setCode } from '../lib/store';
import { sendCode } from '../lib/email';
import { RL_CODE_PER_MIN } from '../lib/config';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (cors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const { email } = body<{ email?: string }>(req);
  if (!isEmail(email)) {
    res.status(400).json({ error: 'invalid_email' });
    return;
  }
  if (await rateLimited('code', clientIp(req), RL_CODE_PER_MIN)) {
    res.status(429).json({ error: 'rate_limited', message: 'Too many requests. Try again in a minute.' });
    return;
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  try {
    await setCode(email, code);
    await sendCode(email, code);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: 'send_failed', message: (e as Error).message });
  }
}
