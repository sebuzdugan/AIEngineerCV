import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, body } from '../lib/http';
import { verify } from '../lib/token';
import { claimFollow } from '../lib/store';
import { FOLLOW_BONUS, PLATFORMS, type Platform } from '../lib/config';

// Honor-system: we cannot reliably verify follows (X API is paid, Medium has none). Clicking a
// follow button opens the real follow page and calls this to grant +tries, once per platform.

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (cors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const { token, platform } = body<{ token?: string; platform?: string }>(req);
  const auth = verify(token);
  if (!auth) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  if (!PLATFORMS.includes(platform as Platform)) {
    res.status(400).json({ error: 'bad_platform' });
    return;
  }
  const { granted, tries } = await claimFollow(auth.email, platform as Platform, FOLLOW_BONUS);
  res.status(200).json({ granted, tries, bonus: granted ? FOLLOW_BONUS : 0 });
}
