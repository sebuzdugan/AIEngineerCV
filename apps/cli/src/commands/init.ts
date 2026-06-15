import prompts from 'prompts';
import { questionBank, gaps, type Profile, type Question } from '@aiengineercv/core';
import { loadDraft, profileExists, saveProfile, emptyProfile } from '../lib/io.js';
import { setByPath } from '../lib/setPath.js';
import { banner, info, success, warn } from '../lib/ui.js';
import { runScreenAndScore } from './score.js';

function toPromptType(q: Question): prompts.PromptType {
  switch (q.kind) {
    case 'boolean':
      return 'confirm';
    case 'number':
      return 'number';
    case 'single-select':
      return 'select';
    default:
      return 'text';
  }
}

async function ask(q: Question): Promise<unknown> {
  const res = await prompts(
    {
      type: toPromptType(q),
      name: 'value',
      message: q.prompt,
      ...(q.options ? { choices: q.options.map((o) => ({ title: o.label, value: o.value })) } : {}),
    },
    { onCancel: () => process.exit(0) },
  );
  return res.value;
}

/** Apply an answer to the profile. Scalars go straight to their path; a few content questions
 *  get minimal, honest handling. Rich content comes from `aicv ingest`. */
function apply(profile: Profile, q: Question, value: unknown): void {
  if (value === undefined || value === '') return;
  if (q.id === 'flagship-project' && typeof value === 'string') {
    profile.projects = profile.projects ?? [];
    profile.projects.push({
      name: value.split('\n')[0]!.slice(0, 80),
      shipped: value,
      source: 'asked',
      confidence: 1,
    });
    return;
  }
  if (q.id === 'evidence-links' && typeof value === 'string') {
    const urls = [...value.matchAll(/https?:\/\/[^\s,]+/g)].map((m) => m[0]);
    if (urls.length) {
      profile.links = profile.links ?? [];
      for (const url of urls) {
        profile.links.push({
          type: url.includes('github.com') ? 'github' : url.includes('linkedin.com') ? 'linkedin' : 'website',
          url,
        });
      }
    }
    return;
  }
  if (q.maps_to.includes('[')) return; // array-of-objects targets handled by ingest, not init
  setByPath(profile as unknown as Record<string, unknown>, q.maps_to, value);
}

export async function initCommand(): Promise<void> {
  banner();
  const profile = profileExists() ? loadDraft() : emptyProfile();
  if (!profile.identity?.name) {
    const { name } = await prompts({ type: 'text', name: 'name', message: 'Your name?' }, { onCancel: () => process.exit(0) });
    if (name) {
      profile.identity = { name, source: 'asked', confidence: 1 };
    }
  }
  info('I will only ask what is not already filled in.\n');

  // Ask the gap questions in priority order, re-evaluating as we go.
  const asked = new Set<string>();
  let pending = gaps(profile).filter((q) => !q.maps_to.includes('[') || q.id === 'flagship-project' || q.id === 'evidence-links');
  while (pending.length) {
    const q = pending[0]!;
    asked.add(q.id);
    const value = await ask(q);
    apply(profile, q, value);
    saveProfile(profile);
    pending = gaps(profile).filter(
      (qq) => !asked.has(qq.id) && (!qq.maps_to.includes('[') || qq.id === 'flagship-project' || qq.id === 'evidence-links'),
    );
  }

  success('Saved profile.json');
  if (!(profile.experience?.length || profile.skills?.length)) {
    warn('No experience or skills yet. Run `aicv ingest <your-cv.pdf>` to parse them, then `aicv generate`.');
  }
  // total question count (for a friendly note)
  void questionBank;
  await runScreenAndScore(profile, { quiet: true });
}
