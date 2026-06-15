import { scoreProfile, classify, type Profile } from '@aiengineercv/core';
import { loadProfile } from '../lib/io.js';
import { printScore, printGuardrail } from '../lib/ui.js';

/** Score a given profile object and print guardrail + score. Reused by init. */
export function runScreenAndScore(profile: Profile, opts: { quiet?: boolean } = {}): void {
  const g = classify(profile);
  if (!opts.quiet || g.class !== 'in-scope') printGuardrail(g);
  printScore(scoreProfile(profile));
}

export function scoreCommand(): void {
  const profile = loadProfile();
  runScreenAndScore(profile);
}
