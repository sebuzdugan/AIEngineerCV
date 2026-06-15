import { describe, it, expect } from 'vitest';
import {
  scoreProfile,
  classify,
  shouldProceed,
  gaps,
  nextQuestion,
  renderCv,
  validateProfile,
  distinctCategories,
  type Profile,
} from '../src/index.js';
import { loadExample } from './fixtures.js';

function base(): Profile {
  return {
    schemaVersion: '1.0',
    identity: { name: 'Test User', email: 't@x.com', source: 'asked', confidence: 1 },
    target: { role: 'llm-ai-engineer', seniority: 'mid', companyType: 'ai-startup' },
    skills: [
      { name: 'RAG', category: 'retrieval-knowledge', source: 'asked', confidence: 1 },
      { name: 'Evals', category: 'evaluation-reliability', source: 'asked', confidence: 1 },
    ],
    experience: [
      {
        org: 'Co',
        title: 'ML Engineer',
        startDate: '2021',
        source: 'asked',
        confidence: 1,
        bullets: [{ action: 'Built a search feature', system: 'search', tech: ['RAG'], source: 'asked', confidence: 1 }],
      },
    ],
    links: [{ type: 'github', url: 'https://github.com/x' }],
    screening: { buildsAiSystems: true },
  };
}

describe('journey: scoring invariants', () => {
  it('always returns a score in [0,100] across all examples and edge profiles', () => {
    const profiles = [
      loadExample('senior-llm-rag-engineer'),
      loadExample('mlops-engineer'),
      loadExample('adjacent-backend-pivot'),
      base(),
      { schemaVersion: '1.0', identity: { name: 'X', source: 'asked', confidence: 1 }, target: { role: 'other' } } as Profile,
    ];
    for (const p of profiles) {
      const s = scoreProfile(p);
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
      expect(s.perCriterion).toHaveLength(7);
    }
  });

  it('adding a metric to a bullet does not lower the score (and usually raises it)', () => {
    const p = base();
    const before = scoreProfile(p).score;
    const withMetric = structuredClone(p);
    withMetric.experience![0]!.bullets![0]!.metric = 'serving 5k requests/sec';
    const after = scoreProfile(withMetric).score;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it('the share card always carries the score and the maintainer credit', () => {
    for (const name of ['senior-llm-rag-engineer', 'mlops-engineer', 'adjacent-backend-pivot'] as const) {
      const s = scoreProfile(loadExample(name));
      expect(s.shareCard).toContain(String(s.score));
      expect(s.shareCard).toContain('@sebuzdugan');
    }
  });

  it('is fully deterministic across repeated calls', () => {
    const p = loadExample('mlops-engineer');
    expect(scoreProfile(p)).toEqual(scoreProfile(p));
    expect(classify(p)).toEqual(classify(p));
  });
});

describe('journey: guardrail across the three classes', () => {
  it('classifies strong AI profiles in-scope and lets them proceed', () => {
    const p = loadExample('senior-llm-rag-engineer');
    const g = classify(p);
    expect(g.class).toBe('in-scope');
    expect(shouldProceed(g, p).proceed).toBe(true);
  });

  it('classifies the backend pivot as adjacent (still proceeds)', () => {
    const g = classify(loadExample('adjacent-backend-pivot'));
    expect(g.class).toBe('adjacent');
    expect(shouldProceed(g, loadExample('adjacent-backend-pivot')).proceed).toBe(true);
  });

  it('blocks an out-of-scope profile unless explicitly forced', () => {
    const oos: Profile = {
      schemaVersion: '1.0',
      identity: { name: 'Pat', source: 'asked', confidence: 1 },
      target: { role: 'other', roleLabel: 'Marketing Manager' },
      screening: { buildsAiSystems: false },
    };
    const g = classify(oos);
    expect(g.class).toBe('out-of-scope');
    expect(shouldProceed(g, oos).proceed).toBe(false);
    const forced = shouldProceed(g, { ...oos, screening: { buildsAiSystems: false, forced: true } });
    expect(forced.proceed).toBe(true);
    expect(forced.forced).toBe(true);
  });

  it('a "yes" screen with strong skills tips a borderline profile in-scope', () => {
    const p = base();
    expect(classify(p).class).toBe('in-scope');
  });
});

describe('journey: the interview shrinks as the profile fills in', () => {
  it('asks screening first on an empty profile', () => {
    const empty: Profile = { schemaVersion: '1.0', identity: { name: '', source: 'asked', confidence: 1 }, target: { role: 'other' } };
    expect(nextQuestion(empty)?.id).toBe('screening');
  });

  it('stops asking a question once its field is set', () => {
    const empty: Profile = { schemaVersion: '1.0', identity: { name: 'A', source: 'asked', confidence: 1 }, target: { role: 'other' } };
    expect(gaps(empty).map((q) => q.id)).toContain('seniority');
    const filled = { ...empty, target: { ...empty.target, seniority: 'senior' as const } };
    expect(gaps(filled).map((q) => q.id)).not.toContain('seniority');
  });

  it('a complete strong profile asks no high-value content questions', () => {
    const ids = gaps(loadExample('senior-llm-rag-engineer')).map((q) => q.id);
    expect(ids).not.toContain('flagship-project');
    expect(ids).not.toContain('contact');
    expect(ids).not.toContain('target-role');
  });
});

describe('journey: rendering', () => {
  it('renders a minimal profile without crashing and includes the name', () => {
    const min: Profile = { schemaVersion: '1.0', identity: { name: 'Solo Dev', source: 'asked', confidence: 1 }, target: { role: 'other' } };
    const md = renderCv(min);
    expect(md).toContain('# Solo Dev');
  });

  it('renders all major sections for a full profile', () => {
    const md = renderCv(loadExample('senior-llm-rag-engineer'));
    for (const section of ['## Skills', '## Experience', '## Projects', '## Publications', '## Education']) {
      expect(md).toContain(section);
    }
  });

  it('never emits the literal raw newline placeholder or undefined', () => {
    const md = renderCv(loadExample('mlops-engineer'));
    expect(md).not.toContain('undefined');
    expect(md).not.toContain('[object Object]');
  });
});

describe('journey: validation + normalization', () => {
  it('accepts every example and rejects a bad enum', () => {
    for (const name of ['senior-llm-rag-engineer', 'mlops-engineer', 'adjacent-backend-pivot'] as const) {
      expect(validateProfile(loadExample(name)).valid).toBe(true);
    }
    const bad = { ...loadExample('mlops-engineer'), target: { role: 'astronaut' } };
    expect(validateProfile(bad).valid).toBe(false);
  });

  it('detects taxonomy categories from both explicit skills and free-text bullets', () => {
    const cats = distinctCategories(loadExample('senior-llm-rag-engineer'));
    expect(cats.has('retrieval-knowledge')).toBe(true);
    expect(cats.size).toBeGreaterThanOrEqual(4);
  });
});
