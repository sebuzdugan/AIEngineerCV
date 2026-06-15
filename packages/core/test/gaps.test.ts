import { describe, it, expect } from 'vitest';
import { gaps, nextQuestion } from '../src/gaps.js';
import { loadExample } from './fixtures.js';
import type { Profile } from '../src/types.js';

describe('gap detection', () => {
  it('asks nothing already present: a complete profile only triggers the screening recap at most', () => {
    const ids = gaps(loadExample('senior-llm-rag-engineer')).map((q) => q.id);
    // Everything substantive is parsed/asked already; screening is answered too.
    expect(ids).not.toContain('target-role');
    expect(ids).not.toContain('contact');
    expect(ids).not.toContain('flagship-project');
  });

  it('asks the high-value questions for a sparse profile', () => {
    const sparse: Profile = {
      schemaVersion: '1.0',
      identity: { name: 'New Grad', source: 'asked', confidence: 1 },
      target: { role: 'other' },
    };
    const ids = gaps(sparse).map((q) => q.id);
    expect(ids).toContain('screening');
    expect(ids).toContain('seniority');
    expect(ids).toContain('flagship-project');
    expect(ids).toContain('contact');
  });

  it('orders questions by priority (screening first)', () => {
    const sparse: Profile = {
      schemaVersion: '1.0',
      identity: { name: 'New Grad', source: 'asked', confidence: 1 },
      target: { role: 'other' },
    };
    expect(nextQuestion(sparse)?.id).toBe('screening');
  });

  it('triggers metric probes when no bullet has a number', () => {
    const noMetrics: Profile = {
      schemaVersion: '1.0',
      identity: { name: 'X', email: 'x@y.com', source: 'asked', confidence: 1 },
      target: {
        role: 'llm-ai-engineer',
        seniority: 'mid',
        yearsInAiMl: 3,
        companyType: 'ai-startup',
        locationPreference: 'remote',
        pageLength: 'one-page',
      },
      skills: [{ name: 'RAG', category: 'retrieval-knowledge', source: 'asked', confidence: 1 }],
      links: [{ type: 'github', url: 'https://github.com/x' }],
      experience: [
        {
          org: 'Co',
          title: 'Engineer',
          startDate: '2021',
          source: 'asked',
          confidence: 1,
          bullets: [{ action: 'Built a RAG system', source: 'asked', confidence: 1 }],
        },
      ],
      screening: { buildsAiSystems: true },
    };
    const ids = gaps(noMetrics).map((q) => q.id);
    expect(ids).toContain('flagship-scale');
    expect(ids).toContain('metric-latency-cost');
  });
});
