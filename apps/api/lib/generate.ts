// The generation system prompt (a self-contained copy of the core generation spec, kept short for
// a cheap model) and a light server-side scope guard so out-of-scope profiles never spend credits.
// The anti-hallucination rules are CRITICAL here: cheap models love to invent metrics.

import { env, MODEL } from './config';

const SYSTEM = `You are an expert AI-engineering recruiter and resume writer. Turn the given Profile JSON into a polished, role-targeted CV in Markdown for an AI engineer.

Rules:
- Output ONLY the CV in Markdown. No preamble, no commentary.
- Bullet formula: <strong action verb> + <specific named system> + <named tech/techniques> + <quantified outcome>.
- Group skills by category. Lead with the most relevant to the target role/seniority/company-type.
- Sections (omit empties): Header (name, headline, location, contact, links), Summary (2-3 lines), Skills, Experience, Projects, Publications, Education, Certifications.

ANTI-HALLUCINATION (non-negotiable):
- NEVER invent experience, employers, dates, metrics, or skills. Use only what the Profile contains.
- NEVER fabricate a number. If a bullet has no metric in the Profile, write it WITHOUT a metric. Do not estimate, guess, or add percentages.
- Reframe and sharpen wording only; never change facts.`;

export interface Profile {
  identity?: { name?: string };
  target?: { role?: string };
  skills?: unknown[];
  experience?: unknown[];
  screening?: { buildsAiSystems?: boolean };
}

/** Light, credit-saving scope guard. The full deterministic guardrail runs in the browser; this
 *  just blocks obvious junk and out-of-scope before we spend a call. */
export function looksInScope(p: Profile): boolean {
  if (!p || !p.identity?.name) return false;
  const hasSignal =
    (p.skills?.length ?? 0) > 0 || (p.experience?.length ?? 0) > 0 || p.screening?.buildsAiSystems === true;
  return hasSignal;
}

export async function generateCv(profile: Profile): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env('OPENROUTER_API_KEY')}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://sebuzdugan.github.io/AIEngineerCV/',
      'X-Title': 'AIEngineerCV',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Profile JSON:\n\n${JSON.stringify(profile).slice(0, 20000)}\n\nReturn the CV in Markdown only.`,
        },
      ],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const cv = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (!cv) throw new Error('Empty completion');
  return cv.replace(/^```(?:markdown)?\s*/i, '').replace(/\s*```$/i, '');
}
