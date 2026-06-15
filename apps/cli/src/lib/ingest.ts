// Read raw text out of source files (CV, LinkedIn export, free text), and do a minimal heuristic
// extraction when no API key is available. The high-quality parse is the LLM path in llm.ts.

import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { emptyProfile } from './io.js';
import type { Profile } from '@aiengineercv/core';

export async function readSourceFile(path: string): Promise<string> {
  const ext = extname(path).toLowerCase();
  if (ext === '.txt' || ext === '.md' || ext === '.markdown') {
    return readFileSync(path, 'utf8');
  }
  if (ext === '.json' || ext === '.csv') {
    return readFileSync(path, 'utf8');
  }
  if (ext === '.pdf') {
    const { default: pdf } = await import('pdf-parse');
    const data = await pdf(readFileSync(path));
    return data.text;
  }
  if (ext === '.docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ path });
    return result.value;
  }
  throw new Error(`Unsupported file type: ${ext || '(none)'} - supported: .pdf, .docx, .md, .txt, .csv, .json`);
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const URL_RE = /https?:\/\/[^\s)]+/g;
const NAME_RE = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s*$/m;

/** Heuristic extraction used only when there is no API key. Captures contact + links, nothing it
 *  would have to invent. Everything else is left for the interview. */
export function heuristicExtract(rawText: string): Profile {
  const profile = emptyProfile();
  const email = rawText.match(EMAIL_RE)?.[0];
  if (email) profile.identity.email = email;
  const name = rawText.match(NAME_RE)?.[1];
  if (name) {
    profile.identity.name = name;
    profile.identity.source = 'parsed';
    profile.identity.confidence = 0.6;
  }
  const links = [...rawText.matchAll(URL_RE)].map((m) => m[0]);
  if (links.length) {
    profile.links = [...new Set(links)].slice(0, 6).map((url) => ({
      type: url.includes('github.com')
        ? ('github' as const)
        : url.includes('linkedin.com')
          ? ('linkedin' as const)
          : ('website' as const),
      url,
    }));
  }
  return profile;
}
