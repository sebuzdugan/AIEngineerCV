// Types mirroring profile.schema.json. The JSON Schema is the source of truth at runtime
// (ajv validation in load.ts); these types are the compile-time mirror for adapters.

export type Source = 'parsed' | 'asked' | 'inferred';

export interface Provenance {
  source: Source;
  confidence: number;
}

export interface SourcedText extends Provenance {
  text: string;
}

export type TaxonomyCategoryId =
  | 'llm-generative'
  | 'retrieval-knowledge'
  | 'agents-orchestration'
  | 'evaluation-reliability'
  | 'context-engineering'
  | 'serving-mlops'
  | 'foundations';

export type TargetRole =
  | 'llm-ai-engineer'
  | 'applied-ml-engineer'
  | 'research-engineer'
  | 'mlops-engineer'
  | 'ai-full-stack'
  | 'founding-engineer'
  | 'data-scientist'
  | 'other';

export type Seniority =
  | 'junior'
  | 'mid'
  | 'senior'
  | 'staff'
  | 'principal'
  | 'lead'
  | 'unspecified';

export type CompanyType =
  | 'frontier-lab'
  | 'ai-startup'
  | 'big-tech'
  | 'enterprise'
  | 'agency'
  | 'unspecified';

export interface Identity extends Partial<Provenance> {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
}

export interface Target {
  role: TargetRole;
  roleLabel?: string;
  seniority?: Seniority;
  yearsInAiMl?: number;
  companyType?: CompanyType;
  locationPreference?: 'remote' | 'hybrid' | 'onsite' | 'relocation-ok' | 'unspecified';
  geographies?: string[];
  pageLength?: 'one-page' | 'two-page' | 'auto';
}

export interface Skill extends Provenance {
  name: string;
  raw?: string;
  category: TaxonomyCategoryId;
  level?: 'familiar' | 'proficient' | 'expert';
}

export interface Bullet extends Provenance {
  action: string;
  system?: string;
  tech?: string[];
  metric?: string;
  rendered?: string;
}

export interface ExperienceItem extends Provenance {
  org: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  bullets?: Bullet[];
}

export interface ProjectItem extends Provenance {
  name: string;
  repo?: string;
  role?: string;
  stars?: number;
  usage?: string;
  shipped?: string;
  tech?: string[];
}

export interface Publication extends Provenance {
  title: string;
  venue?: string;
  year?: number;
  url?: string;
}

export interface Education extends Provenance {
  institution: string;
  degree?: string;
  field?: string;
  year?: number;
  note?: string;
}

export interface Certification extends Provenance {
  name: string;
  issuer?: string;
  year?: number;
}

export interface Link {
  type: 'github' | 'linkedin' | 'website' | 'twitter' | 'scholar' | 'demo' | 'other';
  url: string;
  label?: string;
}

export interface Screening {
  buildsAiSystems?: boolean;
  selfDescribedFocus?: string;
  forced?: boolean;
}

export interface Profile {
  schemaVersion: '1.0';
  identity: Identity;
  target: Target;
  headline?: SourcedText;
  summary?: SourcedText;
  skills?: Skill[];
  experience?: ExperienceItem[];
  projects?: ProjectItem[];
  publications?: Publication[];
  education?: Education[];
  certifications?: Certification[];
  links?: Link[];
  screening?: Screening;
}

// ---- Scoring ----

export interface CriterionScore {
  id: string;
  name: string;
  weight: number;
  score: number; // 0..1
  weighted: number; // score * weight
  detail: string;
}

export interface Fix {
  criterion: string;
  message: string;
}

export interface ScoreResult {
  score: number; // 0..100
  band: string;
  perCriterion: CriterionScore[];
  top3Fixes: Fix[];
  shareCard: string;
}

// ---- Guardrail ----

export type GuardrailClass = 'in-scope' | 'adjacent' | 'out-of-scope';

export interface GuardrailResult {
  class: GuardrailClass;
  reason: string;
  message: string;
  signals: {
    distinctCategories: number;
    hasAiTitle: boolean;
    hasProdEvidence: boolean;
    screeningYes: boolean | undefined;
  };
}

// ---- Gaps / questions ----

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  priority: number;
  trigger: { type: string; path?: string };
  why: string;
  maps_to: string;
  kind: 'single-select' | 'multi-select' | 'text' | 'number' | 'boolean';
  prompt: string;
  options?: QuestionOption[];
}
