import { renderCv, classify, shouldProceed, scoreProfile } from '@aiengineercv/core';
import { loadProfile, writeOut } from '../lib/io.js';
import { hasKey, generateCv } from '../lib/llm.js';
import { banner, info, success, warn, printGuardrail, printScore } from '../lib/ui.js';

interface GenerateOptions {
  model?: string;
  force?: boolean;
}

export async function generateCommand(options: GenerateOptions): Promise<void> {
  banner();
  const profile = loadProfile();

  // Guardrail gate.
  const g = classify(profile);
  printGuardrail(g);
  const { proceed, forced } = shouldProceed(g, { ...profile, screening: { ...profile.screening, forced: options.force } });
  if (!proceed) {
    if (options.force) {
      warn('Proceeding anyway because --force was passed. (The warning above still stands.)');
    } else {
      warn('Not generating. This tool is tuned for AI-engineering CVs. Re-run with --force to override.');
      return;
    }
  }
  if (forced) warn('Out-of-scope override recorded (--force).');

  let cv: string;
  if (hasKey()) {
    info('Generating with your model (BYO key) ...');
    try {
      cv = await generateCv(profile, options.model);
    } catch (e) {
      warn(`LLM generation failed (${(e as Error).message}); using the deterministic renderer.`);
      cv = renderCv(profile);
    }
  } else {
    warn('No ANTHROPIC_API_KEY set - rendering deterministically (no rewrite).');
    info('Set a key and re-run for the impact-framed, role-targeted rewrite.');
    cv = renderCv(profile);
  }

  const mdPath = writeOut('cv.md', cv);
  success(`Wrote ${mdPath}`);
  printScore(scoreProfile(profile));
}
