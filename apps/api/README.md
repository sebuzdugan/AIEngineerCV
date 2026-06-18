# AIEngineerCV - free-try API

A tiny Vercel serverless backend so visitors can try the generator **once for free with no key**,
running on **your** OpenRouter key, then earn more tries by following on X / YouTube / Medium
(honor-system). The key lives only in server env vars - it never reaches the browser.

> Why this exists: the web app is a static GitHub Pages site. A static site cannot hold a secret
> key (anyone would read it in devtools and drain your credits). This backend is the safe way to
> offer "run on my key."

## Endpoints

| Route | Body | Does |
| --- | --- | --- |
| `POST /api/request-code` | `{email}` | Emails a 6-digit code (Resend), stores it 10 min (Redis). Rate-limited per IP. |
| `POST /api/verify` | `{email, code}` | Checks the code, grants the first free try once, returns an HMAC `token`. |
| `POST /api/generate` | `{token, profile}` | Verifies token + a remaining try, generates the CV via OpenRouter (DeepSeek), decrements the count. Refunds on failure. |
| `POST /api/grant-follow` | `{token, platform}` | Honor-system: grants `+FOLLOW_BONUS` tries once per platform (`x`/`youtube`/`medium`). |

Source of truth for tries is Redis, so the token can't be forged to mint tries. A hard cap
(`MAX_TRIES_CAP`) protects your credits.

## Deploy (about 15 minutes)

1. **Rotate your OpenRouter key** (the one shared in chat is burned). Create a fresh one.
2. **Upstash Redis** (free): create a database -> copy `UPSTASH_REDIS_REST_URL` + `..._TOKEN`.
   (Or add Upstash via the Vercel Marketplace and it sets `KV_REST_API_*` automatically.)
3. **Resend** (free): add and verify the `frai.cc` domain, create an API key. Set
   `FROM_EMAIL="AIEngineerCV <noreply@frai.cc>"`. (Until the domain is verified you can only email
   your own address.)
4. **Vercel**: New Project -> import this repo -> set **Root Directory = `apps/api`**. Add the env
   vars from `.env.example` (real values). Deploy. You get a URL like
   `https://aiengineercv-api.vercel.app`.
5. **Wire the frontend**: rebuild the web app with `VITE_API_BASE=https://<your-api>.vercel.app`
   (the GitHub Pages deploy workflow can set it as a repo secret/var). The "Try it free" button
   lights up.

## Local check

```bash
cp .env.example .env   # fill in real values
pnpm --filter @aiengineercv/api typecheck
# smoke-test generation only (needs OPENROUTER_API_KEY in env):
OPENROUTER_API_KEY=sk-or-... node --import tsx test/smoke.ts
```

## Notes

- **Follows are not verified.** X's API is paid, Medium has none, only YouTube is checkable (heavy
  OAuth). Clicking a follow button opens the real follow page and grants the bonus on trust.
- **Anti-hallucination** lives in the system prompt (`lib/generate.ts`) - cheap models invent
  metrics otherwise. Keep it.
- Tune `INITIAL_FREE_TRIES`, `FOLLOW_BONUS`, `MAX_TRIES_CAP`, and the rate limits in `lib/config.ts`.
