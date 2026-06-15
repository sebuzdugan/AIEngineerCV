<!-- This README is a stub. It becomes the landing page in Phase 5. -->

# AIEngineerCV

> An open-source CV builder for **AI engineers**. One brain, three doors.

Turn your raw materials - an old CV, a LinkedIn export, a GitHub, or just free text - into a
polished, role-targeted CV, by applying baked-in **AI-engineering hiring judgment** instead of
generic resume tips.

- **One canonical `Profile`** - a validated schema that fully describes a candidate.
- **Three thin adapters** - Web (drag-and-drop), CLI (`npx`/`aicv`), and a Claude skill - that
  each do one job: populate a valid `Profile`.
- **One generation spec** - the deterministic, prompt-driven brain that turns a `Profile` into a CV.

**Bring your own key.** Calls go directly from your machine to your model provider. We never
proxy, store, or see your key or your data. No backend, no database, no telemetry.

## CLI (`aicv`)

The CLI wraps the shared brain end to end: ingest your materials, answer only the gap questions,
generate, score, export.

```bash
# from a clone of this repo
pnpm install && pnpm build

export ANTHROPIC_API_KEY=sk-ant-...   # optional: enables the LLM parse + rewrite

aicv init                 # interactive interview, writes profile.json
aicv ingest my-cv.pdf     # parse a CV / LinkedIn export / notes into profile.json
aicv generate             # build ./out/cv.md (LLM rewrite if a key is set, else deterministic)
aicv score                # AI Recruiter Score + guardrail + top-3 fixes
aicv export --md --html   # write ./out/cv.md and a print-ready ./out/cv.html (Print -> PDF)
```

Every LLM step is optional. With no key, `aicv` still scores you, renders a clean CV
deterministically, and exports it - the score never needs a key. The guardrail (`aicv generate`)
declines out-of-scope CVs unless you pass `--force`, and never bypasses silently.

## Claude skill

Inside Claude (Code or Desktop), say **"build my AI engineer CV"** and attach your old CV (or just
describe yourself). The [`claude-skill/`](claude-skill) runs the same flow as the CLI: ingest ->
draft `Profile` -> ask only the gaps -> guardrail -> generate -> score -> output the CV as a file.
[`SKILL.md`](claude-skill/SKILL.md) is the orchestration, pointed at the same six expertise assets
that power every adapter - the most direct expression of "it works as a spec in Claude."

🚧 **Status:** Phase 1 (core brain), Phase 2 (CLI), and Phase 3 (Claude skill) are built. The web
app is next. See [`docs/superpowers/specs`](docs/superpowers/specs) for the design,
[`packages/core`](packages/core) for the assets that make the tool good,
[`apps/cli`](apps/cli) for the CLI, and [`claude-skill`](claude-skill) for the skill.

Built by [@sebuzdugan](https://x.com/sebuzdugan). MIT licensed. PRs welcome - especially to the
[taxonomy](packages/core/assets/taxonomy.yaml) and [rubric](packages/core/assets/rubric.yaml).
