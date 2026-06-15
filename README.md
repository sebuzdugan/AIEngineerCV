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

🚧 **Status:** Phase 1 (the core "brain") is built. CLI, Claude skill, and web app are next.
See [`docs/superpowers/specs`](docs/superpowers/specs) for the design and
[`packages/core`](packages/core) for the assets that make the tool good.

Built by [@sebuzdugan](https://x.com/sebuzdugan). MIT licensed. PRs welcome - especially to the
[taxonomy](packages/core/assets/taxonomy.yaml) and [rubric](packages/core/assets/rubric.yaml).
