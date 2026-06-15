// Schema validation. Uses the inlined profileSchema, so it runs in Node and the browser alike.

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { profileSchema } from './generated/assets.js';
import type { Profile } from './types.js';

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
