---
description: Build a polished, role-targeted AI-engineering CV from the user's materials, with an AI Recruiter Score. Run the aiengineer-cv skill end to end.
argument-hint: "[paste your background, or attach a CV / LinkedIn export]"
---

Build the user's AI-engineering CV using the **aiengineer-cv** skill in this plugin.

Follow `skills/aiengineer-cv/SKILL.md` exactly, end to end:

1. **Ingest** anything attached or provided as `$ARGUMENTS` (a CV, a LinkedIn export, free text, a GitHub URL). If nothing is provided, start the interview from the conversation.
2. **Parse** into a draft `Profile` that validates against the skill's `profile.schema.json`, tagging every record with `source` + `confidence`. Never invent experience, employers, dates, metrics, or skills.
3. **Guardrail** (AI/ML engineers only): classify in-scope / adjacent / out-of-scope and act per `guardrail.md`.
4. **Gap-fill** by asking only the questions in `questions.yaml` whose trigger still fires - prioritize the metric probes.
5. **Generate** the CV in Markdown per `generation-spec.md`, targeted to the captured role/seniority/company-type.
6. **Score** against `rubric.yaml` (see `references/scoring.md`); report the AI Recruiter Score, the band, and the top-3 fixes; offer the share-card.
7. **Output** the CV to `cv.md` and a print-ready `cv.html`.

**PDF:** in Claude Code (which has Bash), offer to produce a real PDF - the most reliable path is the project's CLI: `npx aiengineercv export --pdf` (or `aicv export --pdf`) against the saved `profile.json`, or render `cv.html` with a converter if one is installed. In Claude Desktop (no Bash), tell the user to open `cv.html` and Print -> Save as PDF, or use the web app at https://sebuzdugan.github.io/AIEngineerCV/ for one-click PDF.

Keep the tone technical, precise, and scannable. Built by @sebuzdugan.
