#!/usr/bin/env node
// Single source of truth for the expertise assets is packages/core/assets. The Claude skill must
// be self-contained (installable on its own), so we copy the assets into claude-skill/assets here.
// Run after editing any core asset: `node scripts/sync-skill-assets.mjs`.

import { readdirSync, copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'packages', 'core', 'assets');
const dest = join(root, 'claude-skill', 'skills', 'aiengineer-cv', 'assets');

mkdirSync(dest, { recursive: true });

const files = readdirSync(src).filter((f) => /\.(json|yaml|md)$/.test(f));
for (const f of files) {
  copyFileSync(join(src, f), join(dest, f));
  console.log(`synced ${f}`);
}

writeFileSync(
  join(dest, 'README.md'),
  `# Bundled assets (do not edit here)\n\nThese files are copied verbatim from \`packages/core/assets\` by\n\`scripts/sync-skill-assets.mjs\`. Edit the originals in \`packages/core/assets\`, then re-run the\nsync script. The skill bundles its own copies so it can be installed standalone.\n`,
);
console.log(`\nSynced ${files.length} assets into claude-skill/skills/aiengineer-cv/assets`);
