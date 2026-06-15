# Computing the AI Recruiter Score by hand

The CLI and web app compute this deterministically from `rubric.yaml`. Inside Claude, apply the
same rubric by reasoning so your score lines up with the other adapters. Score each criterion 0-1,
multiply by its weight, sum (weights total 100), and round.

Use the `signals` block in `assets/rubric.yaml` as the yardstick for each criterion:

| Criterion | Weight | Score 1.0 when... | Score low when... |
| --- | --- | --- | --- |
| Specificity | 20 | ~70%+ of bullets name a real system AND a named technique | bullets are vague ("worked on AI features") |
| Quantified impact | 20 | ~50%+ of bullets carry a hard number (latency, scale, cost, accuracy, adoption) | no numbers anywhere |
| Correct AI vocabulary | 15 | skills touch 4+ of the 7 taxonomy categories, terms used precisely | generic terms ("AI", "ML", "GenAI") used as labels |
| Shipped-to-prod | 15 | ~40%+ of bullets signal production (users, traffic, "deployed") | only prototypes/coursework/"explored" |
| Credibility markers | 10 | 2+ of: OSS projects, publications, certifications, a GitHub link | none present |
| ATS-friendliness | 10 | contact email + target role + 6 or more skills present | missing contact/role/keywords |
| Signal-to-noise | 10 | tight, scannable, no filler, <= 6 bullets per role, bullets <= ~32 words | clichés, walls of text, overstuffed roles |

For each weak criterion, give the concrete fix from the criterion's `fixTemplate`, filled in with a
real example from the user's CV (name the weak bullet, the generic term, or the missing field).

Then report:

```
AI Recruiter Score: <0-100>  [<band from rubric.yaml>]
Top fixes:
  1. [criterion] <fix, with a concrete pointer into their CV>
  2. ...
  3. ...
```

The bands live in `rubric.yaml` (`bands`): 85+ Strong, 70+ Solid, 50+ Promising, else Early.

**Pushing past the reference.** The rubric deliberately weights Quantified impact high. Most strong
CVs are light on hard numbers - this is the gap to exploit. Always probe for a metric on every major
bullet before settling the score.
