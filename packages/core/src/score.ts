// Deterministic AI Recruiter Score. Reads rubric.yaml signals and scores a Profile 0-100 with
// no LLM and no API key. Pure and reproducible: same Profile in -> same score out.

import { rubric } from './load.js';
import { distinctCategories } from './normalize.js';
import type {
  Profile,
  Bullet,
  CriterionScore,
  Fix,
  ScoreResult,
} from './types.js';

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

function signal<T>(criterionId: string, key: string, fallback: T): T {
  const crit = rubric.criteria.find((c) => c.id === criterionId);
  const v = crit?.signals?.[key];
  return (v === undefined ? fallback : (v as T));
}

function allBullets(profile: Profile): Bullet[] {
  return (profile.experience ?? []).flatMap((e) => e.bullets ?? []);
}

function bulletText(b: Bullet): string {
  return [b.action, b.system ?? '', (b.tech ?? []).join(' '), b.metric ?? '', b.rendered ?? '']
    .join(' ')
    .toLowerCase();
}

function hasMetric(b: Bullet, pattern: RegExp): boolean {
  if (b.metric && b.metric.trim().length > 0) return true;
  return pattern.test(bulletText(b));
}

// ---- per-criterion scorers -> { score 0..1, detail } ----

function scoreSpecificity(profile: Profile): { score: number; detail: string } {
  const bullets = allBullets(profile);
  if (bullets.length === 0) return { score: 0, detail: 'No experience bullets to assess.' };
  const target = signal('specificity', 'bulletsWithSystemAndTechTarget', 0.7);
  const vague = signal<string[]>('specificity', 'vaguePhrases', []);
  const withSystemAndTech = bullets.filter(
    (b) => (b.system?.trim().length ?? 0) > 0 && (b.tech?.length ?? 0) > 0,
  ).length;
  const ratio = withSystemAndTech / bullets.length;
  let score = clamp01(ratio / target);
  const vagueHits = bullets.filter((b) => vague.some((p) => bulletText(b).includes(p))).length;
  const penalty = (vagueHits / bullets.length) * 0.3;
  score = clamp01(score - penalty);
  return {
    score,
    detail: `${withSystemAndTech}/${bullets.length} bullets name a system + tech${
      vagueHits ? `; ${vagueHits} contain vague phrasing` : ''
    }.`,
  };
}

function scoreQuantified(profile: Profile): { score: number; detail: string } {
  const bullets = allBullets(profile);
  if (bullets.length === 0) return { score: 0, detail: 'No bullets to quantify.' };
  const target = signal('quantified-impact', 'bulletsWithMetricTarget', 0.5);
  const pattern = new RegExp(signal('quantified-impact', 'metricPattern', '\\d'), 'i');
  const withMetric = bullets.filter((b) => hasMetric(b, pattern)).length;
  const ratio = withMetric / bullets.length;
  return {
    score: clamp01(ratio / target),
    detail: `${withMetric}/${bullets.length} bullets carry a hard number.`,
  };
}

function scoreVocabulary(profile: Profile): { score: number; detail: string } {
  const target = signal('ai-vocabulary', 'distinctCategoriesTarget', 4);
  const banned = signal<string[]>('ai-vocabulary', 'bannedAsPrimary', []);
  const cats = distinctCategories(profile);
  let score = clamp01(cats.size / target);
  // penalize generic terms used as a primary label (headline or a skill name)
  const primaries = [
    profile.headline?.text ?? '',
    ...(profile.skills ?? []).map((s) => s.name),
  ].map((s) => s.trim().toLowerCase());
  const bannedHits = primaries.filter((p) => banned.includes(p)).length;
  if (bannedHits > 0) score = clamp01(score - 0.2 * bannedHits);
  return {
    score,
    detail: `Touches ${cats.size} of 7 taxonomy categories${
      bannedHits ? `; ${bannedHits} generic term(s) used as a label` : ''
    }.`,
  };
}

function scoreShipped(profile: Profile): { score: number; detail: string } {
  const bullets = allBullets(profile);
  if (bullets.length === 0) return { score: 0, detail: 'No bullets to assess for production evidence.' };
  const target = signal('shipped-to-prod', 'bulletsWithProdSignalTarget', 0.4);
  const prod = signal<string[]>('shipped-to-prod', 'prodTerms', []);
  const exp = signal<string[]>('shipped-to-prod', 'experimentTerms', []);
  const withProd = bullets.filter((b) => prod.some((t) => bulletText(b).includes(t))).length;
  const onlyExperiment = bullets.filter(
    (b) => exp.some((t) => bulletText(b).includes(t)) && !prod.some((t) => bulletText(b).includes(t)),
  ).length;
  const ratio = withProd / bullets.length;
  let score = clamp01(ratio / target);
  score = clamp01(score - (onlyExperiment / bullets.length) * 0.25);
  return { score, detail: `${withProd}/${bullets.length} bullets signal production.` };
}

function scoreCredibility(profile: Profile): { score: number; detail: string } {
  const markers: string[] = [];
  if ((profile.projects?.length ?? 0) > 0) markers.push('projects');
  if ((profile.publications?.length ?? 0) > 0) markers.push('publications');
  if ((profile.certifications?.length ?? 0) > 0) markers.push('certifications');
  if ((profile.links ?? []).some((l) => l.type === 'github')) markers.push('github');
  const score = clamp01(markers.length / 2); // 2+ distinct markers = full credit
  return {
    score,
    detail: markers.length ? `Credibility markers: ${markers.join(', ')}.` : 'No credibility markers found.',
  };
}

