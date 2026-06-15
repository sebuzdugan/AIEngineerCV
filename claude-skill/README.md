# AIEngineerCV - Claude plugin

The in-Claude door onto the AIEngineerCV brain. Inside Claude Code (or Desktop), run **`/cv`** or
just say **"build my AI engineer CV"** - attach your old CV, a LinkedIn export, or describe yourself
- and it runs the same flow as the CLI and web app: ingest -> draft `Profile` -> ask only the gaps
-> guardrail -> generate -> score -> write the CV to a file.

This is the most direct expression of "it works as a spec in Claude":
[`skills/aiengineer-cv/SKILL.md`](skills/aiengineer-cv/SKILL.md) is the orchestration, pointed at the
same six expertise assets that power every adapter.

## Install

From any Claude Code session:

```
/plugin marketplace add sebuzdugan/AIEngineerCV
/plugin install aiengineercv@aiengineercv
```

Then run `/cv` (or ask "build my AI engineer CV"). Validate the manifests locally with
`claude plugin validate .` from the repo root.

## Layout (a Claude Code plugin)

```
claude-skill/
  .claude-plugin/plugin.json     # plugin manifest
  commands/cv.md                 # the /cv slash command
  skills/aiengineer-cv/
    SKILL.md                     # the orchestration Claude follows
    assets/                      # the six expertise assets, synced from packages/core/assets
    references/scoring.md        # how to compute the AI Recruiter Score by hand
    examples/sample-output.md    # what a strong generated CV looks like
```

The marketplace manifest lives at the repo root in
[`.claude-plugin/marketplace.json`](../.claude-plugin/marketplace.json).

## PDF

A chat skill can always write `cv.md` + a print-ready `cv.html`. For a real PDF: in Claude Code
(Bash available) it can shell out to the CLI - `npx aiengineercv export --pdf` - or a converter; in
Claude Desktop, open `cv.html` and Print -> Save as PDF, or use the
[web app](https://sebuzdugan.github.io/AIEngineerCV/) for one-click PDF.

## Keeping assets in sync

`skills/aiengineer-cv/assets/` mirrors [`packages/core/assets`](../packages/core/assets), the single
source of truth. After editing any core asset, re-run `node scripts/sync-skill-assets.mjs`.

Built by [@sebuzdugan](https://x.com/sebuzdugan).
