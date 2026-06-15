import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseProfile, type Profile } from '@aiengineercv/core';

export const PROFILE_PATH = resolve(process.cwd(), 'profile.json');
export const OUT_DIR = resolve(process.cwd(), 'out');

export function profileExists(): boolean {
  return existsSync(PROFILE_PATH);
}

export function loadProfile(): Profile {
  if (!profileExists()) {
    throw new Error(`No profile.json found in ${process.cwd()}. Run \`aicv init\` or \`aicv ingest <files>\` first.`);
  }
  const raw = JSON.parse(readFileSync(PROFILE_PATH, 'utf8'));
  return parseProfile(raw); // validates against the schema
}

/** Load without strict validation (for partial drafts mid-edit). */
export function loadDraft(): Profile {
  return JSON.parse(readFileSync(PROFILE_PATH, 'utf8')) as Profile;
}

export function saveProfile(profile: Profile): void {
  writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2) + '\n', 'utf8');
}

export function ensureOutDir(): string {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  return OUT_DIR;
}

export function writeOut(filename: string, content: string): string {
  const dir = ensureOutDir();
  const path = resolve(dir, filename);
  writeFileSync(path, content, 'utf8');
  return path;
}

/** A fresh, minimal valid-ish Profile skeleton. */
export function emptyProfile(): Profile {
  return {
    schemaVersion: '1.0',
    identity: { name: '', source: 'asked', confidence: 1 },
    target: { role: 'other' },
  };
}
