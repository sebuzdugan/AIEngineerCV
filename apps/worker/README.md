# AIEngineerCV - free-try Worker (Cloudflare)

A single Cloudflare Worker so visitors can try the generator **once free with no key**, running on
**your** OpenRouter key, then earn more tries by following on X / YouTube / Medium (honor-system).
One free account, **KV storage built in** (no Upstash), **no email service** (we collect the email,
we don't send a code). The key lives only in a Worker secret - it never reaches the browser.

> Why a Worker and not "just GitHub": GitHub Pages is static and GitHub Actions are CI/cron - neither
> can serve a live request. The Worker is the runtime; the Worker is still **deployed from your
> GitHub repo** by the `deploy-worker.yml` Action.

## Endpoints

| Route | Body | Does |
| --- | --- | --- |
| `POST /api/unlock` | `{email}` | Stores the email (your lead list), grants the first free try once, returns an HMAC `token`. |
| `POST /api/generate` | `{token, profile}` | Verifies token + a remaining try, generates the CV via OpenRouter (DeepSeek), decrements. Refunds on failure. |
| `POST /api/grant-follow` | `{token, platform}` | Honor-system: `+FOLLOW_BONUS` tries once per platform (`x`/`youtube`/`medium`). |

Tries live in KV (source of truth), so the token can't be forged to mint tries. IP rate limits + a
hard cap (`MAX_TRIES_CAP`) protect your credits.

## Deploy (one free account, ~10 min)

1. **Rotate your OpenRouter key** (the one shared in chat is burned). Make a fresh one.
2. **Cloudflare** (free): sign up. Create a KV namespace:
   `npx wrangler kv namespace create FREE` -> paste the printed `id` into `wrangler.toml`. (Or make
   it in the dashboard: Storage & Databases > KV.)
3. **Cloudflare API token**: My Profile > API Tokens > Create > "Edit Cloudflare Workers" template.
   Note your **Account ID** (Workers dashboard sidebar).
4. **GitHub repo secrets** (Settings > Secrets and variables > Actions): `CLOUDFLARE_API_TOKEN`,
   `CLOUDFLARE_ACCOUNT_ID`, `OPENROUTER_API_KEY` (the fresh one), `TOKEN_SECRET` (any long random string).
5. **Push** (or run the "Deploy free-try Worker" Action). It deploys and uploads the secrets. You get
   a URL like `https://aiengineercv-free.<your-subdomain>.workers.dev`.
6. **Wire the frontend**: set repo **variable** `VITE_API_BASE` to that Worker URL. Next Pages deploy
   lights up the "Try it free" button.

## Your lead list

Collected emails are stored as KV keys `lead:<email>`. Export them:

```bash
npx wrangler kv key list --binding FREE | grep '"name": "lead:'
```

## Local dev

```bash
pnpm --filter @aiengineercv/worker typecheck
npx wrangler dev   # from apps/worker, needs the secrets in a .dev.vars file
```

## Notes

- **Emails are collected, not verified** (no code). People can enter fakes; IP rate limits + a low
  `INITIAL_FREE_TRIES` + the cap keep credit spend bounded. Add code verification later if you want
  list quality (that needs an email service).
- **Follows are not verified** (X API is paid, Medium has none). Clicking opens the real follow page
  and grants the bonus on trust.
- **Anti-hallucination** lives in the system prompt in `src/index.ts` - keep it; cheap models invent
  metrics otherwise. Tune limits/bonuses in `wrangler.toml`.
