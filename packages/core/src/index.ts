// @aiengineercv/core - the shared brain. One Profile, one set of expertise assets, one set of
// deterministic functions, reused by every adapter (CLI, Claude skill, web). Isomorphic: the assets
// are inlined (generated/assets.ts), so this works in Node and the browser with no filesystem reads.

export * from './types.js';

// Inlined expertise assets
export {
  profileSchema,
  taxonomy,
  rubric,
  questionBank,
  generationSpec,
  guardrailDoc,
} from './generated/assets.js';
export type {
  Taxonomy,
  TaxonomyCategory,
  TaxonomySkill,
  TaxonomySynonym,
  Rubric,
  RubricCriterion,
  QuestionBank,
} from './assetTypes.js';

// Validation
export { validateProfile, parseProfile } from './validate.js';
export type { ValidationResult } from './validate.js';

// Normalization
export { hitsInText, profileText, distinctCategories } from './normalize.js';
export type { AliasHit } from './normalize.js';

// The deterministic capabilities
export { scoreProfile } from './score.js';
export { classify, shouldProceed, guardrailMessage } from './guardrail.js';
export { gaps, nextQuestion, triggers } from './gaps.js';

// Deterministic CV rendering (no LLM)
export { renderCv } from './render.js';
export type { RenderOptions } from './render.js';
