# Guardrail - AI engineers only

AIEngineerCV is tuned for AI/ML engineering CVs, and it says so honestly. Scope is a **feature**
("made by an AI engineer, for AI engineers"), not a gate to make anyone feel unwelcome. The
guardrail protects both output quality and the brand: the tool is only good at what it's good at.

This file defines the three classes, how the classifier decides, what to do for each, and the
`--force` override. The deterministic implementation lives in `guardrail.ts`; the human-facing
messages live here so they can be edited without touching code.

---

## The three classes

### In-scope - proceed
Builds or ships systems using ML/LLMs. Includes: AI/ML/LLM engineers, applied scientists, research
engineers, MLOps engineers, AI-focused full-stack/backend engineers, founding engineers on AI
products, and data scientists who ship models to production.

**Signal:** several distinct taxonomy categories present; a title or self-description centered on
building AI/ML systems; production/shipping evidence.

### Adjacent - proceed, with a note
Technical, but not core AI - e.g. a backend or data engineer pivoting in, with some AI exposure but
a thin AI track record. Proceed, **but** tell them plainly: the tool is optimized for AI-engineering
roles, and some guidance may not perfectly fit their situation yet.

**Signal:** strong general engineering signal, but only 1-2 taxonomy categories touched and little
production AI evidence; or a screening answer of "not really, but moving into it".

### Out-of-scope - decline, kindly
Non-technical, or unrelated to engineering entirely (e.g. marketing manager, nurse, sales). Decline
to generate. Explain the scope plainly and warmly, and point to general-purpose resume tools.
Declining protects the candidate (they'd get worse output here than from a general tool) and the brand.

---

## How the classifier decides

A transparent, deterministic heuristic (no LLM needed):

1. **Taxonomy density** - how many distinct taxonomy categories the parsed skills/experience touch.
2. **Title/role signal** - does the target role or any job title match an AI/ML engineering pattern?
3. **Production evidence** - any "shipped to prod" signal in the bullets.
4. **Screening answer** - the one question: *"Do you build or ship systems that use ML/LLMs?"*

Roughly:
- **In-scope:** screening = yes AND (>= 2 taxonomy categories OR an AI/ML title) - i.e. clear AI signal.
- **Adjacent:** some AI signal but below the in-scope bar (e.g. exactly one category, or "moving into it").
- **Out-of-scope:** no AI signal in skills, title, or screening.

The classifier returns its `class`, a short `reason` (which signals fired), and a `message`. It is
**transparent** (the reason is always shown) and **overridable** (see below).

---

## The `--force` override

Power users must not be hard-blocked. In the CLI, `--force` proceeds despite an out-of-scope or
adjacent classification - **but the warning is still shown**, and the bypass is recorded
(`screening.forced = true`). Never bypass silently. The web and skill adapters expose the same
"proceed anyway" affordance with the same visible warning.

---

## Messages (edit freely; keep the tone)

### in-scope
> You're squarely in scope - let's build you a sharp AI-engineering CV.

### adjacent
> Heads up: AIEngineerCV is tuned for core AI/ML engineering roles, and your background reads as
> adjacent (strong engineering, lighter on shipped AI). I'll still help, but some guidance may not
> perfectly fit yet. As you add production AI work, this tool will fit you better.

### out-of-scope
> AIEngineerCV is a deliberately narrow tool - it's built by an AI engineer, for AI engineers, and
> it's only good at AI/ML engineering CVs. From what I can see, your background isn't a fit for this
> particular tool, and you'd get a better result from a general-purpose resume builder (e.g. a
> standard resume template, Resume.io, or the built-in tools in Google Docs/Word). No judgment -
> it's just not what this one is for. If I've misread your background, you can override and proceed
> anyway.
