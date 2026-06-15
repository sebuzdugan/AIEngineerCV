import { describe, it, expect } from 'vitest';
import { scoreProfile } from '../src/score.js';
import { loadExample } from './fixtures.js';

describe('scoreProfile', () => {
  it('is deterministic (same input -> same output)', () => {
    const p = loadExample('senior-llm-rag-engineer');
    expect(scoreProfile(p)).toEqual(scoreProfile(p));
  });

  it('scores the strong LLM/RAG profile highly', () => {
    const r = scoreProfile(loadExample('senior-llm-rag-engineer'));
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.band).toMatch(/Strong|Solid/);
  });

  it('produces a share card with the score and the maintainer credit', () => {
    const r = scoreProfile(loadExample('mlops-engineer'));
    expect(r.shareCard).toContain(String(r.score));
    expect(r.shareCard).toContain('@sebuzdugan');
  });

  it('weights sum to 100 and the total is the weighted sum', () => {
    const r = scoreProfile(loadExample('mlops-engineer'));
    const totalWeight = r.perCriterion.reduce((s, c) => s + c.weight, 0);
    expect(totalWeight).toBe(100);
    const recomputed = Math.round(r.perCriterion.reduce((s, c) => s + c.score * c.weight, 0));
    expect(r.score).toBe(recomputed);
  });

  it('rewards quantified impact: stripping metrics lowers the score', () => {
    const p = loadExample('senior-llm-rag-engineer');
    const withMetrics = scoreProfile(p);
    const stripped = structuredClone(p);
    for (const e of stripped.experience ?? []) {
      for (const b of e.bullets ?? []) delete b.metric;
    }
    const withoutMetrics = scoreProfile(stripped);
    expect(withoutMetrics.score).toBeLessThan(withMetrics.score);
  });

  it('surfaces at most 3 fixes, each tied to a real criterion', () => {
    const r = scoreProfile(loadExample('adjacent-backend-pivot'));
    expect(r.top3Fixes.length).toBeLessThanOrEqual(3);
    for (const fix of r.top3Fixes) {
      expect(fix.criterion).toBeTruthy();
      expect(fix.message).toBeTruthy();
    }
  });
});
