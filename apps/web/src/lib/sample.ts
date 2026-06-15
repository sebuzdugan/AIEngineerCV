import type { Profile } from '@aiengineercv/core';

// A strong in-scope sample so visitors can see a high score and a polished CV in one click.
export const sampleProfile: Profile = {
  schemaVersion: '1.0',
  identity: { name: 'Maya Okafor', email: 'maya.okafor@example.com', location: 'Berlin, Germany', source: 'parsed', confidence: 1 },
  target: { role: 'llm-ai-engineer', seniority: 'senior', yearsInAiMl: 6, companyType: 'ai-startup', locationPreference: 'remote', pageLength: 'one-page' },
  headline: { text: 'LLM Systems Engineer', source: 'asked', confidence: 1 },
  summary: {
    text: 'Senior LLM engineer who ships retrieval systems to production. Built a document-QA platform serving 12k+ documents to 200+ daily users, and cut answer latency 60% with a hybrid-retrieval rebuild.',
    source: 'asked',
    confidence: 1,
  },
  skills: [
    { name: 'RAG', category: 'retrieval-knowledge', level: 'expert', source: 'parsed', confidence: 1 },
    { name: 'Hybrid search', category: 'retrieval-knowledge', level: 'expert', source: 'parsed', confidence: 1 },
    { name: 'Re-ranking', category: 'retrieval-knowledge', level: 'proficient', source: 'parsed', confidence: 1 },
    { name: 'Embeddings', category: 'retrieval-knowledge', level: 'expert', source: 'parsed', confidence: 1 },
    { name: 'Vector databases', category: 'retrieval-knowledge', level: 'expert', source: 'parsed', confidence: 1 },
    { name: 'Context engineering', category: 'context-engineering', level: 'expert', source: 'parsed', confidence: 1 },
    { name: 'Evals', category: 'evaluation-reliability', level: 'proficient', source: 'parsed', confidence: 1 },
    { name: 'LLM-as-judge', category: 'evaluation-reliability', level: 'proficient', source: 'parsed', confidence: 1 },
    { name: 'Latency & cost optimization', category: 'serving-mlops', level: 'expert', source: 'parsed', confidence: 1 },
    { name: 'LLM/SLM fine-tuning', category: 'llm-generative', level: 'proficient', source: 'parsed', confidence: 1 },
  ],
  experience: [
    {
      org: 'Helix AI',
      title: 'Senior LLM Engineer',
      location: 'Remote',
      startDate: '2022-03',
      endDate: 'present',
      source: 'parsed',
      confidence: 1,
      bullets: [
        {
          action: 'Built and shipped a production document-QA assistant',
          system: 'Helix Answers',
          tech: ['OCR ingestion', 'intelligent chunking', 'embedding generation', 'vector indexing', 'hybrid retrieval', 'query rewriting'],
          metric: 'serving 12k+ documents to 200+ daily users',
          source: 'asked',
          confidence: 1,
        },
        {
          action: 'Rebuilt the retrieval stack with hybrid BM25 + dense search and cross-encoder re-ranking',
          system: 'Helix Answers',
          tech: ['BM25', 'dense retrieval', 'cross-encoder re-ranking', 'pgvector'],
          metric: 'cut p95 answer latency from 240ms to 90ms and raised retrieval recall +18pts',
          source: 'asked',
          confidence: 1,
        },
        {
          action: 'Designed an LLM-as-judge eval harness gating every prompt and model change in CI',
          system: 'Helix eval suite',
          tech: ['LLM-as-judge', 'golden datasets', 'regression testing'],
          metric: 'raised eval pass-rate from 72% to 91% over two quarters',
          source: 'asked',
          confidence: 1,
        },
      ],
    },
  ],
  projects: [
    {
      name: 'rerank-lite',
      repo: 'https://github.com/example/rerank-lite',
      role: 'Author and maintainer',
      stars: 640,
      usage: '~4k downloads/month',
      shipped: 'A small cross-encoder re-ranking library with ONNX export.',
      source: 'parsed',
      confidence: 1,
    },
  ],
  publications: [
    { title: 'Hybrid Retrieval for Long-Document QA', venue: 'EMNLP Industry Track', year: 2023, source: 'parsed', confidence: 1 },
  ],
  education: [{ institution: 'TU Munich', degree: 'MSc', field: 'Computer Science', year: 2019, source: 'parsed', confidence: 1 }],
  links: [
    { type: 'github', url: 'https://github.com/example', label: 'GitHub' },
    { type: 'linkedin', url: 'https://linkedin.com/in/example', label: 'LinkedIn' },
  ],
  screening: { buildsAiSystems: true },
};

export function emptyProfile(): Profile {
  return { schemaVersion: '1.0', identity: { name: '', source: 'asked', confidence: 1 }, target: { role: 'other' } };
}
