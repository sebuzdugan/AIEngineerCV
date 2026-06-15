// Maps messy text onto the taxonomy. Shared by score.ts (vocabulary criterion) and
// guardrail.ts (taxonomy density). Pure and deterministic.

import { taxonomy } from './generated/assets.js';
import type { Profile } from './types.js';

export interface AliasHit {
  categoryId: string;
  canonical: string;
}

// alias/canonical (lowercased) -> category + canonical name
let aliasIndex: Map<string, AliasHit> | null = null;

function getAliasIndex(): Map<string, AliasHit> {
  if (aliasIndex) return aliasIndex;
  const idx = new Map<string, AliasHit>();
  for (const cat of taxonomy.categories) {
    for (const skill of cat.skills) {
      const hit: AliasHit = { categoryId: cat.id, canonical: skill.canonical };
      idx.set(skill.canonical.toLowerCase(), hit);
      for (const alias of skill.aliases ?? []) {
        idx.set(alias.toLowerCase(), hit);
      }
    }
  }
  // synonyms map can point a surface form at a category even without a canonical skill
  for (const [surface, syn] of Object.entries(taxonomy.synonyms ?? {})) {
    if (!idx.has(surface.toLowerCase())) {
      idx.set(surface.toLowerCase(), {
        categoryId: syn.category,
        canonical: syn.canonical || surface,
      });
    }
  }
  aliasIndex = idx;
  return idx;
}

/** Find taxonomy hits in a free-text blob via word-boundary alias matching. */
export function hitsInText(text: string): AliasHit[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const hits: AliasHit[] = [];
  for (const [alias, hit] of getAliasIndex()) {
    if (alias.length < 2) continue;
    // word-boundary-ish match; escape regex metachars in the alias
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
    if (re.test(lower)) hits.push(hit);
  }
  return hits;
}

/** Concatenate the text-bearing fields of a profile relevant to skill detection. */
export function profileText(profile: Profile): string {
  const parts: string[] = [];
  for (const s of profile.skills ?? []) {
    parts.push(s.name, s.raw ?? '');
  }
  for (const e of profile.experience ?? []) {
    parts.push(e.title);
    for (const b of e.bullets ?? []) {
      parts.push(b.action, b.system ?? '', (b.tech ?? []).join(' '), b.rendered ?? '');
    }
  }
  for (const p of profile.projects ?? []) {
    parts.push(p.name, p.role ?? '', p.shipped ?? '', (p.tech ?? []).join(' '));
  }
  return parts.join(' \n ');
}

/** Distinct taxonomy categories touched by a profile (explicit skill categories + text hits). */
export function distinctCategories(profile: Profile): Set<string> {
  const cats = new Set<string>();
  for (const s of profile.skills ?? []) cats.add(s.category);
  for (const hit of hitsInText(profileText(profile))) cats.add(hit.categoryId);
  return cats;
}
