import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, body, isEmail } from '../lib/http';
import { checkCode, ensureInit, claimedFollows } from '../lib/store';
import { sign } from '../lib/token';
import { INITIAL_FREE_TRIES } from '../lib/config';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (cors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const { email, code } = body<{ email?: string; code?: string }>(req);
  if (!isEmail(email) || !/^\d{6}$/.test(code ?? '')) {
    res.status(400).json({ error: 'invalid_input' });
    return;
  }
  const ok = await checkCode(email, code!);
  if (!ok) {
    res.status(401).json({ error: 'bad_code', message: 'That code is wrong or expired.' });
    return;
  }
  const tries = await ensureInit(email, INITIAL_FREE_TRIES);
  res.status(200).json({
    token: sign(email),
    tries,
    follows: await claimedFollows(email),
  });
}
