import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, clientIp, body } from '../lib/http';
import { verify } from '../lib/token';
import { rateLimited, getTries, spendTry, refundTry } from '../lib/store';
import { generateCv, looksInScope, type Profile } from '../lib/generate';
import { RL_GEN_PER_MIN } from '../lib/config';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (cors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const { token, profile } = body<{ token?: string; profile?: Profile }>(req);
  const auth = verify(token);
  if (!auth) {
    res.status(401).json({ error: 'unauthorized', message: 'Verify your email to use a free try.' });
    return;
  }
  if (await rateLimited('gen', clientIp(req), RL_GEN_PER_MIN)) {
    res.status(429).json({ error: 'rate_limited', message: 'Slow down a moment, then try again.' });
    return;
  }
  if (!profile || !looksInScope(profile)) {
    res.status(422).json({ error: 'out_of_scope', message: 'Add some AI/ML skills or experience first.' });
    return;
  }
  if ((await getTries(auth.email)) <= 0) {
    res.status(402).json({ error: 'no_tries', tries: 0, message: 'No free tries left. Follow to earn more, or add your own key.' });
    return;
  }

  // Spend first (prevents a race from double-spending), refund on failure.
  const remaining = await spendTry(auth.email);
  try {
    const cv = await generateCv(profile);
    res.status(200).json({ cv, tries: remaining });
  } catch (e) {
    await refundTry(auth.email);
    res.status(502).json({ error: 'generation_failed', message: (e as Error).message, tries: remaining + 1 });
  }
}
