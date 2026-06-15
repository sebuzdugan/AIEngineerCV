# AIEngineerCV - Claude skill

The in-Claude door onto the AIEngineerCV brain. Inside Claude (Code or Desktop), say something like
**"build my AI engineer CV"** - attach your old CV, a LinkedIn export, or just describe yourself -
and this skill runs the same flow as the CLI and web app: ingest -> draft `Profile` -> ask only the
gaps -> guardrail -> generate -> score -> output the CV as a file.

This is the most direct expression of "it works as a spec in Claude": [`SKILL.md`](SKILL.md) is the
orchestration, and it points at the same six expertise assets that power every adapter.

## Layout

```
claude-skill/
  SKILL.md              # the orchestration (what Claude follows)
  assets/               # the six expertise assets, synced from packages/core/assets
  references/
    scoring.md          # how to compute the AI Recruiter Score by hand from the rubric
  examples/
    sample-output.md    # what a strong generated CV looks like
```

## Install

Copy this `claude-skill/` directory into your Claude skills location (for Claude Code, a
`.claude/skills/aiengineer-cv/` folder), or install it as part of a plugin. The skill is
self-contained: `assets/` bundles its own copies of the core files.

## Keeping assets in sync

`assets/` mirrors [`packages/core/assets`](../packages/core/assets), the single source of truth.
After editing any core asset, re-run:

```bash
node scripts/sync-skill-assets.mjs
```

Built by [@sebuzdugan](https://x.com/sebuzdugan).
