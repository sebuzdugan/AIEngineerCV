import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderCv } from '@aiengineercv/core';
import { loadProfile, writeOut, OUT_DIR } from '../lib/io.js';
import { mdToHtml } from '../lib/md2html.js';
import { banner, info, success } from '../lib/ui.js';

interface ExportOptions {
  md?: boolean;
  html?: boolean;
  pdf?: boolean;
}

export function exportCommand(options: ExportOptions): void {
  banner();

  // Prefer a CV already produced by `generate` (which may be the LLM rewrite); otherwise render
  // deterministically from the profile.
  const existingMd = resolve(OUT_DIR, 'cv.md');
  let md: string;
  if (existsSync(existingMd)) {
    md = readFileSync(existingMd, 'utf8');
    info('Using out/cv.md from your last `generate`.');
  } else {
    md = renderCv(loadProfile());
    info('No out/cv.md yet - rendering from profile.json.');
  }

  // Default to all formats if none specified.
  const all = !options.md && !options.html && !options.pdf;

  if (all || options.md) {
    success(`Wrote ${writeOut('cv.md', md)}`);
  }
  if (all || options.html || options.pdf) {
    const html = mdToHtml(md, 'CV');
    const htmlPath = writeOut('cv.html', html);
    success(`Wrote ${htmlPath}`);
    if (all || options.pdf) {
      info('For PDF: open cv.html in your browser and Print -> Save as PDF (the print stylesheet is one-page ready).');
      info('The web app does one-click client-side PDF; the CLI keeps zero heavy dependencies.');
    }
  }
}
