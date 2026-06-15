import prompts from 'prompts';
import { validateProfile, type Profile } from '@aiengineercv/core';
import { readSourceFile, heuristicExtract } from '../lib/ingest.js';
import { hasKey, extractProfile } from '../lib/llm.js';
import { loadDraft, profileExists, saveProfile } from '../lib/io.js';
import { banner, info, success, warn, fail } from '../lib/ui.js';

interface IngestOptions {
  model?: string;
}

export async function ingestCommand(files: string[], options: IngestOptions): Promise<void> {
  banner();
  if (!files.length) {
    fail('Provide at least one file: aicv ingest my-cv.pdf [linkedin.pdf] [notes.txt]');
    process.exit(1);
  }

  const texts: string[] = [];
  for (const file of files) {
    try {
      info(`Reading ${file} ...`);
      texts.push(await readSourceFile(file));
    } catch (e) {
      warn(`Skipped ${file}: ${(e as Error).message}`);
    }
  }
  if (!texts.length) {
    fail('Nothing readable to ingest.');
    process.exit(1);
  }
  const raw = texts.join('\n\n----\n\n');

  let draft: Profile;
  if (hasKey()) {
    info('Parsing with your model (BYO key) ...');
    try {
      const extracted = await extractProfile(raw, options.model);
      const { valid, errors } = validateProfile(extracted);
      if (!valid) {
        warn('The model returned a Profile that did not fully validate; keeping it as a draft.');
        info(errors.slice(0, 3).map((e) => `  - ${e}`).join('\n'));
      }
      draft = extracted as Profile;
    } catch (e) {
      warn(`LLM extraction failed (${(e as Error).message}); falling back to heuristic extraction.`);
      draft = heuristicExtract(raw);
    }
  } else {
    warn('No ANTHROPIC_API_KEY set - using heuristic extraction (contact + links only).');
    info('Set a key and re-run for a full parse, or fill the rest with `aicv init`.');
    draft = heuristicExtract(raw);
  }

  // Merge into any existing profile rather than clobbering.
  if (profileExists()) {
    const existing = loadDraft();
    const { proceed } = await prompts({
      type: 'confirm',
      name: 'proceed',
      message: 'profile.json already exists. Overwrite it with the parsed result?',
      initial: false,
    });
    if (!proceed) {
      info('Kept existing profile.json. Parsed draft not written.');
      void existing;
      return;
    }
  }

  saveProfile(draft);
  success('Wrote profile.json');
  const inferred = countInferred(draft);
  if (inferred > 0) {
    warn(`${inferred} field(s) were inferred. Run \`aicv init\` to review and confirm them before generating.`);
  }
  info('Next: `aicv generate` to build your CV, or `aicv score` to see your AI Recruiter Score.');
}

function countInferred(p: Profile): number {
  let n = 0;
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (o.source === 'inferred') n++;
      Object.values(o).forEach(walk);
    }
  };
  walk(p);
  return n;
}
