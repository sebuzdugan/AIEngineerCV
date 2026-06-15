// Bring-your-own-key LLM calls. The key comes from the user's ANTHROPIC_API_KEY and the request
// goes directly from this process to Anthropic. We never proxy, store, or see it. Every LLM call
// is optional: the CLI degrades to deterministic behavior when no key is set.

import Anthropic from '@anthropic-ai/sdk';
import { generationSpec, profileSchema, type Profile } from '@aiengineercv/core';

export const DEFAULT_MODEL = 'claude-opus-4-8';

export function hasKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client(): Anthropic {
  if (!hasKey()) {
    throw new Error('ANTHROPIC_API_KEY is not set. Set it to use LLM-powered steps, or use the deterministic fallback.');
  }
  return new Anthropic();
}

/** Rewrite a Profile into a polished Markdown CV using generation-spec.md as the system prompt. */
export async function generateCv(profile: Profile, model = DEFAULT_MODEL): Promise<string> {
  const anthropic = client();
  const response = await anthropic.messages.create({
    model,
    max_tokens: 8000,
    system: generationSpec,
    messages: [
      {
        role: 'user',
        content: `Here is the validated Profile (JSON). Produce the final CV in Markdown only, following the spec exactly. Do not add commentary before or after the CV.\n\n\`\`\`json\n${JSON.stringify(profile, null, 2)}\n\`\`\``,
      },
    ],
  });
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

/**
 * Extract a draft Profile from raw source text (an existing CV, LinkedIn export, free text).
 * Returns the model's best-effort Profile JSON. The caller validates and confirms inferred fields.
 */
export async function extractProfile(rawText: string, model = DEFAULT_MODEL): Promise<unknown> {
  const anthropic = client();
  const system = [
    'You extract a structured Profile from messy candidate source material for an AI-engineering CV tool.',
    'Output ONLY a single JSON object that conforms to the provided JSON Schema. No prose, no code fences.',
    'Anti-hallucination rules (non-negotiable):',
    '- Never invent experience, employers, dates, metrics, or skills. Only capture what the text supports.',
    '- Tag each record with `source`: "parsed" when taken from the text, "inferred" when deduced (e.g. a skill category). Use lower `confidence` (<= 0.6) for inferred records.',
    '- Never fabricate a metric. Leave `metric` empty if the text gives no number.',
    'Map skills onto the taxonomy categories used by the schema. Group experience into items with structured bullets.',
    '',
    'JSON Schema:',
    '```json',
    JSON.stringify(profileSchema),
    '```',
  ].join('\n');

  const response = await anthropic.messages.create({
    model,
    max_tokens: 8000,
    system,
    messages: [
      {
        role: 'user',
        content: `Source material:\n\n"""\n${rawText.slice(0, 60000)}\n"""\n\nReturn the Profile JSON now.`,
      },
    ],
  });
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  // Be tolerant of accidental code fences.
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  return JSON.parse(cleaned);
}
