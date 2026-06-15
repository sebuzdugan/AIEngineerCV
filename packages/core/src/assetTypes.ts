// Shapes of the parsed expertise assets. The concrete values live in generated/assets.ts
// (inlined by scripts/gen-core-assets.mjs) so they load in Node and the browser alike.

export interface TaxonomySkill {
  canonical: string;
  aliases?: string[];
}
export interface TaxonomyCategory {
  id: string;
  name: string;
  blurb?: string;
  skills: TaxonomySkill[];
}
export interface TaxonomySynonym {
  canonical: string;
  category: string;
  note?: string;
}
export interface Taxonomy {
  version: string;
  categories: TaxonomyCategory[];
  synonyms: Record<string, TaxonomySynonym>;
}

export interface RubricCriterion {
  id: string;
  name: string;
  weight: number;
  scoresHigh: string;
  scoresLow: string;
  fixTemplate: string;
  signals: Record<string, unknown>;
}
export interface Rubric {
  version: string;
  goldStandard: string[];
  criteria: RubricCriterion[];
  bands: { min: number; label: string }[];
}

export interface QuestionBank {
  version: string;
  questions: import('./types.js').Question[];
}
