// Local smoke test for the generation path only (no Redis/email needed).
// Run: OPENROUTER_API_KEY=sk-or-... node --import tsx apps/api/test/smoke.ts
import { generateCv, looksInScope, type Profile } from '../lib/generate';

const profile: Profile & Record<string, unknown> = {
  schemaVersion: '1.0',
  identity: { name: 'Maya Okafor', email: 'maya@example.com', location: 'Berlin' },
  target: { role: 'llm-ai-engineer', seniority: 'senior', companyType: 'ai-startup' },
  headline: { text: 'LLM Systems Engineer' },
  skills: [
    { name: 'RAG', category: 'retrieval-knowledge' },
    { name: 'Evals', category: 'evaluation-reliability' },
  ],
  experience: [
    {
      org: 'Helix AI',
      title: 'Senior LLM Engineer',
      startDate: '2022-03',
      endDate: 'present',
      bullets: [
        {
          action: 'Built a production document-QA assistant',
          system: 'Helix Answers',
          tech: ['OCR', 'hybrid retrieval', 'cross-encoder re-ranking'],
          metric: 'serving 12k+ documents to 200+ daily users',
        },
        // deliberately NO metric here - the model must NOT invent one
        { action: 'Designed an LLM-as-judge eval harness', system: 'Helix eval suite', tech: ['LLM-as-judge'] },
      ],
    },
  ],
  screening: { buildsAiSystems: true },
};

console.log('looksInScope:', looksInScope(profile));
const cv = await generateCv(profile);
console.log('\n===== generated CV =====\n');
console.log(cv);

// anti-hallucination spot check: the second bullet had no metric; flag obvious invented percentages
const invented = /\b\d{1,3}%/.test(cv.split('eval harness')[1]?.split('\n')[0] ?? '');
console.log('\n[check] suspicious invented % right after the metric-less bullet:', invented ? 'POSSIBLE - inspect' : 'none detected');
