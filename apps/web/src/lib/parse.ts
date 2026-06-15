// Read raw text out of dropped files, entirely client-side. PDF and DOCX parsers are lazy-imported
// so they don't bloat the initial bundle. Heuristic extraction (no key) captures only contact and
// links - never anything it would have to invent.

import type { Profile } from '@aiengineercv/core';

export async function readFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.markdown') || name.endsWith('.csv') || name.endsWith('.json')) {
    return file.text();
  }
  if (name.endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist');
    // Worker via Vite ?url import.
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it) => ('str' in it ? it.str : '')).join(' ') + '\n';
    }
    return text;
  }
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return result.value;
  }
  throw new Error(`Unsupported file type: ${name}. Supported: .pdf, .docx, .md, .txt, .csv, .json`);
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const URL_RE = /https?:\/\/[^\s)]+/g;
const NAME_RE = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s*$/m;

export function heuristicExtract(rawText: string): Partial<Profile> {
  const out: Partial<Profile> = {};
  const identity: Profile['identity'] = { name: '', source: 'asked', confidence: 1 };
  const name = rawText.match(NAME_RE)?.[1];
  if (name) {
    identity.name = name;
    identity.source = 'parsed';
    identity.confidence = 0.6;
  }
  const email = rawText.match(EMAIL_RE)?.[0];
  if (email) identity.email = email;
  out.identity = identity;
  const links = [...new Set([...rawText.matchAll(URL_RE)].map((m) => m[0]))].slice(0, 6);
  if (links.length) {
    out.links = links.map((url) => ({
      type: url.includes('github.com') ? 'github' : url.includes('linkedin.com') ? 'linkedin' : 'website',
      url,
    }));
  }
  return out;
}
