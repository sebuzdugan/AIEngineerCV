import { describe, it, expect } from 'vitest';
import { classify, shouldProceed } from '../src/guardrail.js';
import { loadExample } from './fixtures.js';
import type { Profile } from '../src/types.js';

describe('guardrail classifier', () => {
  it('classifies the strong AI profiles as in-scope', () => {
    expect(classify(loadExample('senior-llm-rag-engineer')).class).toBe('in-scope');
    expect(classify(loadExample('mlops-engineer')).class).toBe('in-scope');
  });

  it('classifies the backend pivot as adjacent', () => {
    const r = classify(loadExample('adjacent-backend-pivot'));
    expect(r.class).toBe('adjacent');
    expect(r.message).toMatch(/adjacent|tuned for/i);
  });

  it('classifies a non-technical profile as out-of-scope', () => {
    const outOfScope: Profile = {
      schemaVersion: '1.0',
      identity: { name: 'Pat Marketing', source: 'asked', confidence: 1 },
      target: { role: 'other', roleLabel: 'Marketing Manager' },
      headline: { text: 'Marketing Manager', source: 'asked', confidence: 1 },
      skills: [],
      experience: [
        {
          org: 'BrandCo',
          title: 'Marketing Manager',
          startDate: '2018',
          source: 'asked',
          confidence: 1,
          bullets: [
            { action: 'Ran campaigns and managed the social calendar', source: 'asked', confidence: 1 },
          ],
        },
      ],
      screening: { buildsAiSystems: false },
    };
    const r = classify(outOfScope);
    expect(r.class).toBe('out-of-scope');
  });

  it('blocks out-of-scope unless forced, and never bypasses silently', () => {
    const base: Profile = {
      schemaVersion: '1.0',
      identity: { name: 'Pat', source: 'asked', confidence: 1 },
      target: { role: 'other' },
      screening: { buildsAiSystems: false },
    };
    const result = classify(base);
    expect(result.class).toBe('out-of-scope');
    expect(shouldProceed(result, base).proceed).toBe(false);

    const forced: Profile = { ...base, screening: { buildsAiSystems: false, forced: true } };
    const forcedDecision = shouldProceed(result, forced);
    expect(forcedDecision.proceed).toBe(true);
    expect(forcedDecision.forced).toBe(true);
  });

  it('always exposes a transparent reason', () => {
    expect(classify(loadExample('mlops-engineer')).reason.length).toBeGreaterThan(0);
  });
});
