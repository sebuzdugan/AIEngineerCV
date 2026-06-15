// Gap detection: given a Profile, return only the smart-questions whose trigger still fires,
// in priority order. The golden rule of the interview: ask only what wasn't parsed.

import { questionBank } from './load.js';
import type { Profile, Question } from './types.js';

function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function isEmptyScalar(v: unknown): boolean {
  return v === undefined || v === null || v === '' || (typeof v === 'number' && Number.isNaN(v));
}

function isEmptyArray(v: unknown): boolean {
  return !Array.isArray(v) || v.length === 0;
}

function noBulletHasMetric(profile: Profile): boolean {
  const bullets = (profile.experience ?? []).flatMap((e) => e.bullets ?? []);
  if (bullets.length === 0) return true;
  return !bullets.some((b) => (b.metric?.trim().length ?? 0) > 0);
}

/** Does this question's trigger still fire for the given profile? */
export function triggers(question: Question, profile: Profile): boolean {
  const { type, path } = question.trigger;
  switch (type) {
    case 'missing':
      return isEmptyScalar(getByPath(profile, path ?? ''));
    case 'emptyArray':
      return isEmptyArray(getByPath(profile, path ?? ''));
    case 'noBulletMetric':
      return noBulletHasMetric(profile);
    case 'always':
      return isEmptyScalar(getByPath(profile, question.maps_to));
    default:
      return false;
  }
}

/** The ordered list of questions still worth asking. */
export function gaps(profile: Profile): Question[] {
  return [...questionBank.questions]
    .filter((q) => triggers(q, profile))
    .sort((a, b) => a.priority - b.priority);
}

/** Convenience: the next single question to ask, or null if the Profile is complete enough. */
export function nextQuestion(profile: Profile): Question | null {
  return gaps(profile)[0] ?? null;
}
