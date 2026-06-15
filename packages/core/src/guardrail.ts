// Guardrail classifier: in-scope / adjacent / out-of-scope. Transparent and deterministic - the
// `reason` is always available, and callers can override (with the warning still shown) via the
// Profile's screening.forced flag. Definitions and messages live in guardrail.md.

import { guardrailMessage } from './load.js';
import { distinctCategories } from './normalize.js';
import type { Profile, GuardrailResult, GuardrailClass } from './types.js';

// Title/role patterns that read as core AI/ML engineering.
const AI_TITLE_RE =
  /\b(ai|ml|machine learning|deep learning|llm|nlp|applied scien|research engineer|mlops|data scien)\w*/i;

function hasAiTitle(profile: Profile): boolean {
  const titles = [
    profile.headline?.text ?? '',
    profile.target?.roleLabel ?? '',
    ...(profile.experience ?? []).map((e) => e.title),
  ];
  // A target role other than 'other' is itself an AI-engineering role signal.
  if (profile.target?.role && profile.target.role !== 'other') return true;
  return titles.some((t) => AI_TITLE_RE.test(t));
}

function hasProdEvidence(profile: Profile): boolean {
  const prodRe = /\b(production|prod|deployed|shipped|live|serving|in production|rolled out)\b/i;
  return (profile.experience ?? []).some((e) =>
    (e.bullets ?? []).some((b) =>
      prodRe.test([b.action, b.system ?? '', (b.tech ?? []).join(' '), b.rendered ?? ''].join(' ')),
    ),
  );
}

export function classify(profile: Profile): GuardrailResult {
  const distinct = distinctCategories(profile).size;
  const aiTitle = hasAiTitle(profile);
  const prod = hasProdEvidence(profile);
  const screeningYes = profile.screening?.buildsAiSystems;

  let cls: GuardrailClass;
  const reasons: string[] = [];

  // Out-of-scope: no AI signal anywhere and an explicit screening "no" (or no signal at all).
  const anyAiSignal = distinct >= 1 || aiTitle;
  if (!anyAiSignal && screeningYes !== true) {
    cls = 'out-of-scope';
    reasons.push('no AI/ML skills, titles, or screening signal');
  } else if ((screeningYes === true && (distinct >= 2 || aiTitle)) || (distinct >= 3)) {
    // In-scope: clear AI signal.
    cls = 'in-scope';
    reasons.push(
      `${distinct} taxonomy categor${distinct === 1 ? 'y' : 'ies'}`,
      ...(aiTitle ? ['AI/ML role signal'] : []),
      ...(prod ? ['production evidence'] : []),
    );
  } else {
    // Adjacent: some signal, below the in-scope bar.
    cls = 'adjacent';
    reasons.push(
      `${distinct} taxonomy categor${distinct === 1 ? 'y' : 'ies'}`,
      screeningYes === true ? 'building AI but thin track record' : 'limited AI signal',
    );
  }

  const messageKey = cls === 'in-scope' ? 'in-scope' : cls === 'adjacent' ? 'adjacent' : 'out-of-scope';

  return {
    class: cls,
    reason: reasons.join(', '),
    message: guardrailMessage(messageKey),
    signals: {
      distinctCategories: distinct,
      hasAiTitle: aiTitle,
      hasProdEvidence: prod,
      screeningYes,
    },
  };
}

/**
 * Decide whether generation should proceed. Out-of-scope blocks unless the user explicitly
 * forced it (screening.forced) - and even then the warning is surfaced by the caller.
 */
export function shouldProceed(result: GuardrailResult, profile: Profile): {
  proceed: boolean;
  forced: boolean;
} {
  if (result.class === 'out-of-scope') {
    const forced = profile.screening?.forced === true;
    return { proceed: forced, forced };
  }
  return { proceed: true, forced: false };
}
