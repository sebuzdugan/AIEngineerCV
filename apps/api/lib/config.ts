// Tunables + env access. All secrets live in Vercel env vars, never in the client bundle.

export const MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324';

export const INITIAL_FREE_TRIES = Number(process.env.INITIAL_FREE_TRIES || 1);
export const FOLLOW_BONUS = Number(process.env.FOLLOW_BONUS || 2);
export const CODE_TTL_SECONDS = 600; // 10 minutes
export const TOKEN_TTL_SECONDS = 60 * 60 * 24; // 1 day
export const MAX_TRIES_CAP = 12; // hard ceiling per email, protects your credits

export const PLATFORMS = ['x', 'youtube', 'medium'] as const;
export type Platform = (typeof PLATFORMS)[number];

// Rate limits (per IP)
export const RL_CODE_PER_MIN = 4;
export const RL_GEN_PER_MIN = 6;

export const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS || 'https://sebuzdugan.github.io,http://localhost:5173'
)
  .split(',')
  .map((s) => s.trim());

export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
