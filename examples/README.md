# Examples

Three example profiles that validate against [`profile.schema.json`](../packages/core/assets/profile.schema.json),
each paired with the CV the generation spec produces from it. They double as the proof that the
core works and as fixtures for the tests in [`packages/core/test`](../packages/core/test).

| Profile | Guardrail class | What it demonstrates |
| --- | --- | --- |
| [`senior-llm-rag-engineer`](senior-llm-rag-engineer.profile.json) to [CV](senior-llm-rag-engineer.cv.md) | in-scope | A strong, metric-dense LLM/RAG CV - the quality bar. Scores high. |
| [`mlops-engineer`](mlops-engineer.profile.json) to [CV](mlops-engineer.cv.md) | in-scope | MLOps targeting - serving/observability/CI-CD foregrounded. |
| [`adjacent-backend-pivot`](adjacent-backend-pivot.profile.json) to [CV](adjacent-backend-pivot.cv.md) | adjacent | Exercises the guardrail: proceeds, but flags the fit honestly. |

All metrics in these examples are illustrative fixtures. The tool never invents metrics for real
users - missing numbers become follow-up questions, never fabricated figures.
