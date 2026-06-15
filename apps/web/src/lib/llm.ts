// Bring-your-own-key LLM calls, straight from the browser to Anthropic. The key lives only in this
// tab's memory (and optionally localStorage if the user opts in); the request goes directly to
// api.anthropic.com with the direct-browser-access header. We never proxy, store, or see it.

import { generationSpec, profileSchema, type Profile } from '@aiengineercv/core';

export const DEFAULT_MODEL = 'claude-opus-4-8';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';

async function callAnthropic(key: string, system: string, userText: string, model: string): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      system,
      messages: [{ role: 'user', content: userText }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Anthropic API ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim();
}

export async function generateCv(key: string, profile: Profile, model = DEFAULT_MODEL): Promise<string> {
  const user = `Here is the validated Profile (JSON). Produce the final CV in Markdown only, following the spec exactly. No commentary before or after.\n\n\`\`\`json\n${JSON.stringify(profile, null, 2)}\n\`\`\``;
  return callAnthropic(key, generationSpec, user, model);
}

export async function extractProfile(key: string, rawText: string, model = DEFAULT_MODEL): Promise<unknown> {
  const system = [
    'You extract a structured Profile from messy candidate source material for an AI-engineering CV tool.',
    'Output ONLY a single JSON object that conforms to the provided JSON Schema. No prose, no code fences.',
    'Never invent experience, employers, dates, metrics, or skills. Tag each record with `source`: "parsed" from the text, "inferred" when deduced (use confidence <= 0.6). Never fabricate a metric; leave it empty if absent.',
    'Map skills onto the taxonomy categories in the schema. Decompose experience into bullets of {action, system, tech[], metric?}.',
    '',
    'JSON Schema:',
    JSON.stringify(profileSchema),
  ].join('\n');
  const text = await callAnthropic(key, system, `Source material:\n"""\n${rawText.slice(0, 60000)}\n"""\n\nReturn the Profile JSON now.`, model);
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  return JSON.parse(cleaned);
}
