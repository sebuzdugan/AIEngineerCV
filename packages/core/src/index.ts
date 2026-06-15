// @aiengineercv/core - the shared brain. One Profile, one set of expertise assets, one set of
// deterministic functions, reused by every adapter (CLI, Claude skill, web).

export * from './types.js';

// Asset loaders + validation
export {
  profileSchema,
  validateProfile,
  parseProfile,
  taxonomy,
  rubric,
  questionBank,
  generationSpec,
  guardrailDoc,
  guardrailMessage,
  assetPath,
} from './load.js';
export type {
  ValidationResult,
  Taxonomy,
  TaxonomyCategory,
  TaxonomySkill,
  TaxonomySynonym,
  Rubric,
  RubricCriterion,
  QuestionBank,
} from './load.js';

// Normalization
export { hitsInText, profileText, distinctCategories } from './normalize.js';
export type { AliasHit } from './normalize.js';

// The three deterministic capabilities
export { scoreProfile } from './score.js';
export { classify, shouldProceed } from './guardrail.js';
export { gaps, nextQuestion, triggers } from './gaps.js';