function scoreAts(profile: Profile): { score: number; detail: string; missing: string[] } {
  const minSkills = signal('ats-friendliness', 'minSkills', 6);
  const missing: string[] = [];
  let score = 0;
  if (profile.identity?.email) score += 0.4;
  else missing.push('a contact email');
  if (profile.target?.role) score += 0.3;
  else missing.push('a target role');
  if ((profile.skills?.length ?? 0) >= minSkills) score += 0.3;
  else missing.push(`at least ${minSkills} skills`);
  return {
    score: clamp01(score),
    detail: missing.length ? `Missing for ATS: ${missing.join(', ')}.` : 'ATS-parseable: contact, role, and skills present.',
    missing,
  };
}

function scoreSignalNoise(profile: Profile): { score: number; detail: string } {
  const filler = signal<string[]>('signal-to-noise', 'fillerPhrases', []);
  const maxPerRole = signal('signal-to-noise', 'maxBulletsPerRole', 6);
  const maxWords = signal('signal-to-noise', 'maxBulletWords', 32);
  const bullets = allBullets(profile);
  let score = 1;
  const fillerHits = bullets.filter((b) => filler.some((f) => bulletText(b).includes(f))).length;
  if (bullets.length > 0) score -= (fillerHits / bullets.length) * 0.5;
  const overstuffed = (profile.experience ?? []).filter((e) => (e.bullets?.length ?? 0) > maxPerRole).length;
  if (overstuffed > 0) score -= 0.15 * overstuffed;
  const longBullets = bullets.filter((b) => {
    const text = b.rendered ?? `${b.action} ${b.system ?? ''} ${(b.tech ?? []).join(' ')} ${b.metric ?? ''}`;
    return text.trim().split(/\s+/).length > maxWords;
  }).length;
  if (bullets.length > 0) score -= (longBullets / bullets.length) * 0.2;
  return {
    score: clamp01(score),
    detail:
      fillerHits || overstuffed || longBullets
        ? `${fillerHits} filler, ${overstuffed} overstuffed role(s), ${longBullets} long bullet(s).`
        : 'Tight and scannable.',
  };
}

// ---- fix-template filling ----

function weakBullet(profile: Profile, predicate: (b: Bullet) => boolean): string {
  const b = allBullets(profile).find(predicate);
  if (!b) return 'one of your bullets';
  return b.rendered ?? b.action ?? 'one of your bullets';
}

function buildFix(criterionId: string, profile: Profile, ats: { missing: string[] }): Fix {
  const crit = rubric.criteria.find((c) => c.id === criterionId)!;
  let msg = crit.fixTemplate;

  // ai-vocabulary: only suggest replacing a generic term if one is actually used as a label;
  // otherwise the real weakness is narrow category coverage, so say that instead.
  if (criterionId === 'ai-vocabulary') {
    const banned = signal<string[]>('ai-vocabulary', 'bannedAsPrimary', []);
    const primaries = [profile.headline?.text ?? '', ...(profile.skills ?? []).map((s) => s.name)];
    const found = primaries.map((p) => p.toLowerCase()).find((p) => banned.includes(p));
    if (!found) {
      return {
        criterion: crit.name,
        message:
          'Broaden your AI vocabulary - your skills cluster in a few areas. Name techniques across more taxonomy categories (e.g. evals, agents, context engineering) where you genuinely have experience.',
      };
    }
  }

  if (msg.includes('{bullet}')) {
    const example =
      criterionId === 'quantified-impact'
        ? weakBullet(profile, (b) => !b.metric)
        : weakBullet(profile, (b) => !b.system || (b.tech?.length ?? 0) === 0);
    msg = msg.replace('{bullet}', example);
  }
  if (msg.includes('{term}')) {
    const banned = signal<string[]>('ai-vocabulary', 'bannedAsPrimary', []);
    const primaries = [profile.headline?.text ?? '', ...(profile.skills ?? []).map((s) => s.name)];
    const found = primaries.map((p) => p.toLowerCase()).find((p) => banned.includes(p));
    msg = msg.replace('{term}', found ?? 'AI');
  }
  if (msg.includes('{missing}')) {
    msg = msg.replace('{missing}', ats.missing.join(', ') || 'contact and role keywords');
  }
  return { criterion: crit.name, message: msg };
}

// ---- public API ----

export function scoreProfile(profile: Profile): ScoreResult {
  const ats = scoreAts(profile);
  const raw: Record<string, { score: number; detail: string }> = {
    specificity: scoreSpecificity(profile),
    'quantified-impact': scoreQuantified(profile),
    'ai-vocabulary': scoreVocabulary(profile),
    'shipped-to-prod': scoreShipped(profile),
    'credibility-markers': scoreCredibility(profile),
    'ats-friendliness': { score: ats.score, detail: ats.detail },
    'signal-to-noise': scoreSignalNoise(profile),
  };

  const perCriterion: CriterionScore[] = rubric.criteria.map((c) => {
    const r = raw[c.id] ?? { score: 0, detail: 'Not scored.' };
    return {
      id: c.id,
      name: c.name,
      weight: c.weight,
      score: Math.round(r.score * 100) / 100,
      weighted: Math.round(r.score * c.weight * 100) / 100,
      detail: r.detail,
    };
  });

  const total = perCriterion.reduce((sum, c) => sum + c.score * c.weight, 0);
  const score = Math.round(total); // weights sum to 100 -> already 0..100

  const band =
    [...rubric.bands].sort((a, b) => b.min - a.min).find((b) => score >= b.min)?.label ?? '';

  const top3Fixes = [...perCriterion]
    .filter((c) => c.score < 0.85)
    .sort((a, b) => a.score * a.weight - b.score * b.weight)
    .slice(0, 3)
    .map((c) => buildFix(c.id, profile, ats));

  const shareCard = `My AI Recruiter Score: ${score} - built with AIEngineerCV by @sebuzdugan`;

  return { score, band, perCriterion, top3Fixes, shareCard };
}
