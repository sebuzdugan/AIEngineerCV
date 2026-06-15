# AIEngineerCV - Core ("the brain") design

**Date:** 2026-06-15
**Phase:** 1 of 5 (Core). CLI, Claude skill, web, README/landing follow in later phases.
**Status:** Approved, building.

## Context

An open-source CV builder for **AI engineers only**. Turns raw materials (existing CV,
LinkedIn export, GitHub, free-text) into a role-targeted CV by applying baked-in
AI-engineering hiring judgment. Open-source brand asset for [@sebuzdugan](https://x.com/sebuzdugan).
Zero-cost to run/host. Bring-your-own LLM key; we never proxy or store keys/data.

## Core architectural principle

**Three input formats, one brain.** One canonical `Profile` (validated JSON) is the single
source of truth. Three thin adapters (web, CLI, Claude skill) each do one job: populate a valid
`Profile`. One generation spec turns a `Profile` into a CV. This design covers the **brain** that
all three adapters share.

## Decisions (locked)

- **Sequence:** Core first, then checkpoint before CLI/skill/web.
- **Stack:** TypeScript monorepo (pnpm workspaces). Core package imported by CLI + web.
- **Scoring:** Deterministic heuristics - no API key needed for the AI Recruiter Score.
  The LLM (BYO key) is only used later for the generative rewrite step.
- **Name:** `AIEngineerCV`. CLI alias: `aicv`.
- **License:** MIT.

## Repo skeleton (this phase fills only `packages/core` + `examples`)

```
AIEngineerCV/
  packages/core/
    assets/
      profile.schema.json   taxonomy.yaml   rubric.yaml
      generation-spec.md     guardrail.md    questions.yaml
    src/
      types.ts   load.ts   score.ts   guardrail.ts   gaps.ts   index.ts
    test/
  examples/                 # 3 profiles + their generated CVs (.md)
  package.json, pnpm-workspace.yaml, tsconfig.base.json, LICENSE, README.md (stub)
```

## The six expertise assets (the moat)

1. **profile.schema.json** - JSON Schema (draft 2020-12). Identity/contact; target (role,
   seniority, company-type, location/remote, page-length); headline/summary; skills grouped by
   taxonomy category; experience (org/title/dates/location + bullets of
   `{action, system, tech[], metric?}`); projects/OSS; publications; education; certifications;
   links. **Every field carries `source` (`parsed|asked|inferred`) and `confidence` (0-1).**
2. **taxonomy.yaml** - 7 categories (LLM & Generative, Retrieval & Knowledge, Agents &
   Orchestration, Evaluation & Reliability, Context Engineering, Serving & MLOps, Foundations),
   each with canonical skills + `synonyms` normalization map. PR-extensible.
3. **rubric.yaml** - 7 weighted criteria summing to 100: Specificity 20, Quantified impact 20,
   Correct AI vocabulary 15, Shipped-to-prod 15, Credibility markers 10, ATS-friendliness 10,
   Signal-to-noise 10. Each criterion: weight, scores-high, scores-low, fix-template. Encodes a
   paraphrased "what good looks like" digest; pushes users *past* the reference on quantification.
4. **generation-spec.md** - the brain prompt. Bullet formula
   `<strong verb> + <specific system> + <named tech> + <quantified outcome>`; taxonomy mapping;
   role/seniority/company-type targeting; anti-hallucination rules; headline + 2-3 line summary;
   one-page rule for <8 yrs. Reused verbatim by the Claude skill.
5. **guardrail.md** - in-scope / adjacent / out-of-scope definitions + friendly messages +
   `--force` override semantics.
6. **questions.yaml** - prioritized, branching question bank. Each: `id`, `trigger`
   (only-ask-if-missing path), `why`, `maps_to` Profile path.

## Runnable core logic (TypeScript, deterministic)

- **score.ts** - pure `Profile to {score, perCriterion[], top3Fixes[], shareCard}`. Local
  heuristics only. Reproducible, no key.
- **guardrail.ts** - `Profile to {class, reason, message}` via taxonomy-term density + title
  signals + screening answer.
- **gaps.ts** - `Profile to Question[]`, evaluating each question's trigger vs. what's populated.
- **load.ts** - loads + `ajv`-validates assets, exposes typed accessors.

## Anti-hallucination (enforced in core)

Never invent experience, employers, dates, metrics, or skills. Inferred fields are marked and
must be confirmed. Missing metrics become a *fix suggestion* ("add a number here"), never a
fabricated value. Profile distinguishes user-stated facts from tool-suggested phrasing via `source`.

## Examples + validation = the proof

3 example profiles: (a) senior LLM/RAG engineer (in-scope, strong), (b) MLOps engineer
(in-scope), (c) backend dev pivoting in (adjacent - exercises guardrail). Each validates against
the schema; each has a hand-generated CV in `/examples`. `pnpm test` asserts schema validity,
scorer determinism + expected ranges, guardrail classifications, and gap selection.

## Phase-1 done when

The 6 assets exist and are coherent; 3 examples validate; scorer + guardrail + gaps run and are
tested green; `/examples` visibly demonstrates the quality bar. Then checkpoint before CLI.

## Out of scope for v1

Accounts/auth, DB-saved profiles, multiple visual templates, job-board matching, cover letters,
interview prep, paid tiers, telemetry.
