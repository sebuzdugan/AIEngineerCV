import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { Profile } from '../src/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = resolve(here, '..', '..', '..', 'examples');

export function loadExample(name: string): Profile {
  return JSON.parse(readFileSync(resolve(examplesDir, `${name}.profile.json`), 'utf8')) as Profile;
}

export const exampleNames = [
  'senior-llm-rag-engineer',
  'mlops-engineer',
  'adjacent-backend-pivot',
] as const;
