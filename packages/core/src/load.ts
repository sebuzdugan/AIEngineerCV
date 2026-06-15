// Loads and validates the shared assets (schema, taxonomy, rubric, questions) plus the prose
// assets (generation-spec.md, guardrail.md). Both `src/` (vitest) and `dist/` (built) sit one
// level under the package root, so `../assets` resolves correctly either way.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { Profile, Question } from './types.js';

const here = dirname(fileURLToPath(import.meta.url));
const assetsDir = resolve(here, '..', 'assets');

export function assetPath(name: string): string {
  return resolve(assetsDir, name);
}

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(assetPath(name), 'utf8')) as T;
}

function readYaml<T>(name: string): T {
  return parseYaml(readFileSync(assetPath(name), 'utf8')) as T;
}

function readText(name: string): string {
  return readFileSync(assetPath(name), 'utf8');
}

// ---- Schema ----

export const profileSchema = readJson<Record<string, unknown>>('profile.schema.json');

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateFn = ajv.compile(profileSchema);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateProfile(data: unknown): ValidationResult {
  const valid = validateFn(data);
  if (valid) return { valid: true, errors: [] };
  const errors = (validateFn.errors ?? []).map(
    (e) => `${e.instancePath || '(root)'} ${e.message ?? 'is invalid'}`,
  );
  return { valid: false, errors };
}

/** Validate and narrow to Profile, throwing with a readable message on failure. */
export function parseProfile(data: unknown): Profile {
  const { valid, errors } = validateProfile(data);
  if (!valid) {
    throw new Error(`Invalid Profile:\n  - ${errors.join('\n  - ')}`);
  }
  return data as Profile;
}

// ---- Taxonomy ----

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

export const taxonomy = readYaml<Taxonomy>('taxonomy.yaml');

// ---- Rubric ----

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

export const rubric = readYaml<Rubric>('rubric.yaml');

// ---- Questions ----

export interface QuestionBank {
  version: string;
  questions: Question[];
}

export const questionBank = readYaml<QuestionBank>('questions.yaml');

// ---- Prose assets ----

export const generationSpec = readText('generation-spec.md');
export const guardrailDoc = readText('guardrail.md');

/** Extract a named message block from guardrail.md (### <name> ... blockquote). */
export function guardrailMessage(name: string): string {
  const lines = guardrailDoc.split('\n');
  const headerIdx = lines.findIndex((l) => l.trim().toLowerCase() === `### ${name}`);
  if (headerIdx === -1) return '';
  const collected: string[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (line.startsWith('### ') || line.startsWith('## ')) break;
    const m = line.match(/^>\s?(.*)$/);
    if (m) collected.push(m[1] ?? '');
  }
  return collected.join(' ').replace(/\s+/g, ' ').trim();
}
